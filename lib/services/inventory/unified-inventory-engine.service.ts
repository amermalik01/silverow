// lib/services/inventory/unified-inventory-engine.service.ts

// import { PoolClient } from "pg";
import type { PoolClient } from "pg";

import {
  InventoryCostingService,
  assertNonNegativeCost,
  assertPositiveQuantity,
  roundMoney,
  roundUnitCost,
  roundQuantity,
  type InventoryCostBalance,
  type ItemCostingProfile,
} from "./costing/inventory-costing.service";

import { FifoCostingService } from "./costing/fifo-costing.service";
import { LifoCostingService } from "./costing/lifo-costing.service";
import { MovingAverageCostingService } from "./costing/moving-average-costing.service";
import { StandardCostingService } from "./costing/standard-costing.service";

import { ItemCostSyncService } from "./costing/item-cost-sync.service";

import {
  InventoryLayerAllocationService,
  type PhysicalLayerAllocation,
} from "./allocations/inventory-layer-allocation.service";

export type InventoryTransactionType =
  | "PURCHASE_RECEIPT"
  | "PURCHASE_RETURN"
  | "SALES_SHIPMENT"
  | "STOCK_TRANSFER_OUT"
  | "STOCK_TRANSFER_IN"
  | "OPENING_BALANCE"
  | "ITEM_JOURNAL_IN"
  | "ITEM_JOURNAL_OUT"
  | "DEBIT_NOTE_RETURN"
  | "CREDIT_NOTE_RETURN";

export interface StockLineInput {
  item_id: string;

  warehouse_id: string;
  to_warehouse_id?: string;

  location_id?: string | null;
  bin_code?: string | null;
  batch_no?: string | null;
  serial_no?: string | null;

  expiry_date?: string | null;
  date_received?: string | null;
  prod_date?: string | null;

  quantity: number;
  unit_cost?: number;

  reference_type: string; // e.g. 'PURCHASE_ORDER', 'SALES_ORDER', 'STOCK_TRANSFER', 'ITEM_JOURNAL'
  reference_id: string;
  reference_line_id?: string | null;

  source_allocation_id?: string | null;
  inbound_entry_id?: string | null;
}

export interface InventoryLedgerEntry {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  posting_date: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  quantity: string;
  remaining_quantity: string;
  unit_cost: string;
  total_cost: string;
  direction: "IN" | "OUT";
  status: string;
}

export interface InboundStockResult {
  ledgerEntry: InventoryLedgerEntry;
  ppvAmount: number;
  totalCost: number;
  unitCost: number;
}

export interface OutboundStockResult {
  outboundEntry: InventoryLedgerEntry;
  totalCost: number;
  unitCost: number;
}

// Document Module,        Action Required,        Engine Method Used,     Direction,      GL Accounting Impact

// Purchase Order,         Soft Reserve Stock,     reserveStock,           N/A,            No GL Impact
// Purchase Order,         Receive Goods,          processInboundStock,    IN,             DR Inventory / CR GRNI
// Sales Order/Invoice,    Reserve & Dispatch,     processOutboundStock,   OUT (FIFO),     DR COGS / CR Inventory
// Stock Transfer,         Inter-Warehouse Move,   transferStock,          OUT → IN,       In-Transit / Warehouse Asset Transfers
// Opening Balance,        Load Initial Stock,     processInboundStock,    IN,             DR Inventory / CR Equity (Opening Bal)
// Debit Note,             Vendor Return,          processOutboundStock,   OUT (FIFO),     DR Accounts Payable / CR Inventory
// Credit Note,            Customer Return,        processInboundStock,    IN,             DR Inventory / CR COGS
// Item Journal,           Positive Adjustment,    processInboundStock,    IN,             DR Inventory / CR Adj. Gain
// Item Journal,           Negative Adjustment,    processOutboundStock,   OUT (FIFO),     DR Adj. Loss / CR Inventory

export class UnifiedInventoryEngineService {
  //  * Guard against accidentally initializing existing
  //  * physical inventory with a zero financial balance.

  private static async assertBalanceInitialized(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<void> {
    const result = await client.query<{
      balance_exists: boolean;
      physical_quantity: string;
      estimated_value: string;
      inbound_layer_count: string;
    }>(
      `
    SELECT
      EXISTS (
        SELECT 1
        FROM inventory_cost_balances b
        WHERE b.company_id = $1
          AND b.item_id = $2
      ) AS balance_exists,

      COALESCE(
        SUM(ile.remaining_quantity),
        0
      )::text AS physical_quantity,

      COALESCE(
        SUM(
          ile.remaining_quantity *
          ile.unit_cost
        ),
        0
      )::text AS estimated_value,

      COUNT(ile.id)::text AS inbound_layer_count

    FROM inventory_ledger_entries ile
    WHERE ile.company_id = $1
      AND ile.item_id = $2
      AND ile.direction = 'IN'
      AND ile.remaining_quantity > 0
    `,
      [companyId, itemId],
    );

    const row = result.rows[0];

    if (!row || row.balance_exists) {
      return;
    }

    const physicalQuantity = Number(row.physical_quantity);

    if (!Number.isFinite(physicalQuantity)) {
      throw new Error(`Invalid historical stock quantity for item ${itemId}.`);
    }

    if (physicalQuantity <= 0) {
      return;
    }

    throw new Error(
      `Historical inventory migration required for item ${itemId}. ` +
        `Existing quantity: ${physicalQuantity}. ` +
        `Inbound layers: ${row.inbound_layer_count}. ` +
        `Estimated layer value: ${row.estimated_value}. ` +
        "Initialize and reconcile inventory_cost_balances " +
        "before posting new stock movements.",
    );
  }

  private static async prepare(
    client: PoolClient,
    companyId: string,
    itemId: string,
  ): Promise<{
    profile: ItemCostingProfile;
    balance: InventoryCostBalance;
  }> {
    await this.assertBalanceInitialized(client, companyId, itemId);

    const profile = await InventoryCostingService.getItemCostingProfile(
      client,
      companyId,
      itemId,
    );

    const balance = await InventoryCostingService.lockBalance(
      client,
      companyId,
      itemId,
    );

    return { profile, balance };
  }

  private static assertSupportedMovement(
    transactionType: InventoryTransactionType,
  ): void {
    if (
      transactionType === "STOCK_TRANSFER_OUT" ||
      transactionType === "STOCK_TRANSFER_IN"
    ) {
      throw new Error(
        "Stock transfers require a dedicated value-preserving " +
          "transfer operation. Do not post transfers as " +
          "independent financial IN/OUT movements.",
      );
    }

    if (transactionType === "CREDIT_NOTE_RETURN") {
      throw new Error(
        "Sales returns must restore original shipment cost. " +
          "Use a historical-allocation-aware return operation.",
      );
    }
  }

  static async processInboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ): Promise<InboundStockResult> {
    this.assertSupportedMovement(transactionType);

    const quantity = roundQuantity(Number(line.quantity));

    assertPositiveQuantity(quantity);

    if (line.unit_cost === undefined) {
      throw new Error(
        "Inbound unit_cost is required. " +
          "Do not silently value receipts at zero.",
      );
    }

    const purchaseUnitCost = Number(line.unit_cost);
    assertNonNegativeCost(purchaseUnitCost);

    const { profile, balance } = await this.prepare(
      client,
      companyId,
      line.item_id,
    );

    let effectiveUnitCost = purchaseUnitCost;
    let totalCost = roundMoney(quantity * purchaseUnitCost);
    let ppvAmount = 0;

    switch (profile.method) {
      case "FIFO": {
        const result = FifoCostingService.calculateInbound(
          quantity,
          purchaseUnitCost,
        );

        effectiveUnitCost = result.unitCost;
        totalCost = result.totalCost;
        break;
      }

      case "LIFO": {
        const result = LifoCostingService.calculateInbound(
          quantity,
          purchaseUnitCost,
        );

        effectiveUnitCost = result.unitCost;
        totalCost = result.totalCost;
        break;
      }

      case "WEIGHTED_AVERAGE": {
        const result = MovingAverageCostingService.calculateInbound(
          balance,
          quantity,
          purchaseUnitCost,
        );

        // Receipt layer retains original purchase cost.
        // Financial balance computes the company-wide average.
        effectiveUnitCost = result.purchaseUnitCost;
        totalCost = result.receiptValue;
        break;
      }

      case "STANDARD": {
        const result = StandardCostingService.calculateInbound(
          quantity,
          purchaseUnitCost,
          profile.fixedStandardCost ?? NaN,
        );

        effectiveUnitCost = result.standardUnitCost;
        totalCost = result.inventoryValue;
        ppvAmount = result.ppvAmount;
        break;
      }
    }

    const inserted = await client.query<InventoryLedgerEntry>(
      `
      INSERT INTO inventory_ledger_entries (
        company_id,
        posting_date,
        transaction_type,
        reference_type,
        reference_id,
        reference_line_id,
        item_id,
        warehouse_id,
        location_id,
        bin_code,
        batch_no,
        serial_no,
        expiry_date,
        date_received,
        prod_date,
        quantity,
        remaining_quantity,
        unit_cost,
        original_unit_cost,
        total_cost,
        remaining_value,
        costing_method,
        direction,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$16,$17,$18,
        $19,$19,$20,'IN','OPEN'
      )
      RETURNING *
      `,
      [
        companyId,
        postingDate,
        transactionType,
        line.reference_type,
        line.reference_id,
        line.reference_line_id ?? null,
        line.item_id,
        line.warehouse_id,
        line.location_id ?? null,
        line.bin_code ?? null,
        line.batch_no ?? null,
        line.serial_no ?? null,
        line.expiry_date ?? null,
        line.date_received ?? null,
        line.prod_date ?? null,
        quantity,
        effectiveUnitCost,
        purchaseUnitCost,
        totalCost,
        profile.method,
      ],
    );

    const ledgerEntry = inserted.rows[0];

    if (!ledgerEntry) {
      throw new Error("Failed to create inbound ledger entry.");
    }

    await InventoryCostingService.applyMovement(client, balance, {
      companyId,
      itemId: line.item_id,
      warehouseId: line.warehouse_id,
      ledgerEntryId: ledgerEntry.id,
      postingDate,
      transactionType,
      direction: "IN",
      quantity,
      totalCost,
      costingMethod: profile.method,
      referenceType: line.reference_type,
      referenceId: line.reference_id,
      referenceLineId: line.reference_line_id,
    });

    await ItemCostSyncService.syncItemCost(
      client,
      companyId,
      line.item_id,
      balance,
    );

    return {
      ledgerEntry,
      ppvAmount,
      totalCost,
      unitCost: effectiveUnitCost,
    };
  }

  static async processOutboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ): Promise<OutboundStockResult> {
    this.assertSupportedMovement(transactionType);

    const quantity = roundQuantity(Number(line.quantity));

    assertPositiveQuantity(quantity);

    const { profile, balance } = await this.prepare(
      client,
      companyId,
      line.item_id,
    );

    if (quantity > balance.quantityOnHand) {
      throw new Error(
        `Insufficient company-wide stock for item ${line.item_id}.`,
      );
    }

    const allocations = await InventoryLayerAllocationService.allocate(client, {
      companyId,
      itemId: line.item_id,
      warehouseId: line.warehouse_id,
      quantity,
      method: profile.method,
      inboundEntryId: line.inbound_entry_id,
      sourceAllocationId: line.source_allocation_id,
      locationId: line.location_id,
      batchNo: line.batch_no,
      binCode: line.bin_code,
      serialNo: line.serial_no,
      expiryDate: line.expiry_date,
    });

    let totalCost = this.calculateOutboundCost(
      profile,
      balance,
      quantity,
      allocations,
    );

    // The final company-wide issue must consume the exact
    // remaining inventory value, including rounding residue.
    if (roundQuantity(balance.quantityOnHand - quantity) === 0) {
      const difference = roundMoney(balance.inventoryValue - totalCost);

      if (Math.abs(difference) > 0.01) {
        throw new Error(
          "Final issue cost differs materially from " +
            "remaining inventory value. Reconcile before posting.",
        );
      }

      totalCost = roundMoney(balance.inventoryValue);
    }

    const unitCost = roundUnitCost(totalCost / quantity);

    const inserted = await client.query<InventoryLedgerEntry>(
      `
      INSERT INTO inventory_ledger_entries (
        company_id,
        posting_date,
        transaction_type,
        reference_type,
        reference_id,
        reference_line_id,
        item_id,
        warehouse_id,
        location_id,
        bin_code,
        batch_no,
        serial_no,
        expiry_date,
        quantity,
        remaining_quantity,
        unit_cost,
        total_cost,
        costing_method,
        direction,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,0,$15,$16,$17,
        'OUT','CLOSED'
      )
      RETURNING *
      `,
      [
        companyId,
        postingDate,
        transactionType,
        line.reference_type,
        line.reference_id,
        line.reference_line_id ?? null,
        line.item_id,
        line.warehouse_id,
        line.location_id ?? null,
        line.bin_code ?? null,
        line.batch_no ?? null,
        line.serial_no ?? null,
        line.expiry_date ?? null,
        quantity,
        unitCost,
        totalCost,
        profile.method,
      ],
    );

    const outboundEntry = inserted.rows[0];

    if (!outboundEntry) {
      throw new Error("Failed to create outbound ledger entry.");
    }

    await InventoryLayerAllocationService.consume(client, {
      companyId,
      itemId: line.item_id,
      warehouseId: line.warehouse_id,
      outboundEntryId: outboundEntry.id,
      outboundLineId: line.reference_line_id,
      sourceAllocationId: line.source_allocation_id,
      allocations,
      totalFinancialCost: totalCost,
      method: profile.method,
    });

    await InventoryCostingService.applyMovement(client, balance, {
      companyId,
      itemId: line.item_id,
      warehouseId: line.warehouse_id,
      ledgerEntryId: outboundEntry.id,
      postingDate,
      transactionType,
      direction: "OUT",
      quantity,
      totalCost,
      costingMethod: profile.method,
      referenceType: line.reference_type,
      referenceId: line.reference_id,
      referenceLineId: line.reference_line_id,
    });

    await ItemCostSyncService.syncItemCost(
      client,
      companyId,
      line.item_id,
      balance,
    );

    return {
      outboundEntry,
      totalCost,
      unitCost,
    };
  }

  private static calculateOutboundCost(
    profile: ItemCostingProfile,
    balance: InventoryCostBalance,
    quantity: number,
    allocations: PhysicalLayerAllocation[],
  ): number {
    if (profile.method === "WEIGHTED_AVERAGE") {
      return MovingAverageCostingService.calculateOutbound(balance, quantity)
        .totalCost;
    }

    if (profile.method === "STANDARD") {
      return StandardCostingService.calculateOutbound(
        quantity,
        profile.fixedStandardCost ?? NaN,
      ).totalCost;
    }

    // Explicit source selection can override the normal
    // FIFO/LIFO physical sequence. Cost always follows
    // the selected physical layers.
    const physicalTotal = roundMoney(
      allocations.reduce(
        (sum, allocation) => sum + allocation.physicalValue,
        0,
      ),
    );

    // Keep both costing strategies integrated and available
    // for document-level costing previews.
    if (profile.method === "FIFO") {
      return physicalTotal;
    }

    if (profile.method === "LIFO") {
      return physicalTotal;
    }

    throw new Error("Unsupported outbound costing method.");
  }
}

/* export class UnifiedInventoryEngineService {
  //  * Helper: Resolves item costing method from DB
  //  * 1 = FIFO, 2 = LIFO, 3 = Moving Average, 4 = Standard Cost

  //  * Helper: Resolves global company costing method and item standard cost from DB
  //  * Costing methods mapping:
  //  * 'FIFO' (or 1) = FIFO
  //  * 'LIFO' (or 2) = LIFO
  //  * 'WEIGHTED_AVERAGE' (or 3) = Moving Average
  //  * 'STANDARD' (or 4) = Standard Cost

  private static async getItemCostingProfile(
    client: PoolClient,
    itemId: string,
    companyId: string,
  ): Promise<{ costing_method: string | number; standard_cost: number }> {
    const res = await client.query(
      `
      SELECT 
        c.costing_method AS global_costing_method,
        COALESCE(i.standard_cost, 0) AS standard_cost
      FROM items i
      JOIN companies c ON c.id = i.company_id
      WHERE i.id = $1 AND i.company_id = $2
      `,
      [itemId, companyId],
    );

    if (!res.rows.length) {
      throw new Error(`Item record ${itemId} or company setup not found.`);
    }

    const costingMethodRaw = res.rows[0].global_costing_method;

    // Map string values to numbers if your engine relies on numerical checks (1, 2, 3, 4)
    let costingMethodNum = 1;
    if (costingMethodRaw === "LIFO" || costingMethodRaw === 2)
      costingMethodNum = 2;
    else if (costingMethodRaw === "WEIGHTED_AVERAGE" || costingMethodRaw === 3)
      costingMethodNum = 3;
    else if (costingMethodRaw === "STANDARD" || costingMethodRaw === 4)
      costingMethodNum = 4;

    return {
      costing_method: costingMethodNum,
      standard_cost: Number(res.rows[0].standard_cost),
    };
  }

  //  * =========================================================================
  //  * 1. INBOUND STOCK ENGINE
  //  * Handles FIFO, LIFO, Moving Average, and Standard Cost Variants
  //  * =========================================================================

  static async processInboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ) {
    const qty = Number(line.quantity);
    if (qty <= 0)
      throw new Error("Inbound quantity must be greater than zero.");

    const { costing_method, standard_cost } = await this.getItemCostingProfile(
      client,
      line.item_id,
      companyId,
    );

    let effectiveUnitCost = Number(line.unit_cost || 0);
    let ppvAmount = 0; // Purchase Price Variance (for Standard Costing)

    // Strategy 1 & 2: FIFO / LIFO -> Uses actual purchase/receipt unit cost

    // Strategy 3: Moving Weighted Average
    if (costing_method === 3) {
      const stockRes = await client.query(
        `SELECT SUM(remaining_quantity) as total_qty, SUM(remaining_quantity * unit_cost) as total_val
         FROM inventory_ledger_entries
         WHERE company_id = $1 AND item_id = $2 AND warehouse_id = $3 AND direction = 'IN' AND status = 'OPEN'`,
        [companyId, line.item_id, line.warehouse_id],
      );

      const currentQty = Number(stockRes.rows[0]?.total_qty || 0);
      const currentVal = Number(stockRes.rows[0]?.total_val || 0);

      const inboundVal = qty * effectiveUnitCost;
      const newTotalQty = currentQty + qty;
      const newTotalVal = currentVal + inboundVal;

      if (newTotalQty > 0) {
        effectiveUnitCost = Number((newTotalVal / newTotalQty).toFixed(6));
      }
    }

    // Strategy 4: Standard Costing
    if (costing_method === 4) {
      const actualCost = effectiveUnitCost;
      effectiveUnitCost = standard_cost;
      // Calculate Purchase Price Variance for GL Accounting
      ppvAmount = Number(((actualCost - standard_cost) * qty).toFixed(2));
    }

    const totalCost = Number((qty * effectiveUnitCost).toFixed(2));

    // Write Inbound Entry to Inventory Ledger
    const ledgerRes = await client.query(
      `
      INSERT INTO inventory_ledger_entries (
        company_id, posting_date, transaction_type,
        reference_type, reference_id, reference_line_id,
        item_id, warehouse_id, location_id, bin_code,
        batch_no, serial_no, expiry_date,
        quantity, remaining_quantity, unit_cost, total_cost,
        direction, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, $15, $16, 'IN', 'OPEN')
      RETURNING *;
      `,
      [
        companyId,
        postingDate,
        transactionType,
        line.reference_type,
        line.reference_id,
        line.reference_line_id || null,
        line.item_id,
        line.warehouse_id,
        line.location_id || null,
        line.bin_code || null,
        line.batch_no || null,
        line.serial_no || null,
        line.expiry_date || null,
        qty,
        effectiveUnitCost,
        totalCost,
      ],
    );

    return { ledgerEntry: ledgerRes.rows[0], ppvAmount };
  }

  //  * =========================================================================
  //  * 2. OUTBOUND STOCK ENGINE WITH DYNAMIC COSTING SCHEMES
  //  * =========================================================================

  static async processOutboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ) {
    const qtyNeeded = Number(line.quantity);

    if (qtyNeeded <= 0) {
      throw new Error("Outbound quantity must be greater than zero.");
    }

    const { costing_method, standard_cost } = await this.getItemCostingProfile(
      client,
      line.item_id,
      companyId,
    );

    type AllocatedLayer = {
      inbound_entry_id: string;
      qtyToTake: number;
      unitCost: number;
      totalCost: number;
    };

    const allocatedLayers: AllocatedLayer[] = [];

    let accumulatedCost = 0;
    let remainingToDeduct = qtyNeeded;

    
    //  * =========================================================
    //  * EXPLICIT SOURCE ALLOCATION
    //  *
    //  * Used by:
    //  *   - Item Journal Negative Entry
    //  *   - any future document that explicitly selects stock
    //  *
    //  * When inbound_entry_id is supplied, DO NOT run FIFO/LIFO.
    //  * =========================================================
    
    if (line.inbound_entry_id) {
      const inboundResult = await client.query(
        `
      SELECT
          id, company_id, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, expiry_date, quantity, remaining_quantity,
          unit_cost, status
      FROM inventory_ledger_entries
      WHERE id = $1
        AND company_id = $2
        AND item_id = $3
        AND warehouse_id = $4
        AND direction = 'IN'
      FOR UPDATE
      `,
        [line.inbound_entry_id, companyId, line.item_id, line.warehouse_id],
      );

      if (!inboundResult.rows.length) {
        throw new Error(
          `Selected inbound stock layer ${line.inbound_entry_id} was not found.`,
        );
      }

      const inboundLayer = inboundResult.rows[0];
      const remainingQuantity = Number(inboundLayer.remaining_quantity || 0);

      if (remainingQuantity <= 0) {
        throw new Error(
          `Selected inbound stock layer ${line.inbound_entry_id} has no remaining quantity.`,
        );
      }

      // if (line.source_allocation_id) {
      //   const sourceAllocationResult = await client.query(
      //     `
      //     SELECT
      //       id,
      //       inbound_entry_id,
      //       item_id,
      //       warehouse_id,
      //       allocated_quantity,
      //       status
      //     FROM inventory_allocations
      //     WHERE id = $1
      //       AND company_id = $2
      //     FOR UPDATE
      //     `,
      //     [line.source_allocation_id, companyId],
      //   );

      //   if (!sourceAllocationResult.rows.length) {
      //     throw new Error(
      //       `Selected source allocation ${line.source_allocation_id} was not found.`,
      //     );
      //   }

      //   const sourceAllocation = sourceAllocationResult.rows[0];

      //   if (
      //     String(sourceAllocation.inbound_entry_id) !==
      //     String(line.inbound_entry_id)
      //   ) {
      //     throw new Error(
      //       "Selected source allocation does not belong to the selected inbound stock layer.",
      //     );
      //   }

      //   if (String(sourceAllocation.item_id) !== String(line.item_id)) {
      //     throw new Error(
      //       "Selected source allocation belongs to a different item.",
      //     );
      //   }

      //   if (
      //     String(sourceAllocation.warehouse_id) !== String(line.warehouse_id)
      //   ) {
      //     throw new Error(
      //       "Selected source allocation belongs to a different warehouse.",
      //     );
      //   }

      //   if (String(sourceAllocation.status) === "CLOSED") {
      //     throw new Error(
      //       `Selected source allocation ${line.source_allocation_id} is closed.`,
      //     );
      //   }
      // }

      if (qtyNeeded > remainingQuantity) {
        throw new Error(
          `Selected source stock has only ${remainingQuantity} units available; ${qtyNeeded} requested.`,
        );
      }

      const layerUnitCost =
        costing_method === 4
          ? standard_cost
          : Number(inboundLayer.unit_cost || 0);

      const layerTotalCost = Number((qtyNeeded * layerUnitCost).toFixed(2));

      accumulatedCost = layerTotalCost;
      remainingToDeduct = 0;

      allocatedLayers.push({
        inbound_entry_id: String(inboundLayer.id),
        qtyToTake: qtyNeeded,
        unitCost: layerUnitCost,
        totalCost: layerTotalCost,
      });
    } else {
      
      //  * =========================================================
      //  * EXISTING FIFO / LIFO BEHAVIOR
      //  *
      //  * Existing SO and other callers continue using this path.
      //  * =========================================================
      

      let orderByClause = "posting_date ASC, created_at ASC";

      if (costing_method === 2) {
        orderByClause = "posting_date DESC, created_at DESC";
      }

      const inboundLayersRes = await client.query(
        `
        SELECT *
        FROM inventory_ledger_entries
        WHERE company_id = $1
          AND item_id = $2
          AND warehouse_id = $3
          AND direction = 'IN'
          AND status = 'OPEN'
          AND remaining_quantity > 0
        ORDER BY ${orderByClause}
        FOR UPDATE
        `,
        [companyId, line.item_id, line.warehouse_id],
      );

      if (costing_method === 4) {
        accumulatedCost = Number((qtyNeeded * standard_cost).toFixed(2));
      }

      for (const layer of inboundLayersRes.rows) {
        if (remainingToDeduct <= 0) break;

        const layerRemaining = Number(layer.remaining_quantity);
        const qtyToTake = Math.min(layerRemaining, remainingToDeduct);

        const layerUnitCost =
          costing_method === 4 ? standard_cost : Number(layer.unit_cost || 0);

        const layerTotalCost = Number((qtyToTake * layerUnitCost).toFixed(2));

        if (costing_method !== 4) {
          accumulatedCost += layerTotalCost;
        }

        remainingToDeduct -= qtyToTake;

        allocatedLayers.push({
          inbound_entry_id: String(layer.id),
          qtyToTake,
          unitCost: layerUnitCost,
          totalCost: layerTotalCost,
        });
      }
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Insufficient stock for Item ID ${line.item_id} in Warehouse ${line.warehouse_id}. Shortage of ${remainingToDeduct} units.`,
      );
    }

    const blendedUnitCost = Number((accumulatedCost / qtyNeeded).toFixed(6));

    
    //  * =========================================================
    //  * CREATE OUTBOUND LEDGER ENTRY
    //  * =========================================================
    

    const outboundLedgerRes = await client.query(
      `
      INSERT INTO inventory_ledger_entries (
        company_id, posting_date, transaction_type,
        reference_type, reference_id, reference_line_id,
        item_id, warehouse_id, location_id, bin_code,
        batch_no, serial_no, expiry_date,
        quantity, remaining_quantity, unit_cost, total_cost,
        direction, status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, 0, $15, $16, 'OUT', 'CLOSED'
      )
      RETURNING *;
      `,
      [
        companyId,
        postingDate,
        transactionType,

        line.reference_type,
        line.reference_id,
        line.reference_line_id || null,

        line.item_id,
        line.warehouse_id,
        line.location_id || null,

        line.bin_code || null,
        line.batch_no || null,
        line.serial_no || null,
        line.expiry_date || null,

        qtyNeeded,
        blendedUnitCost,
        accumulatedCost,
      ],
    );

    const outboundEntry = outboundLedgerRes.rows[0];

    
    //  * =========================================================
    //  * WRITE ALLOCATIONS + DECREASE INBOUND LAYERS
    //  * =========================================================
    

    for (const allocation of allocatedLayers) {
      await client.query(
        `
      INSERT INTO inventory_allocations (
        company_id, outbound_entry_id, outbound_line_id,
        inbound_entry_id, source_allocation_id, item_id,
        warehouse_id, warehouse_location_id, batch_no, bin_code,
        expiry_date, date_received, prod_date,
        allocated_quantity, unit_cost, total_cost, status
      )
      VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, 'ACTIVE'
      )
      `,
        [
          companyId,

          outboundEntry.id,
          line.reference_line_id || null,
          allocation.inbound_entry_id,
          line.source_allocation_id || null,

          line.item_id,
          line.warehouse_id,
          line.location_id || null,

          line.batch_no || null,
          line.bin_code || null,

          line.expiry_date === "" ? null : line.expiry_date || null,
          line.date_received === "" ? null : line.date_received || null,
          line.prod_date === "" ? null : line.prod_date || null,

          allocation.qtyToTake,
          allocation.unitCost,
          allocation.totalCost,
        ],
      );

      await client.query(
        `
      UPDATE inventory_ledger_entries
      SET
        remaining_quantity =
          remaining_quantity - $1,

        status =
          CASE
            WHEN remaining_quantity - $1 <= 0
              THEN 'CLOSED'
            ELSE 'OPEN'
          END

      WHERE id = $2
        AND company_id = $3
      `,
        [allocation.qtyToTake, allocation.inbound_entry_id, companyId],
      );
    }

    return {
      outboundEntry,
      totalCost: accumulatedCost,
      unitCost: blendedUnitCost,
    };
  }
} */

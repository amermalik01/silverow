// lib/services/inventory/unified-inventory-engine.service.ts

import { PoolClient } from "pg";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";

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
  to_warehouse_id?: string; // For Stock Transfers
  location_id?: string | null;
  bin_code?: string | null;
  batch_no?: string | null;
  serial_no?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_cost?: number; // Calculated or overridden
  reference_type: string; // e.g. 'PURCHASE_ORDER', 'SALES_ORDER', 'STOCK_TRANSFER', 'ITEM_JOURNAL'
  reference_id: string;
  reference_line_id?: string | null;
}

/* 
Document Module,        Action Required,        Engine Method Used,     Direction,      GL Accounting Impact

Purchase Order,         Soft Reserve Stock,     reserveStock,           N/A,            No GL Impact
Purchase Order,         Receive Goods,          processInboundStock,    IN,             DR Inventory / CR GRNI
Sales Order/Invoice,    Reserve & Dispatch,     processOutboundStock,   OUT (FIFO),     DR COGS / CR Inventory
Stock Transfer,         Inter-Warehouse Move,   transferStock,          OUT → IN,       In-Transit / Warehouse Asset Transfers
Opening Balance,        Load Initial Stock,     processInboundStock,    IN,             DR Inventory / CR Equity (Opening Bal)
Debit Note,             Vendor Return,          processOutboundStock,   OUT (FIFO),     DR Accounts Payable / CR Inventory
Credit Note,            Customer Return,        processInboundStock,    IN,             DR Inventory / CR COGS
Item Journal,           Positive Adjustment,    processInboundStock,    IN,             DR Inventory / CR Adj. Gain
Item Journal,           Negative Adjustment,    processOutboundStock,   OUT (FIFO),     DR Adj. Loss / CR Inventory
*/

export class UnifiedInventoryEngineService {
  /**
   * Helper: Resolves item costing method from DB
   * 1 = FIFO, 2 = LIFO, 3 = Moving Average, 4 = Standard Cost
   */

  private static async getItemCostingProfile(
    client: PoolClient,
    itemId: string,
    companyId: string,
    companyDefaultCostingMethod: number = 1,
  ): Promise<{ costing_method: number; standard_cost: number }> {
    const res = await client.query(
      `
      SELECT 
        COALESCE(i.costing_method, c.default_costing_method, $3) AS costing_method,
        COALESCE(i.standard_cost, 0) AS standard_cost
      FROM items i
      LEFT JOIN companies c ON c.id = i.company_id
      WHERE i.id = $1 AND i.company_id = $2
      `,
      [itemId, companyId, companyDefaultCostingMethod],
    );

    if (!res.rows.length) {
      throw new Error(`Item record ${itemId} not found.`);
    }

    return {
      costing_method: Number(res.rows[0].costing_method),
      standard_cost: Number(res.rows[0].standard_cost),
    };
  }

  /**
   * =========================================================================
   * 1. INBOUND STOCK ENGINE
   * Handles FIFO, LIFO, Moving Average, and Standard Cost Variants
   * =========================================================================
   */
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

  /**
   * =========================================================================
   * 2. OUTBOUND STOCK ENGINE WITH DYNAMIC COSTING SCHEMES
   * =========================================================================
   */
  static async processOutboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ) {
    const qtyNeeded = Number(line.quantity);
    if (qtyNeeded <= 0)
      throw new Error("Outbound quantity must be greater than zero.");

    const { costing_method, standard_cost } = await this.getItemCostingProfile(
      client,
      line.item_id,
      companyId,
    );

    // Determine Queue Order based on selected Method
    let orderByClause = "posting_date ASC, created_at ASC"; // Default FIFO (1)

    if (costing_method === 2) {
      orderByClause = "posting_date DESC, created_at DESC"; // LIFO (2)
    }

    // Fetch open inbound layers
    const inboundLayersRes = await client.query(
      `
      SELECT * FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND direction = 'IN'
        AND status = 'OPEN'
        AND remaining_quantity > 0
      ORDER BY ${orderByClause}
      FOR UPDATE;
      `,
      [companyId, line.item_id, line.warehouse_id],
    );

    let remainingToDeduct = qtyNeeded;
    let accumulatedCost = 0;

    const allocatedLayers: {
      inbound_entry_id: string;
      qtyToTake: number;
      unitCost: number;
      totalCost: number;
    }[] = [];

    // For Standard Costing (4), override unit cost directly
    if (costing_method === 4) {
      accumulatedCost = Number((qtyNeeded * standard_cost).toFixed(2));
    }

    for (const layer of inboundLayersRes.rows) {
      if (remainingToDeduct <= 0) break;

      const layerRemaining = Number(layer.remaining_quantity);
      const qtyToTake = Math.min(layerRemaining, remainingToDeduct);

      // Calculate cost per layer based on method
      const layerUnitCost =
        costing_method === 4 ? standard_cost : Number(layer.unit_cost);
      const layerTotalCost = Number((qtyToTake * layerUnitCost).toFixed(2));

      if (costing_method !== 4) {
        accumulatedCost += layerTotalCost;
      }
      remainingToDeduct -= qtyToTake;

      allocatedLayers.push({
        inbound_entry_id: layer.id,
        qtyToTake,
        unitCost: layerUnitCost,
        totalCost: layerTotalCost,
      });
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Insufficient stock for Item ID ${line.item_id} in Warehouse ${line.warehouse_id}. Shortage of ${remainingToDeduct} units.`,
      );
    }

    const blendedUnitCost = Number((accumulatedCost / qtyNeeded).toFixed(6));

    // Record Outbound Transaction Entry
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15, $16, 'OUT', 'CLOSED')
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

    // Write Allocations and update inbound layers
    for (const alloc of allocatedLayers) {
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id, outbound_entry_id, outbound_line_id, inbound_entry_id,
          item_id, warehouse_id, allocated_quantity, unit_cost, total_cost, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE');
        `,
        [
          companyId,
          outboundEntry.id,
          line.reference_line_id || null,
          alloc.inbound_entry_id,
          line.item_id,
          line.warehouse_id,
          alloc.qtyToTake,
          alloc.unitCost,
          alloc.totalCost,
        ],
      );

      await client.query(
        `
        UPDATE inventory_ledger_entries
        SET remaining_quantity = remaining_quantity - $1,
            status = CASE WHEN remaining_quantity - $1 <= 0 THEN 'CLOSED' ELSE 'OPEN' END
        WHERE id = $2;
        `,
        [alloc.qtyToTake, alloc.inbound_entry_id],
      );
    }

    return {
      outboundEntry,
      totalCost: accumulatedCost,
      unitCost: blendedUnitCost,
    };
  }
}

/* export class UnifiedInventoryEngineService {
  
   * =========================================================================
   * 1. SOFT ALLOCATION / RESERVATION ENGINE
   * (Used by Sales Orders, Purchase Orders, Debit Notes, Opening Balance setup)
   * =========================================================================
  
  static async reserveStock(
    client: PoolClient,
    companyId: string,
    line: StockLineInput,
  ) {
    if (line.quantity <= 0) {
      throw new Error("Reservation quantity must be greater than zero.");
    }

    const res = await client.query(
      `
      INSERT INTO inventory_reservations (
        company_id, item_id, warehouse_id, location_id,
        reference_type, reference_id, line_reference_id,
        quantity, reserved_quantity, allocated_quantity, consumed_quantity, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 0, 0, 'OPEN')
      RETURNING *;
      `,
      [
        companyId,
        line.item_id,
        line.warehouse_id,
        line.location_id || null,
        line.reference_type,
        line.reference_id,
        line.reference_line_id || null,
        line.quantity,
      ],
    );

    return res.rows[0];
  }

  
   * =========================================================================
   * 2. INBOUND STOCK ENGINE (Purchase Receipt, Opening Balance, Item Journal IN, Credit Note Return)
   * =========================================================================
  
  static async processInboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ) {
    const qty = Number(line.quantity);
    const unitCost = Number(line.unit_cost || 0);
    const totalCost = Number((qty * unitCost).toFixed(2));

    if (qty <= 0)
      throw new Error("Inbound quantity must be greater than zero.");

    // 1. Write Inbound Entry to Inventory Ledger
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
        unitCost,
        totalCost,
      ],
    );

    const ledgerEntry = ledgerRes.rows[0];

    // 2. Consume Open Soft Reservations if applicable
    if (line.reference_line_id) {
      await this.consumeReservation(client, line.reference_line_id, qty);
    }

    return ledgerEntry;
  }

  
   * =========================================================================
   * 3. OUTBOUND STOCK ENGINE WITH AUTOMATIC FIFO COSTING ALLOCATION
   * (Sales Shipment, Debit Note Return, Item Journal OUT, Transfer Out)
   * =========================================================================
  
  static async processOutboundStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    transactionType: InventoryTransactionType,
    line: StockLineInput,
  ) {
    const qtyNeeded = Number(line.quantity);
    if (qtyNeeded <= 0)
      throw new Error("Outbound quantity must be greater than zero.");

    // 1. Fetch available open Inbound Layers (FIFO Order)
    const inboundLayersRes = await client.query(
      `
      SELECT * FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND direction = 'IN'
        AND status = 'OPEN'
        AND remaining_quantity > 0
      ORDER BY posting_date ASC, created_at ASC
      FOR UPDATE;
      `,
      [companyId, line.item_id, line.warehouse_id],
    );

    let remainingToDeduct = qtyNeeded;
    let accumulatedCost = 0;

    const allocatedLayers: {
      inbound_entry_id: string;
      qtyToTake: number;
      unitCost: number;
      totalCost: number;
    }[] = [];

    for (const layer of inboundLayersRes.rows) {
      if (remainingToDeduct <= 0) break;

      const layerRemaining = Number(layer.remaining_quantity);
      const qtyToTake = Math.min(layerRemaining, remainingToDeduct);
      const layerUnitCost = Number(layer.unit_cost);
      const layerTotalCost = Number((qtyToTake * layerUnitCost).toFixed(2));

      accumulatedCost += layerTotalCost;
      remainingToDeduct -= qtyToTake;

      allocatedLayers.push({
        inbound_entry_id: layer.id,
        qtyToTake,
        unitCost: layerUnitCost,
        totalCost: layerTotalCost,
      });
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Insufficient stock for Item ID ${line.item_id} in Warehouse ${line.warehouse_id}. Shortage of ${remainingToDeduct} units.`,
      );
    }

    const blendedUnitCost = Number((accumulatedCost / qtyNeeded).toFixed(6));

    // 2. Create Outbound Entry in Inventory Ledger
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15, $16, 'OUT', 'CLOSED')
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

    // 3. Write Allocations & Update Inbound Layer Balances
    for (const alloc of allocatedLayers) {
      // Record Hard Allocation
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id, outbound_entry_id, outbound_line_id, inbound_entry_id,
          item_id, warehouse_id, allocated_quantity, unit_cost, total_cost, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE');
        `,
        [
          companyId,
          outboundEntry.id,
          line.reference_line_id || null,
          alloc.inbound_entry_id,
          line.item_id,
          line.warehouse_id,
          alloc.qtyToTake,
          alloc.unitCost,
          alloc.totalCost,
        ],
      );

      // Deduct from Inbound Ledger Remaining Balance
      await client.query(
        `
        UPDATE inventory_ledger_entries
        SET remaining_quantity = remaining_quantity - $1,
            status = CASE WHEN remaining_quantity - $1 <= 0 THEN 'CLOSED' ELSE 'OPEN' END
        WHERE id = $2;
        `,
        [alloc.qtyToTake, alloc.inbound_entry_id],
      );
    }

    // 4. Consume Soft Reservation
    if (line.reference_line_id) {
      await this.consumeReservation(client, line.reference_line_id, qtyNeeded);
    }

    return {
      outboundEntry,
      totalCost: accumulatedCost,
      unitCost: blendedUnitCost,
    };
  }

  
   * =========================================================================
   * 4. WAREHOUSE-TO-WAREHOUSE STOCK TRANSFER
   * =========================================================================
  
  static async transferStock(
    client: PoolClient,
    companyId: string,
    postingDate: string,
    line: StockLineInput,
  ) {
    if (!line.to_warehouse_id) {
      throw new Error(
        "Destination warehouse (to_warehouse_id) is required for transfers.",
      );
    }

    // Step A: Deduct stock from Source Warehouse via FIFO
    const outboundResult = await this.processOutboundStock(
      client,
      companyId,
      postingDate,
      "STOCK_TRANSFER_OUT",
      line,
    );

    // Step B: Receive stock into Destination Warehouse with original FIFO cost
    const inboundLine: StockLineInput = {
      ...line,
      warehouse_id: line.to_warehouse_id,
      unit_cost: outboundResult.unitCost,
    };

    const inboundResult = await this.processInboundStock(
      client,
      companyId,
      postingDate,
      "STOCK_TRANSFER_IN",
      inboundLine,
    );

    return { outboundResult, inboundResult };
  }

  
   * Helper: Consume Inventory Reservations
  
  private static async consumeReservation(
    client: PoolClient,
    lineReferenceId: string,
    qtyToConsume: number,
  ) {
    const res = await client.query(
      `
      SELECT id, reserved_quantity, consumed_quantity
      FROM inventory_reservations
      WHERE line_reference_id = $1 AND status IN ('OPEN', 'PARTIAL')
      ORDER BY created_at ASC
      FOR UPDATE;
      `,
      [lineReferenceId],
    );

    let rem = qtyToConsume;
    for (const reservation of res.rows) {
      if (rem <= 0) break;

      const currentConsumed = Number(reservation.consumed_quantity || 0);
      const available = Number(reservation.reserved_quantity) - currentConsumed;
      if (available <= 0) continue;

      const consume = Math.min(available, rem);
      const nextConsumed = currentConsumed + consume;
      const isComplete = nextConsumed >= Number(reservation.reserved_quantity);

      await client.query(
        `
        UPDATE inventory_reservations
        SET consumed_quantity = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3;
        `,
        [nextConsumed, isComplete ? "CONSUMED" : "PARTIAL", reservation.id],
      );

      rem -= consume;
    }
  }
} */

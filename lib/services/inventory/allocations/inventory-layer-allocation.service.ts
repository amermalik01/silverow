// lib/services/inventory/allocations/inventory-layer-allocation.service.ts

import type { PoolClient } from "pg";

import {
  assertPositiveQuantity,
  roundMoney,
  roundQuantity,
  roundUnitCost,
  type CostingMethod,
} from "../costing/inventory-costing.service";

export interface PhysicalStockLayer {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;
  locationId: string | null;
  binCode: string | null;
  batchNo: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  dateReceived: string | null;
  prodDate: string | null;
  postingDate: string;
  createdAt: string;
  remainingQuantity: number;
  remainingValue: number;
  unitCost: number;
}

export interface PhysicalLayerAllocation {
  layer: PhysicalStockLayer;
  quantity: number;
  physicalValue: number;
}

export interface FinancialLayerAllocation extends PhysicalLayerAllocation {
  financialCost: number;
  financialUnitCost: number;
}

export interface AllocateLayersInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  method: CostingMethod;
  inboundEntryId?: string | null;
  sourceAllocationId?: string | null;
  locationId?: string | null;
  batchNo?: string | null;
  binCode?: string | null;
  serialNo?: string | null;
  expiryDate?: string | null;
}

export interface SaveLayerAllocationsInput {
  companyId: string;
  itemId: string;
  warehouseId: string;

  outboundEntryIds?: string[];
  outboundEntryId?: string;

  outboundLineId?: string | null;
  sourceAllocationId?: string | null;

  allocations: PhysicalLayerAllocation[];
  totalFinancialCost: number;
  method: CostingMethod;
}

interface LayerRow {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string | null;

  bin_code: string | null;
  batch_no: string | null;
  serial_no: string | null;

  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;

  posting_date: string;
  created_at: string;
  remaining_quantity: string;
  remaining_value: string | null;
  unit_cost: string;
}

interface SourceAllocationRow {
  inbound_entry_id: string | null;
  item_id: string;
  warehouse_id: string;
  status: string;
}

export function getLayerTrackingCode(
  layer: Pick<PhysicalStockLayer, "binCode" | "serialNo">,
): string | null {
  const binCode = layer.binCode?.trim() || null;
  const serialNo = layer.serialNo?.trim() || null;

  if (binCode && serialNo && binCode !== serialNo) {
    throw new Error(
      "Conflicting bin_code and serial_no values found on inventory layer.",
    );
  }

  return serialNo ?? binCode;
}

export class InventoryLayerAllocationService {
  static async allocate(
    client: PoolClient,
    input: AllocateLayersInput,
  ): Promise<PhysicalLayerAllocation[]> {
    assertPositiveQuantity(input.quantity);

    if (
      input.binCode?.trim() &&
      input.serialNo?.trim() &&
      input.binCode.trim() !== input.serialNo.trim()
    ) {
      throw new Error(
        "bin_code and serial_no must contain the same tracking value.",
      );
    }

    if (input.sourceAllocationId) {
      if (!input.inboundEntryId) {
        throw new Error("source_allocation_id requires inbound_entry_id.");
      }


      const source = await client.query<SourceAllocationRow>(
        `
        SELECT
          inbound_entry_id,
          item_id,
          warehouse_id,
          status
        FROM inventory_allocations
        WHERE company_id = $1
          AND id = $2
        FOR UPDATE
        `,
        [input.companyId, input.sourceAllocationId],
      );

      const row = source.rows[0];

      if (
        !row ||
        row.inbound_entry_id !== input.inboundEntryId ||
        row.item_id !== input.itemId ||
        row.warehouse_id !== input.warehouseId ||
        row.status === "CLOSED"
      ) {
        throw new Error("Invalid or closed source inventory allocation.");
      }
    }

    const order = input.method === "LIFO" ? "DESC" : "ASC";

    // Dynamic SQL is restricted to these two constants.
    const result = await client.query<LayerRow>(
      `
      SELECT
        id,
        company_id,
        item_id,
        warehouse_id,
        location_id,
        bin_code,
        batch_no,
        serial_no,
        expiry_date::text,
        date_received::text,
        prod_date::text,
        posting_date::text,
        created_at::text,
        remaining_quantity::text,
        remaining_value::text,
        unit_cost::text
      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND direction = 'IN'
        AND remaining_quantity > 0
        AND ($4::uuid IS NULL OR id = $4::uuid)
        AND ($5::uuid IS NULL OR location_id = $5::uuid)
        AND ($6::text IS NULL OR batch_no = $6)
        AND (
          $7::text IS NULL
          OR COALESCE(
            NULLIF(BTRIM(serial_no), ''),
            NULLIF(BTRIM(bin_code), '')
          ) = $7
        )
        AND (
          $8::date IS NULL
          OR expiry_date = $8::date
        )
      ORDER BY
        posting_date ${order},
        created_at ${order},
        id ${order}
      FOR UPDATE
      `,
      [
        input.companyId,
        input.itemId,
        input.warehouseId,
        input.inboundEntryId ?? null,
        input.locationId ?? null,
        input.batchNo ?? null,
        input.serialNo?.trim() ||
          input.binCode?.trim() ||
          null,
        input.expiryDate ?? null,
      ],
    );

    const allocations: PhysicalLayerAllocation[] = [];
    let remaining = roundQuantity(input.quantity);

    for (const row of result.rows) {
      if (remaining <= 0) break;

      const available = Number(row.remaining_quantity);
      const quantity = roundQuantity(Math.min(available, remaining));

      if (
        !Number.isFinite(available) ||
        available <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        continue;
      }

      const unitCost = Number(row.unit_cost);
      const remainingValue = Number(
        row.remaining_value ?? roundMoney(available * unitCost),
      );

      if (
        !Number.isFinite(unitCost) ||
        unitCost < 0 ||
        !Number.isFinite(remainingValue) ||
        remainingValue < 0
      ) {
        throw new Error(`Invalid physical layer valuation: ${row.id}`);
      }

      const physicalValue =
        quantity === available
          ? roundMoney(remainingValue)
          : roundMoney((remainingValue * quantity) / available);

      const layer: PhysicalStockLayer = {
        id: row.id,
        companyId: row.company_id,
        itemId: row.item_id,
        warehouseId: row.warehouse_id,
        locationId: row.location_id,
        binCode: row.bin_code,
        batchNo: row.batch_no,
        serialNo: row.serial_no,
        expiryDate: row.expiry_date,
        dateReceived: row.date_received,
        prodDate: row.prod_date,
        postingDate: row.posting_date,
        createdAt: row.created_at,
        remainingQuantity: available,
        remainingValue,
        unitCost,
      };

      // Detect conflicting legacy aliases before using this layer.
      getLayerTrackingCode(layer);

      allocations.push({
        layer,
        quantity,
        physicalValue,
      });

      remaining = roundQuantity(remaining - quantity);
    }

    if (remaining > 0) {
      throw new Error(
        `Insufficient physical stock for item ${input.itemId} ` +
          `in warehouse ${input.warehouseId}. ` +
          `Shortage: ${remaining}.`,
      );
    }

    return allocations;
  }

  /**
   * Distributes the financial issue value across physical layers.
   *
   * FIFO/LIFO:
   *   Financial value follows the selected physical layers.
   *
   * WEIGHTED_AVERAGE/STANDARD:
   *   Financial value is distributed proportionally by quantity.
   *
   * The final layer absorbs rounding differences.
   */
  static calculateFinancialAllocations(
    allocations: PhysicalLayerAllocation[],
    totalFinancialCost: number,
    method: CostingMethod,
  ): FinancialLayerAllocation[] {
    if (!Number.isFinite(totalFinancialCost) || totalFinancialCost < 0) {
      throw new Error("Invalid total financial allocation cost.");
    }

    if (allocations.length === 0) {
      throw new Error("No physical stock allocated.");
    }

    const totalQuantity = roundQuantity(
      allocations.reduce(
        (sum, allocation) => sum + allocation.quantity,
        0,
      ),
    );

    assertPositiveQuantity(totalQuantity);

    let assignedFinancialCost = 0;

    return allocations.map((allocation, index) => {
      const isLast = index === allocations.length - 1;

      const financialCost = isLast
        ? roundMoney(totalFinancialCost - assignedFinancialCost)
        : method === "FIFO" || method === "LIFO"
          ? roundMoney(allocation.physicalValue)
          : roundMoney(
              (totalFinancialCost * allocation.quantity) / totalQuantity,
            );

      if (financialCost < -0.01) {
        throw new Error("Financial layer allocation cannot be negative.");
      }

      const normalizedFinancialCost = Math.max(0, financialCost);

      assignedFinancialCost = roundMoney(
        assignedFinancialCost + normalizedFinancialCost,
      );

      return {
        ...allocation,
        financialCost: normalizedFinancialCost,
        financialUnitCost: roundUnitCost(
          normalizedFinancialCost / allocation.quantity,
        ),
      };
    });
  }

  /**
   * Persist financial allocations and deduct physical stock.
   * The caller must already hold the company-item balance lock.
   */
  static async consume(
    client: PoolClient,
    input: SaveLayerAllocationsInput,
  ): Promise<void> {
    const totalQuantity = roundQuantity(
      input.allocations.reduce(
        (sum, allocation) => sum + allocation.quantity,
        0,
      ),
    );

    assertPositiveQuantity(totalQuantity);

    const financialAllocations = this.calculateFinancialAllocations(
      input.allocations,
      input.totalFinancialCost,
      input.method,
    );

    let outboundEntryIds: string[];

    if (input.outboundEntryIds) {
      if (input.outboundEntryIds.length !== input.allocations.length) {
        throw new Error(
          "Each physical layer allocation requires one outbound ledger entry.",
        );
      }

      if (new Set(input.outboundEntryIds).size !== input.outboundEntryIds.length) {
        throw new Error(
          "Outbound ledger entry IDs must be unique per physical layer.",
        );
      }

      outboundEntryIds = input.outboundEntryIds;
    } else if (input.outboundEntryId) {
      // Compatibility path for older single-entry callers.
      outboundEntryIds = input.allocations.map(
        () => input.outboundEntryId as string,
      );
    } else {
      throw new Error("Outbound ledger entry ID is required.");
    }

    for (let index = 0; index < financialAllocations.length; index++) {
      const allocation = financialAllocations[index];
      const layer = allocation.layer;
      const outboundEntryId = outboundEntryIds[index];

      if (!outboundEntryId) {
        throw new Error(
          `Missing outbound ledger entry for physical layer ${layer.id}.`,
        );
      }

      const trackingCode = getLayerTrackingCode(layer);

      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          outbound_line_id,
          inbound_entry_id,
          source_allocation_id,
          item_id,
          warehouse_id,
          warehouse_location_id,
          batch_no,
          bin_code,
          serial_no,
          expiry_date,
          date_received,
          prod_date,
          allocated_quantity,
          unit_cost,
          total_cost,
          physical_layer_unit_cost,
          valuation_unit_cost,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, 'ACTIVE'
        )
        `,
        [
          input.companyId,
          outboundEntryId,
          input.outboundLineId ?? null,
          layer.id,
          input.sourceAllocationId ?? null,
          input.itemId,
          input.warehouseId,
          layer.locationId,
          layer.batchNo,
          trackingCode,
          trackingCode,
          layer.expiryDate,
          layer.dateReceived,
          layer.prodDate,
          allocation.quantity,
          allocation.financialUnitCost,
          allocation.financialCost,
          layer.unitCost,
          allocation.financialUnitCost,
        ],
      );

      const newRemainingQuantity = roundQuantity(
        layer.remainingQuantity - allocation.quantity,
      );

      const newRemainingValue =
        newRemainingQuantity === 0
          ? 0
          : roundMoney(layer.remainingValue - allocation.physicalValue);

      if (newRemainingQuantity < -0.000001) {
        throw new Error(`Negative physical layer quantity: ${layer.id}`);
      }

      if (newRemainingValue < -0.01) {
        throw new Error(`Negative physical layer value: ${layer.id}`);
      }

      const updated = await client.query(
        `
        UPDATE inventory_ledger_entries
        SET
          remaining_quantity = $3,
          remaining_value = $4,
          status = CASE
            WHEN $3::numeric = 0 THEN 'CLOSED'
            ELSE 'OPEN'
          END
        WHERE id = $1
          AND company_id = $2
          AND direction = 'IN'
          AND remaining_quantity >= $5
        `,
        [
          layer.id,
          input.companyId,
          Math.max(0, newRemainingQuantity),
          Math.max(0, newRemainingValue),
          allocation.quantity,
        ],
      );

      if (updated.rowCount !== 1) {
        throw new Error(
          `Stock layer changed during allocation: ${layer.id}`,
        );
      }
    }
  }
}

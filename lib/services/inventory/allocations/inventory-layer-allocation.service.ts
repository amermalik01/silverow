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
  outboundEntryId: string;
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

export class InventoryLayerAllocationService {
  static async allocate(
    client: PoolClient,
    input: AllocateLayersInput,
  ): Promise<PhysicalLayerAllocation[]> {
    assertPositiveQuantity(input.quantity);

    if (input.sourceAllocationId) {
      if (!input.inboundEntryId) {
        throw new Error("source_allocation_id requires inbound_entry_id.");
      }

      const source = await client.query<{
        inbound_entry_id: string | null;
        item_id: string;
        warehouse_id: string;
        status: string;
      }>(
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
        AND ($7::text IS NULL OR bin_code = $7)
        AND ($8::text IS NULL OR serial_no = $8)
        AND ($9::date IS NULL OR expiry_date = $9::date)
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
        input.binCode ?? null,
        input.serialNo ?? null,
        input.expiryDate ?? null,
      ],
    );

    const allocations: PhysicalLayerAllocation[] = [];
    let remaining = roundQuantity(input.quantity);

    for (const row of result.rows) {
      if (remaining <= 0) break;

      const available = Number(row.remaining_quantity);
      const quantity = roundQuantity(Math.min(available, remaining));

      const unitCost = Number(row.unit_cost);
      const remainingValue = Number(
        row.remaining_value ?? roundMoney(available * unitCost),
      );

      const physicalValue =
        quantity === available
          ? roundMoney(remainingValue)
          : roundMoney(quantity * unitCost);

      allocations.push({
        layer: {
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
        },
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

    if (totalQuantity <= 0) {
      throw new Error("No physical stock allocated.");
    }

    let assignedFinancialCost = 0;

    for (let index = 0; index < input.allocations.length; index++) {
      const allocation = input.allocations[index];
      const layer = allocation.layer;
      const isLast = index === input.allocations.length - 1;

      const financialCost = isLast
        ? roundMoney(input.totalFinancialCost - assignedFinancialCost)
        : input.method === "FIFO" || input.method === "LIFO"
          ? allocation.physicalValue
          : roundMoney(
              (input.totalFinancialCost * allocation.quantity) / totalQuantity,
            );

      assignedFinancialCost = roundMoney(assignedFinancialCost + financialCost);

      const financialUnitCost = roundUnitCost(
        financialCost / allocation.quantity,
      );

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
          input.outboundEntryId,
          input.outboundLineId ?? null,
          layer.id,
          input.sourceAllocationId ?? null,
          input.itemId,
          input.warehouseId,
          layer.locationId,
          layer.batchNo,
          layer.binCode,
          layer.serialNo,
          layer.expiryDate,
          layer.dateReceived,
          layer.prodDate,
          allocation.quantity,
          financialUnitCost,
          financialCost,
          layer.unitCost,
          financialUnitCost,
        ],
      );

      const newRemainingQuantity = roundQuantity(
        layer.remainingQuantity - allocation.quantity,
      );

      const newRemainingValue =
        newRemainingQuantity === 0
          ? 0
          : roundMoney(layer.remainingValue - allocation.physicalValue);

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
          AND remaining_quantity >= $5
        `,
        [
          layer.id,
          input.companyId,
          newRemainingQuantity,
          Math.max(0, newRemainingValue),
          allocation.quantity,
        ],
      );

      if (updated.rowCount !== 1) {
        throw new Error(`Stock layer changed during allocation: ${layer.id}`);
      }
    }
  }
}

//  lib/services/inventory/inventory-allocation-engine.service.ts

import { PoolClient } from "pg";
import { InventoryAllocationResult } from "@/types/inventory-allocation";

type LedgerEntryRow = {
  id: string;
  remaining_quantity: string;
  unit_cost: string;
  batch_no?: string | null;
  bin_code?: string | null;
  expiry_date?: string | null;
};

export class InventoryAllocationEngineService {
  static async allocate(
    client: PoolClient,
    companyId: string,
    itemId: string,
    warehouseId: string,
    requiredQty: number,
    outboundEntryId: string,
    outboundLineId?: string,
    method: "FIFO" | "FEFO" = "FIFO",
  ): Promise<InventoryAllocationResult[]> {


    const baseOrder =
      method === "FIFO"
        ? "created_at ASC"
        : "expiry_date ASC NULLS LAST, created_at ASC";

    const inboundResult = await client.query<LedgerEntryRow>(
      `
      SELECT *
      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND direction = 'IN'
        AND remaining_quantity > 0
      ORDER BY ${baseOrder}
      FOR UPDATE
      `,
      [companyId, itemId, warehouseId],
    );

    let remaining = requiredQty;

    const allocations: InventoryAllocationResult[] = [];

    for (const row of inboundResult.rows) {
      if (remaining <= 0) break;

      const available = Number(row.remaining_quantity);

      if (available <= 0) continue;

      const qty = Math.min(available, remaining);

      const unitCost = Number(row.unit_cost || 0);
      const totalCost = qty * unitCost;

      // update stock layer
      await client.query(
        `
        UPDATE inventory_ledger_entries
        SET remaining_quantity = remaining_quantity - $1
        WHERE id = $2
        `,
        [qty, row.id],
      );

      // persist allocation
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          outbound_line_id,
          inbound_entry_id,
          item_id,
          warehouse_id,
          batch_no,
          bin_code,
          expiry_date,
          allocated_quantity,
          unit_cost,
          total_cost,
          allocation_method,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,
          'FIFO','ACTIVE'
        )
        `,
        [
          companyId,
          outboundEntryId,
          outboundLineId || null,
          row.id,
          itemId,
          warehouseId,
          row.batch_no || null,
          row.bin_code || null,
          row.expiry_date || null,
          qty,
          unitCost,
          totalCost,
        ],
      );

      allocations.push({
        inbound_entry_id: row.id,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        batch_no: row.batch_no ?? null,
        bin_code: row.bin_code ?? null,
        expiry_date: row.expiry_date ?? null,
      });

      remaining -= qty;
    }

    if (remaining > 0) {
      throw new Error("Insufficient inventory for FIFO allocation");
    }

    return allocations;
  }
}

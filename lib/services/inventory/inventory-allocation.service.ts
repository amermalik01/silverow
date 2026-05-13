//  lib/services/inventory/inventory-allocation.service.ts

import { pool } from "@/lib/db";

export class InventoryAllocationService {
  /**
   * RESERVE STOCK FOR PURCHASE ORDER
   */
  static async reservePOStock(
    companyId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    poLineId: string,
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // insert reservation entry (soft allocation)
      await client.query(
        `
        INSERT INTO inventory_reservations (
          company_id,
          item_id,
          warehouse_id,
          quantity,
          reference_type,
          reference_id
        )
        VALUES ($1,$2,$3,$4,'PURCHASE_ORDER',$5)
        `,
        [companyId, itemId, warehouseId, quantity, poLineId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

//  lib/services/inventory/inventory-shipment.service.ts

import { PoolClient } from "pg";

import { InventoryCOGSService } from "./inventory-cogs.service";

export class InventoryShipmentService {
  /**
   * =========================================================
   * POST SHIPMENT
   * =========================================================
   */
  static async postShipment(
    client: PoolClient,
    companyId: string,
    shipmentId: string,
    userId?: string,
  ): Promise<void> {
    /**
     * -----------------------------------------------------
     * VALIDATE SHIPMENT
     * -----------------------------------------------------
     */
    const shipmentResult = await client.query(
      `
      SELECT *
      FROM inventory_shipments
      WHERE id = $1
      `,
      [shipmentId],
    );

    if (!shipmentResult.rows.length) {
      throw new Error("Shipment not found");
    }

    const shipment = shipmentResult.rows[0];

    if (shipment.is_posted) {
      throw new Error("Shipment already posted");
    }

    /**
     * -----------------------------------------------------
     * 1. UPDATE INVENTORY (already handled in movement layer)
     * -----------------------------------------------------
     * Assume inventory_transactions already created earlier
     */

    /**
     * -----------------------------------------------------
     * 2. POST COGS
     * -----------------------------------------------------
     */
    await InventoryCOGSService.postCOGS(client, companyId, shipmentId, userId);

    /**
     * -----------------------------------------------------
     * 3. MARK SHIPMENT POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_shipments
      SET status = 'posted',
          is_posted = true,
          posted_at = now()
      WHERE id = $1
      `,
      [shipmentId],
    );
  }
}

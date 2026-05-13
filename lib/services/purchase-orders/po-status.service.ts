//  lib/services/purchase-orders/po-status.service.ts

import { pool } from "@/lib/db";

export class POStatusService {
  static async recalcStatus(poId: string) {
    const result = await pool.query(
      `
      SELECT
        SUM(quantity) as ordered,
        SUM(received_quantity) as received
      FROM purchase_order_lines
      WHERE purchase_order_id = $1
      `,
      [poId],
    );

    const { ordered, received } = result.rows[0];

    let status = "open";

    if (received >= ordered) {
      status = "received";
    } else if (received > 0) {
      status = "partial_received";
    }

    await pool.query(
      `
      UPDATE purchase_orders
      SET status = $1
      WHERE id = $2
      `,
      [status, poId],
    );
  }
}

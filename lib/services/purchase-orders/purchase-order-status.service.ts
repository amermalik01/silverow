// lib/services/purchase-orders/purchase-order-status.service.ts

import { PoolClient } from "pg";

export class PurchaseOrderStatusService {
  //  * =========================================================
  //  * RECALCULATE PO STATUS
  //  * =========================================================

  static async recalculate(
    client: PoolClient,
    purchaseOrderId: string,
  ): Promise<void> {
    const result = await client.query(
      `
      SELECT
        quantity,
        received_quantity,
        invoiced_quantity
      FROM purchase_order_lines
      WHERE purchase_order_id = $1
      `,
      [purchaseOrderId],
    );

    if (!result.rows.length) {
      return;
    }

    let totalQty = 0;
    let totalReceived = 0;
    let totalInvoiced = 0;

    for (const row of result.rows) {
      totalQty += Number(row.quantity || 0);
      totalReceived += Number(row.received_quantity || 0);
      totalInvoiced += Number(row.invoiced_quantity || 0);
    }

    let status = "OPEN";

    if (totalReceived <= 0) {
      status = "OPEN";
    } else if (totalReceived < totalQty) {
      status = "PARTIALLY_RECEIVED";
    } else if (totalReceived >= totalQty) {
      status = "RECEIVED";
    }

    if (totalInvoiced >= totalQty) {
      status = "INVOICED";
    }

    await client.query(
      `
      UPDATE purchase_orders
      SET
        status = $2,
        updated_at = now()
      WHERE id = $1
      `,
      [purchaseOrderId, status],
    );
  }
}

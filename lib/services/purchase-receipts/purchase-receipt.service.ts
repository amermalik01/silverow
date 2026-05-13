//  lib/services/purchase-receipts/purchase-receipt.service.ts

import { pool } from "@/lib/db";
import { postInventoryTransaction } from "@/lib/services/inventory/inventory-movement.service";

export class PurchaseReceiptService {
  /**
   * CREATE RECEIPT FROM PO
   */
  static async createReceipt(
    companyId: string,
    payload: {
      purchase_order_id: string;
      receipt_date: string;
      warehouse_id: string;
      lines: {
        purchase_order_line_id: string;
        item_id: string;
        quantity: number;
        unit_cost: number;
      }[];
    },
  ) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /**
       * HEADER
       */
      const receiptResult = await client.query(
        `
        INSERT INTO purchase_receipts (
          company_id,
          purchase_order_id,
          receipt_date,
          warehouse_id,
          status,
          created_at
        )
        VALUES ($1,$2,$3,$4,'POSTED',now())
        RETURNING *
        `,
        [
          companyId,
          payload.purchase_order_id,
          payload.receipt_date,
          payload.warehouse_id,
        ],
      );

      const receipt = receiptResult.rows[0];

      /**
       * LINES + INVENTORY POSTING
       */
      for (const line of payload.lines) {
        await client.query(
          `
          INSERT INTO purchase_receipt_lines (
            purchase_receipt_id,
            purchase_order_line_id,
            item_id,
            quantity,
            warehouse_location_id
          )
          VALUES ($1,$2,$3,$4,NULL)
          `,
          [
            receipt.id,
            line.purchase_order_line_id,
            line.item_id,
            line.quantity,
          ],
        );

        /**
         * INVENTORY POSTING
         */
        await postInventoryTransaction({
          company_id: companyId,
          item_id: line.item_id,
          warehouse_id: payload.warehouse_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          transaction_type: 1, // RECEIPT IN
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receipt.id,
        });

        /**
         * UPDATE PO LINE RECEIVED QTY
         */
        await client.query(
          `
          UPDATE purchase_order_lines
          SET received_quantity = COALESCE(received_quantity,0) + $1
          WHERE id = $2
          `,
          [line.quantity, line.purchase_order_line_id],
        );
      }

      /**
       * UPDATE PO STATUS
       */
      await client.query(
        `
        UPDATE purchase_orders
        SET status = 'partial_received'
        WHERE id = $1
        `,
        [payload.purchase_order_id],
      );

      await client.query("COMMIT");

      return receipt;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

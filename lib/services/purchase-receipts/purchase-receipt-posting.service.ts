// lib/services/purchase-receipts/purchase-receipt-posting.service.ts

import { pool } from "@/lib/db";

import {
  InventoryMovementService,
  InventoryMovementLineInput,
} from "@/lib/services/inventory/inventory-movement.service";
import { PurchaseOrderService } from "../purchase-orders/purchase-order.service";
import { PurchaseGLPostingService } from "../purchase-orders/purchase-gl-posting.service";

export class PurchaseReceiptPostingService {
  //  * =========================================================
  //  * POST PURCHASE RECEIPT
  //  * =========================================================

  static async post(
    companyId: string,
    receiptId: string,
    userId?: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const receiptResult = await client.query(
        `
        SELECT *
        FROM purchase_receipts
        WHERE id = $1
        AND company_id = $2
        `,
        [receiptId, companyId],
      );

      if (!receiptResult.rows.length) {
        throw new Error("Purchase receipt not found");
      }

      const receipt = receiptResult.rows[0];

      if (receipt.status === "posted") {
        throw new Error("Purchase receipt already posted");
      }

      const linesResult = await client.query(
        `
        SELECT
          prl.id,
          prl.purchase_order_line_id,
          prl.item_id,
          prl.quantity,
          prl.warehouse_location_id,
          prl.batch_no,
          prl.serial_no,
          prl.expiry_date,

          pol.purchase_order_id,
          pol.line_type,
          pol.quantity AS ordered_quantity,
          pol.received_quantity,
          pol.cancelled_quantity,
          pol.unit_cost,
          pol.warehouse_id

        FROM purchase_receipt_lines prl

        INNER JOIN purchase_order_lines pol
          ON pol.id = prl.purchase_order_line_id

        WHERE prl.purchase_receipt_id = $1
        `,
        [receiptId],
      );

      const lines = linesResult.rows;

      if (!lines.length) {
        throw new Error("Purchase receipt has no lines");
      }

      for (const line of lines) {
        // ONLY ITEM LINES ALLOWED

        if (line.line_type !== "ITEM") {
          throw new Error(
            `Purchase order line ${line.purchase_order_line_id} is not an ITEM line`,
          );
        }

        const orderedQty = Number(line.ordered_quantity || 0);
        const receivedQty = Number(line.received_quantity || 0);
        const cancelledQty = Number(line.cancelled_quantity || 0);
        const receivingQty = Number(line.quantity || 0);

        const remainingQty = orderedQty - receivedQty - cancelledQty;

        if (receivingQty <= 0) {
          throw new Error(
            `Invalid receipt quantity for line ${line.purchase_order_line_id}`,
          );
        }

        if (receivingQty > remainingQty) {
          throw new Error(
            `Receipt quantity exceeds remaining quantity for line ${line.purchase_order_line_id}`,
          );
        }
      }

      //  * -----------------------------------------------------
      //  * INVENTORY MOVEMENT LINES
      //  * -----------------------------------------------------

      const inventoryLines: InventoryMovementLineInput[] = lines.map(
        (line) => ({
          item_id: line.item_id,
          warehouse_id: line.warehouse_id || receipt.warehouse_id,
          location_id: line.warehouse_location_id || null,
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost || 0),
          movement_direction: "IN",
          batch_no: line.batch_no || null,
          serial_no: line.serial_no || null,
          expiry_date: line.expiry_date || null,
        }),
      );

      //  * -----------------------------------------------------
      //  * POST INVENTORY TRANSACTION
      //  * -----------------------------------------------------

      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,
        transaction_type: "PURCHASE_RECEIPT",
        posting_date: receipt.receipt_date,
        reference_type: "PURCHASE_RECEIPT",
        reference_id: receipt.id,
        created_by: userId || null,
        lines: inventoryLines,
      });

      await PurchaseGLPostingService.postPurchaseReceipt(
        client,
        companyId,
        receiptId,
        userId,
      );

      for (const line of lines) {
        const receivingQty = Number(line.quantity || 0);

        await client.query(
          `
          UPDATE purchase_order_lines
          SET
            received_quantity =
              COALESCE(received_quantity, 0) + $1,

            remaining_quantity =
              quantity - (
                COALESCE(received_quantity, 0)
                + $1
                + COALESCE(cancelled_quantity, 0)
              ),

            updated_at = now()

          WHERE id = $2
          `,
          [receivingQty, line.purchase_order_line_id],
        );
      }

      const purchaseOrderId = lines[0].purchase_order_id;

      await PurchaseOrderService.recalculateStatus(client, purchaseOrderId);

      await client.query(
        `
        UPDATE purchase_receipts
        SET
          status = 'posted',
          posted_at = now(),
          updated_at = now()
        WHERE id = $1
        `,
        [receiptId],
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

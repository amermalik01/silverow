// lib/services/purchase-receipts/purchase-receipt-posting.service.ts

import { pool } from "@/lib/db";
import { PurchaseOrderService } from "../purchase-orders/purchase-order.service";
import { PurchaseGLPostingService } from "../purchase-orders/purchase-gl-posting.service";
import { InventoryMovementService, InventoryMovementLineInput } from "@/lib/services/inventory/inventory-movement.service";

export class PurchaseReceiptPostingService {
  /**
   * Orchestrates the secure final validation and hard posting verification 
   * of a pending operational Purchase Receipt doc.
   */
  static async post(
    companyId: string,
    receiptId: string,
    userId?: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch document context with row-level locking
      const receiptResult = await client.query(
        `
        SELECT id, receipt_no, receipt_date, status, warehouse_id
        FROM purchase_receipts
        WHERE id = $1 AND company_id = $2
        FOR UPDATE
        `,
        [receiptId, companyId],
      );

      if (!receiptResult.rows.length) {
        throw new Error("Purchase receipt document target record not found.");
      }

      const receipt = receiptResult.rows[0];

      if (receipt.status === "posted") {
        throw new Error("Action denied. This purchase receipt has already been finalized and posted.");
      }

      // 2. Load relational lines across system item registries
      const linesResult = await client.query(
        `
        SELECT
          prl.id,
          prl.purchase_order_line_id,
          prl.item_id,
          prl.quantity,
          prl.warehouse_id AS line_warehouse_id,
          prl.location_id,
          prl.batch_no,
          prl.serial_no,
          prl.expiry_date,
          prl.unit_cost,
          prl.total_cost,
          pol.purchase_order_id,
          pol.line_type,
          pol.quantity AS ordered_quantity,
          pol.received_quantity,
          pol.cancelled_quantity
        FROM purchase_receipt_lines prl
        INNER JOIN purchase_order_lines pol ON pol.id = prl.purchase_order_line_id
        WHERE prl.purchase_receipt_id = $1 AND prl.company_id = $2 AND prl.is_deleted = false
        `,
        [receiptId, companyId],
      );

      const lines = linesResult.rows;

      if (!lines.length) {
        throw new Error("Transaction aborted. Document contains no valid active lines to post.");
      }

      // 3. Complete structural validation pass
      for (const line of lines) {
        if (line.line_type !== "ITEM") {
          throw new Error(`Line allocation error. Source contract row ${line.purchase_order_line_id} must be categorized as an ITEM.`);
        }

        const orderedQty = Number(line.ordered_quantity || 0);
        const receivedQty = Number(line.received_quantity || 0);
        const cancelledQty = Number(line.cancelled_quantity || 0);
        const receivingQty = Number(line.quantity || 0);

        const remainingQty = Number((orderedQty - receivedQty - cancelledQty).toFixed(6));

        if (receivingQty <= 0) {
          throw new Error(`Validation constraint failed. Receipt line ${line.id} volume must be positive.`);
        }

        if (receivingQty > remainingQty) {
          throw new Error(
            `Over-receipt protection violation. Line ${line.id} quantity (${receivingQty}) exceeds remaining capacity (${remainingQty}).`
          );
        }
      }

      // 4. Transform payload and execute inventory ledger updates
      const inventoryLines: InventoryMovementLineInput[] = lines.map((line) => ({
        item_id: line.item_id,
        warehouse_id: line.line_warehouse_id || receipt.warehouse_id,
        location_id: line.location_id || null,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost || 0),
        movement_direction: "IN",
        batch_no: line.batch_no || null,
        serial_no: line.serial_no || null,
        expiry_date: line.expiry_date || null,
      }));

      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,
        transaction_type: "PURCHASE_RECEIPT",
        posting_date: receipt.receipt_date,
        reference_type: "PURCHASE_RECEIPT",
        reference_id: receipt.id,
        created_by: userId || null,
        lines: inventoryLines,
      });

      // 5. Build financial distributions
      await PurchaseGLPostingService.postPurchaseReceipt(
        client,
        companyId,
        receiptId,
        userId,
      );

      // 6. Update document metrics & synchronize overall purchase status pipelines
      for (const line of lines) {
        await client.query(
          `
          UPDATE purchase_order_lines
          SET 
            received_quantity = COALESCE(received_quantity, 0) + $1,
            remaining_quantity = GREATEST(0, quantity - (COALESCE(received_quantity, 0) + $1 + COALESCE(cancelled_quantity, 0))),
            updated_at = NOW()
          WHERE id = $2
          `,
          [Number(line.quantity), line.purchase_order_line_id],
        );
      }

      const purchaseOrderId = lines[0].purchase_order_id;
      await PurchaseOrderService.recalculateStatus(client, purchaseOrderId);

      // 7. Close out receipt document lifecycle
      await client.query(
        `
        UPDATE purchase_receipts
        SET status = 'posted', is_posted = true, posted_at = NOW(), updated_at = NOW()
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

/* import { pool } from "@/lib/db";

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
 */
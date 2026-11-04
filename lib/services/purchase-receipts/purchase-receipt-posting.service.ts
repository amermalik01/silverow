// lib/services/purchase-receipts/purchase-receipt-posting.service.ts

import type { QueryResultRow } from "pg";
import { pool } from "@/lib/db";

import { PurchaseOrderService } from "../purchase-orders/purchase-order.service";
import { PurchaseGLPostingService } from "../purchase-orders/purchase-gl-posting.service";

// import { InventoryMovementService, InventoryMovementLineInput } from "@/lib/services/inventory/inventory-movement.service";

import {
  InventoryMovementService,
  type InventoryMovementLineInput,
} from "@/lib/services/inventory/inventory-movement.service";

interface ReceiptHeaderRow extends QueryResultRow {
  id: string;
  receipt_no: string;
  receipt_date: string;
  status: string;
  warehouse_id: string | null;
}

interface ReceiptLineRow extends QueryResultRow {
  id: string;
  purchase_order_line_id: string;
  item_id: string | null;
  quantity: string | number;
  line_warehouse_id: string | null;
  location_id: string | null;
  batch_no: string | null;
  serial_no: string | null;
  expiry_date: string | null;
  unit_cost: string | number | null;
  total_cost: string | number | null;
  purchase_order_id: string;
  line_type: string | null;
  ordered_quantity: string | number;
  received_quantity: string | number | null;
  cancelled_quantity: string | number | null;
}

interface ReceiptQuantityGroup {
  purchaseOrderLineId: string;
  receivedQuantity: number;
  orderedQuantity: number;
  alreadyReceived: number;
  cancelledQuantity: number;
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(6));
}

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

      const receipt = receiptResult.rows[0];

      if (!receipt) {
        throw new Error("Purchase receipt document target record not found.");
      }

      if (receipt.status === "posted" || receipt.status === "POSTED") {
        throw new Error(
          "Action denied. This purchase receipt has already been posted.",
        );
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
        INNER JOIN purchase_order_lines pol
            ON pol.id = prl.purchase_order_line_id
            AND pol.company_id = prl.company_id
          WHERE prl.purchase_receipt_id = $1
            AND prl.company_id = $2
            AND COALESCE(prl.is_deleted, false) = false
            AND COALESCE(pol.is_deleted, false) = false
          ORDER BY pol.id, prl.id
          FOR UPDATE OF prl, pol
        `,
        [receiptId, companyId],
      );

      const lines = linesResult.rows;

      if (lines.length === 0) {
        throw new Error(
          "Transaction aborted. Document contains no active receipt lines.",
        );
      }

      // 3. A receipt must belong to one purchase order.
      const purchaseOrderIds = new Set(
        lines.map((line) => line.purchase_order_id),
      );

      if (purchaseOrderIds.size !== 1) {
        throw new Error(
          "Invalid receipt. Receipt lines must belong to the same purchase order.",
        );
      }

      const purchaseOrderId = lines[0].purchase_order_id;

      // 4. Validate and aggregate quantities by PO line.
      //
      // This is important because multiple receipt lines can reference
      // the same PO line. Validating each line independently can otherwise
      // allow their combined quantity to exceed the remaining quantity.
      const quantityGroups = new Map<string, ReceiptQuantityGroup>();

      // if (!lines.length) {
      //   throw new Error(
      //     "Transaction aborted. Document contains no valid active lines to post.",
      //   );
      // }

      
      for (const line of lines) {
        if (line.line_type !== "ITEM") {
          throw new Error(
            `Line allocation error. Source contract row ${line.purchase_order_line_id} must be categorized as an ITEM.`,
          );
        }

        if (!line.item_id) {
          throw new Error(
            `Receipt line ${line.id} does not have an item assigned.`,
          );
        }

        const receivingQuantity = toNumber(line.quantity);

        if (receivingQuantity <= 0) {
          throw new Error(
            `Receipt line ${line.id} quantity must be greater than zero.`,
          );
        }

        const existing = quantityGroups.get(line.purchase_order_line_id);

        if (existing) {
          existing.receivedQuantity = roundQuantity(
            existing.receivedQuantity + receivingQuantity,
          );
        } else {
          quantityGroups.set(line.purchase_order_line_id, {
            purchaseOrderLineId: line.purchase_order_line_id,
            receivedQuantity: receivingQuantity,
            orderedQuantity: toNumber(line.ordered_quantity),
            alreadyReceived: toNumber(line.received_quantity),
            cancelledQuantity: toNumber(line.cancelled_quantity),
          });
        }

        // const orderedQty = Number(line.ordered_quantity || 0);
        // const receivedQty = Number(line.received_quantity || 0);
        // const cancelledQty = Number(line.cancelled_quantity || 0);
        // const receivingQty = Number(line.quantity || 0);

        // const remainingQty = Number(
        //   (orderedQty - receivedQty - cancelledQty).toFixed(6),
        // );

        // if (receivingQty <= 0) {
        //   throw new Error(
        //     `Validation constraint failed. Receipt line ${line.id} volume must be positive.`,
        //   );
        // }

        // if (receivingQty > remainingQty) {
        //   throw new Error(
        //     `Over-receipt protection violation. Line ${line.id} quantity (${receivingQty}) exceeds remaining capacity (${remainingQty}).`,
        //   );
        // }
      }

      for (const group of quantityGroups.values()) {
        const remainingQuantity = roundQuantity(
          group.orderedQuantity -
            group.alreadyReceived -
            group.cancelledQuantity,
        );

        if (group.receivedQuantity > remainingQuantity + 0.000001) {
          throw new Error(
            `Over-receipt protection violation. PO line ${group.purchaseOrderLineId}: receiving ${group.receivedQuantity}, remaining quantity ${Math.max(0, remainingQuantity)}.`,
          );
        }
      }

      // 5. Transform receipt lines for the central inventory engine.
      const inventoryLines: InventoryMovementLineInput[] = lines.map(
        (line) => ({
          item_id: line.item_id,
          warehouse_id: line.line_warehouse_id || receipt.warehouse_id,
          location_id: line.location_id || null,
          quantity: toNumber(line.quantity),
          unit_cost: toNumber(line.unit_cost || 0),
          movement_direction: "IN",
          batch_no: line.batch_no || null,
          serial_no: line.serial_no || null,
          expiry_date: line.expiry_date || null,
        }),
      );

      await InventoryMovementService.postTransaction(client, {
        company_id: companyId,
        transaction_type: "PURCHASE_RECEIPT",
        posting_date: receipt.receipt_date,
        reference_type: "PURCHASE_RECEIPT",
        reference_id: receipt.id,
        created_by: userId || null,
        lines: inventoryLines,
      });

      // 6. Post receipt accounting in the same transaction.
      await PurchaseGLPostingService.postPurchaseReceipt(
        client,
        companyId,
        receiptId,
        userId,
      );

      // 7. Update all PO quantities with one grouped SQL statement.
      //
      // The values are derived from receipt lines in SQL so that the
      // update remains consistent with the receipt document being posted.
      await client.query(
        `
          WITH receipt_quantities AS (
            SELECT
              prl.purchase_order_line_id,
              SUM(prl.quantity) AS received_quantity
            FROM purchase_receipt_lines prl
            WHERE prl.purchase_receipt_id = $1
              AND prl.company_id = $2
              AND COALESCE(prl.is_deleted, false) = false
            GROUP BY prl.purchase_order_line_id
          )
          UPDATE purchase_order_lines pol
          SET
            received_quantity =
              COALESCE(pol.received_quantity, 0)
              + rq.received_quantity,
            remaining_quantity = GREATEST(
              0,
              pol.quantity
                - (
                    COALESCE(pol.received_quantity, 0)
                    + rq.received_quantity
                    + COALESCE(pol.cancelled_quantity, 0)
                  )
            ),
            updated_at = NOW()
          FROM receipt_quantities rq
          WHERE pol.id = rq.purchase_order_line_id
            AND pol.company_id = $2
            AND pol.purchase_order_id = $3
        `,
        [receiptId, companyId, purchaseOrderId],
      );

      // 6. Update document metrics & synchronize overall purchase status pipelines
      // for (const line of lines) {
      //   await client.query(
      //     `
      //     UPDATE purchase_order_lines
      //     SET 
      //       received_quantity = COALESCE(received_quantity, 0) + $1,
      //       remaining_quantity = GREATEST(0, quantity - (COALESCE(received_quantity, 0) + $1 + COALESCE(cancelled_quantity, 0))),
      //       updated_at = NOW()
      //     WHERE id = $2
      //     `,
      //     [Number(line.quantity), line.purchase_order_line_id],
      //   );
      // }

      // const purchaseOrderId = lines[0].purchase_order_id;

       // 8. Recalculate the purchase order receipt status.
      await PurchaseOrderService.recalculateStatus(client, purchaseOrderId);

      // 9. Finalize receipt document.
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

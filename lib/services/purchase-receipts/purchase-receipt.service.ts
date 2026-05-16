//  lib/services/purchase-receipts/purchase-receipt.service.ts

import { pool } from "@/lib/db";
// import { postInventoryTransaction } from "@/lib/services/inventory/inventory-movement.service";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";

export class PurchaseReceiptService {
  /**
   * CREATE RECEIPT FROM PO
   * 
   * Main Steps
            1. create receipt
            2. create lines
            3. create inventory ledger
            4. consume reservations
            5. update PO lines
            6. build GL lines
            7. GLPostingService.postJournal()
            8. update PO status
            9. COMMIT
   */

  static async create(companyId: string, payload: PurchaseReceiptPayload) {
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
            vendor_id,
            receipt_date,
            posting_date
          )
          VALUES ($1,$2,$3,$4,$5)
          RETURNING *
          `,
        [
          companyId,
          payload.receipt.purchase_order_id,
          payload.receipt.vendor_id,
          payload.receipt.receipt_date,
          payload.receipt.posting_date,
        ],
      );

      const receipt = receiptResult.rows[0];

      /**
       * LINES + INVENTORY POSTING
       */

      const glLines: JournalLineInput[] = [];

      for (const line of payload.lines) {
        if (!line.warehouse_id) {
          throw new Error("Warehouse is required");
        }

        if (Number(line.quantity) <= 0) {
          throw new Error("Quantity must be greater than zero");
        }

        if (line.purchase_order_line_id) {
          const poLineResult = await client.query(
            `
            SELECT
            quantity,
            received_quantity
            FROM purchase_order_lines
            WHERE id = $1
            `,
            [line.purchase_order_line_id],
          );

          if (!poLineResult.rows.length) {
            throw new Error("PO line not found");
          }

          const poLine = poLineResult.rows[0];

          const remaining =
            Number(poLine.quantity) - Number(poLine.received_quantity || 0);

          if (Number(line.quantity) > remaining) {
            throw new Error(`Receipt quantity exceeds remaining PO qty`);
          }
        }

        const lineResult = await client.query(
          `
            INSERT INTO purchase_receipt_lines (
              company_id,
              purchase_receipt_id,
              item_id,
              warehouse_id,
              batch_no,
              bin_code,
              expiry_date,
              quantity,
              unit_cost,
              total_cost
            )
            VALUES (
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10
            )
            RETURNING *
            `,
          [
            companyId,
            receipt.id,
            line.item_id,
            line.warehouse_id,
            line.batch_no || null,
            line.bin_code || null,
            line.expiry_date || null,
            line.quantity,
            line.unit_cost,
            Number(line.quantity) * Number(line.unit_cost),
          ],
        );

        const receiptLine = lineResult.rows[0];

        /**
         * INVENTORY LEDGER IN
         */
        await client.query(
          `
          INSERT INTO inventory_ledger_entries (
            company_id,
            posting_date,
            transaction_type,
            reference_type,
            reference_id,
            reference_line_id,
            item_id,
            warehouse_id,
            batch_no,
            bin_code,
            expiry_date,
            quantity,
            remaining_quantity,
            unit_cost,
            total_cost,
            direction
          )
          VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,
            'IN'
          )
          `,
          [
            companyId,
            receipt.posting_date,
            "PURCHASE_RECEIPT",
            "PURCHASE_RECEIPT",
            receipt.id,
            receiptLine.id,
            line.item_id,
            line.warehouse_id,
            line.batch_no || null,
            line.bin_code || null,
            line.expiry_date || null,
            line.quantity,
            line.quantity,
            line.unit_cost,
            Number(line.quantity) * Number(line.unit_cost),
          ],
        );

        const accounts = await AccountResolutionService.resolvePurchaseAccounts(
          client,
          companyId,
          line.item_id,
        );

        const totalCost = Number(line.quantity) * Number(line.unit_cost);

        /**
         * DR INVENTORY
         */
        glLines.push({
          account_id: accounts.inventory_account_id,

          debit: totalCost,

          credit: 0,

          item_id: line.item_id,

          warehouse_id: line.warehouse_id,

          quantity: line.quantity,

          unit_cost: line.unit_cost,

          reference_type: "PURCHASE_RECEIPT",

          reference_id: receipt.id,
        });

        /**
         * CR GRNI
         */
        glLines.push({
          account_id: accounts.grni_account_id,

          debit: 0,

          credit: totalCost,

          item_id: line.item_id,

          warehouse_id: line.warehouse_id,

          quantity: line.quantity,

          unit_cost: line.unit_cost,

          reference_type: "PURCHASE_RECEIPT",

          reference_id: receipt.id,
        });

        /**
         * CONSUME RESERVATIONS
         */

        const reservationResult = await client.query(
          `
            SELECT *
            FROM inventory_reservations
            WHERE reference_id = $1
                AND status IN ('OPEN','PARTIAL')
            ORDER BY created_at
            `,
          [line.purchase_order_line_id],
        );

        let remainingToConsume = Number(line.quantity);

        for (const reservation of reservationResult.rows) {
          if (remainingToConsume <= 0) {
            break;
          }

          const available =
            Number(reservation.reserved_quantity) -
            Number(reservation.consumed_quantity || 0);

          if (available <= 0) {
            continue;
          }

          const consumeQty = Math.min(available, remainingToConsume);

          const newConsumed =
            Number(reservation.consumed_quantity || 0) + consumeQty;

          const remaining = Number(reservation.reserved_quantity) - newConsumed;

          const status = remaining <= 0 ? "CONSUMED" : "PARTIAL";

          await client.query(
            `
                UPDATE inventory_reservations
                SET
                    consumed_quantity = $1,
                    status = $2,
                    updated_at = now()
                WHERE id = $3
                `,
            [newConsumed, status, reservation.id],
          );

          remainingToConsume -= consumeQty;
        }

        /* for (const reservation of reservationResult.rows) {
          const consumed =
            Number(reservation.consumed_quantity || 0) + Number(line.quantity);

          const remaining =
            Number(reservation.reserved_quantity || 0) - consumed;

          let status = "PARTIAL";

          if (remaining <= 0) {
            status = "CONSUMED";
          }

          await client.query(
            `
            UPDATE inventory_reservations
            SET
                consumed_quantity = $1,
                status = $2,
                updated_at = now()
            WHERE id = $3
            `,
            [consumed, status, reservation.id],
          );
        } */

        if (line.purchase_order_line_id) {
          await client.query(
            `
            UPDATE purchase_order_lines
            SET
            received_quantity =
                COALESCE(received_quantity,0) + $1,

            updated_at = now()

            WHERE id = $2
            `,
            [Number(line.quantity), line.purchase_order_line_id],
          );
        }
      }

      GLValidationService.validateBalanced(glLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,

        entry_date: receipt.posting_date,

        source: "PURCHASE",

        journal_type: "PURCHASE_RECEIPT",

        reference: receipt.receipt_no || receipt.id,

        source_id: receipt.id,

        description: "Purchase receipt posting",

        lines: glLines,
      });

      await client.query(
        `
            UPDATE purchase_receipts
            SET
                is_posted = true,
                posted_at = now()
            WHERE id = $1
            `,
        [receipt.id],
      );

      await client.query(
        `
        UPDATE purchase_orders po
        SET
            status =
            CASE
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM purchase_order_lines pol
                    WHERE pol.purchase_order_id = po.id
                    AND COALESCE(pol.received_quantity,0)
                        < COALESCE(pol.quantity,0)
                    AND COALESCE(pol.is_deleted,false) = false
                )
                THEN 'received'

                ELSE 'partial_received'
            END,

            updated_at = now()

        WHERE po.id = $1
        `,
        [receipt.purchase_order_id],
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

/* await client.query(
    `
    UPDATE inventory_reservations
    SET
    consumed_quantity =
        consumed_quantity + $1,

    status = 'CONSUMED',

    updated_at = now()

    WHERE reference_id = $2
    `,
    [line.quantity, line.purchase_order_line_id],
); */
/* 

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

        // *
        //  * INVENTORY POSTING
        
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

        // *
        //  * UPDATE PO LINE RECEIVED QTY
        
        await client.query(
          `
          UPDATE purchase_order_lines
          SET received_quantity = COALESCE(received_quantity,0) + $1
          WHERE id = $2
          `,
          [line.quantity, line.purchase_order_line_id],
        );
      }

    //   *
    //    * UPDATE PO STATUS
      
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
*/

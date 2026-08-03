//  lib/services/purchase-receipts/purchase-receipt.service.ts

import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

export class PurchaseReceiptService {
  /**
   * Standalone creation entry point (Creates and manages its own client connection)
   */
  static async create(companyId: string, payload: PurchaseReceiptPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const receipt = await this.createTransactional(
        client,
        companyId,
        payload,
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

  /**
   * Transactional creation engine designed to be safely combined with other services (e.g. Allocation Engine)
   */
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: PurchaseReceiptPayload,
  ) {
    const receiptResult = await client.query(
      `
      INSERT INTO purchase_receipts (
        company_id,
        purchase_order_id,
        vendor_id,
        receipt_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', false)
      RETURNING *
      `,
      [
        companyId,
        payload.receipt.purchase_order_id,
        payload.receipt.vendor_id,
        payload.receipt.receipt_date,
        payload.receipt.posting_date,
        payload.receipt.reference_no || null,
        payload.receipt.notes || null,
      ],
    );

    const receipt = receiptResult.rows[0];
    const glLines: JournalLineInput[] = [];

    for (const line of payload.lines) {
      if (!line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for item ${line.item_id}`,
        );
      }

      const qtyReceived = Number(line.quantity);
      if (qtyReceived <= 0) {
        throw new Error("Receipt quantity must be greater than zero");
      }

      // 1. Prevent over-receiving on Purchase Order lines
      if (line.purchase_order_line_id) {
        const poLineResult = await client.query(
          `
          SELECT quantity, received_quantity 
          FROM purchase_order_lines 
          WHERE id = $1 FOR UPDATE
          `,
          [line.purchase_order_line_id],
        );

        if (!poLineResult.rows.length) {
          throw new Error(
            `Purchase Order line ${line.purchase_order_line_id} not found`,
          );
        }

        const poLine = poLineResult.rows[0];
        const remainingAllowed =
          Number(poLine.quantity) - Number(poLine.received_quantity || 0);

        if (qtyReceived > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Receipt quantity (${qtyReceived}) exceeds remaining open line quantity (${remainingAllowed})`,
          );
        }
      }

      // 2. Save Purchase Receipt Line Row
      const unitCost = Number(line.unit_cost);
      const totalCost = Number((qtyReceived * unitCost).toFixed(2));

      const lineResult = await client.query(
        `
        INSERT INTO purchase_receipt_lines (
          company_id, purchase_receipt_id, purchase_order_line_id,
          line_no, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, consignment_no, expiry_date,
          quantity, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        `,
        [
          companyId,
          receipt.id,
          line.purchase_order_line_id || null,
          line.line_no,
          line.item_id,
          line.warehouse_id,
          line.location_id || null,
          line.bin_code || null,
          line.batch_no || null,
          line.serial_no || null,
          line.consignment_no || null,
          line.expiry_date || null,
          qtyReceived,
          unitCost,
          totalCost,
        ],
      );

      const receiptLine = lineResult.rows[0];

      // 3. Delegate to Unified Inventory Engine (Inbound Ledger Entry & Reservation Consumption)
      const { ledgerEntry, ppvAmount } =
        await UnifiedInventoryEngineService.processInboundStock(
          client,
          companyId,
          receipt.posting_date,
          "PURCHASE_RECEIPT",
          {
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            location_id: line.location_id,
            bin_code: line.bin_code,
            batch_no: line.batch_no,
            serial_no: line.serial_no,
            expiry_date: line.expiry_date,
            quantity: qtyReceived,
            unit_cost: unitCost,
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            reference_line_id: receiptLine.id,
          },
        );

      const inventoryValueToCapitalize = Number(ledgerEntry.total_cost);

      // 4. Create GRNI entry for invoice matching
      await client.query(
        `
        INSERT INTO grni_entries (
          company_id, purchase_order_line_id, purchase_receipt_line_id,
          warehouse_id, item_id, grn_id, amount, cleared_amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'OPEN')
        `,
        [
          companyId,
          line.purchase_order_line_id,
          receiptLine.id,
          line.warehouse_id,
          line.item_id,
          receipt.id,
          totalCost,
        ],
      );

      // 5. Update Purchase Order Line Received Quantities
      if (line.purchase_order_line_id) {
        await client.query(
          `
          UPDATE purchase_order_lines 
          SET received_quantity = COALESCE(received_quantity, 0) + $1, updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReceived, line.purchase_order_line_id],
        );
      }

      // 6. Build General Ledger Posting Entries
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      // Fetch Inventory System setting
      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      // Build General Ledger Posting Entries (ONLY for PERPETUAL mode)
      if (inventorySystem === "PERPETUAL") {

        // DR - Inventory Asset (Interim)
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: inventoryValueToCapitalize,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReceived,
          unit_cost: Number(ledgerEntry.unit_cost),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receipt.id,
          description: `Asset receipt for item ${line.item_id}`,
        });

        // Handle Purchase Price Variance (Standard Costing)
        if (ppvAmount !== 0) {
          glLines.push({
            account_id: accounts.purchase_price_variance_account_id,
            debit: ppvAmount > 0 ? ppvAmount : 0,
            credit: ppvAmount < 0 ? Math.abs(ppvAmount) : 0,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: qtyReceived,
            unit_cost: Math.abs(ppvAmount / qtyReceived),
            reference_type: "PURCHASE_RECEIPT",
            reference_id: receipt.id,
            description: `Purchase Price Variance for item ${line.item_id}`,
          });
        }

        // CR - GRNI Liability (Interim Clearing Acc)
        glLines.push({
          account_id: accounts.grni_account_id,
          debit: 0,
          credit: totalCost,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReceived,
          unit_cost: unitCost,
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receipt.id,
          description: `GRNI liability for item ${line.item_id}`,
        });
      }

      // 7. Validate GL Balance & Post Journal
      GLValidationService.validateBalanced(glLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: receipt.posting_date,
        source: "PURCHASE",
        journal_type: "PURCHASE_RECEIPT",
        reference: receipt.receipt_no,
        source_id: receipt.id,
        description: `Posted receipt tracking document: ${receipt.receipt_no}`,
        lines: glLines,
      });
    }

    // 8. Seal Receipt Posting Status
    await client.query(
      `
      UPDATE purchase_receipts 
      SET is_posted = true, posted_at = NOW() 
      WHERE id = $1
      `,
      [receipt.id],
    );

    // 9. Update Purchase Order Workflow Status
    await client.query(
      `
      UPDATE purchase_orders po
      SET status = CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
            AND COALESCE(pol.received_quantity, 0) < COALESCE(pol.quantity, 0)
            AND COALESCE(pol.is_deleted, false) = false
        ) THEN 'received'::purchase_order_status_enum
        ELSE 'partial_received'::purchase_order_status_enum
      END,
      updated_at = NOW()
      WHERE po.id = $1
      `,
      [payload.receipt.purchase_order_id],
    );

    return receipt;
  }

  /**
   * Safely reverses allocations, ledger layers, general ledger distributions, and drops a line element
   */
  static async safeDeleteReceiptLine(
    companyId: string,
    purchaseReceiptLineId: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch current active record metrics safely using a Row Lock
      const lineRes = await client.query(
        `SELECT * FROM purchase_receipt_lines WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [purchaseReceiptLineId, companyId],
      );
      if (!lineRes.rows.length)
        throw new Error("Receipt line target item record not found.");
      const receiptLine = lineRes.rows[0];

      // 2. Validate if the associated inventory has already been issued outward
      const layerRes = await client.query(
        `SELECT id, quantity, remaining_quantity FROM inventory_ledger_entries 
         WHERE reference_line_id = $1 AND reference_type = 'PURCHASE_RECEIPT' FOR UPDATE`,
        [purchaseReceiptLineId],
      );

      let effectiveLedgerUnitCost = Number(receiptLine.unit_cost);

      if (layerRes.rows.length) {
        const layer = layerRes.rows[0];
        effectiveLedgerUnitCost = Number(layer.unit_cost);
        if (Number(layer.remaining_quantity) !== Number(layer.quantity)) {
          throw new Error(
            "Cannot modify line. Part of this inventory batch has already been consumed by downstream transactions.",
          );
        }
      }

      // 3. Remove downstream matching allocations tied directly to this item row
      await client.query(
        `DELETE FROM inventory_allocations WHERE inbound_entry_id = (
          SELECT id FROM inventory_ledger_entries WHERE reference_line_id = $1
         )`,
        [purchaseReceiptLineId],
      );

      // 4. Clean out GRNI entries
      await client.query(
        `DELETE FROM grni_entries WHERE purchase_receipt_line_id = $1`,
        [purchaseReceiptLineId],
      );

      // 5. Deduct received quantity figures from the original parent purchase contract sheet
      if (receiptLine.purchase_order_line_id) {
        await client.query(
          `UPDATE purchase_order_lines 
           SET received_quantity = GREATEST(0, COALESCE(received_quantity, 0) - $1), updated_at = NOW()
           WHERE id = $2`,
          [Number(receiptLine.quantity), receiptLine.purchase_order_line_id],
        );
      }

      // 6. Generate financial reversal vectors (Swap Credit/Debit locations to zero out interim states)
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        receiptLine.item_id,
      );

      const qty = Number(receiptLine.quantity);
      const totalPOValue = Number(receiptLine.total_cost);
      const inventoryReversalVal = Number(
        (qty * effectiveLedgerUnitCost).toFixed(2),
      );
      const ppvReversalVal = Number(
        (totalPOValue - inventoryReversalVal).toFixed(2),
      );

      const reversalGlLines: JournalLineInput[] = [
        {
          account_id: accounts.inventory_account_id,
          debit: 0,
          credit: inventoryReversalVal,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: effectiveLedgerUnitCost,
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of asset receipt line ${purchaseReceiptLineId}`,
        },
        {
          account_id: accounts.grni_account_id,
          debit: totalPOValue,
          credit: 0,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: Number(receiptLine.unit_cost),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of GRNI clearing line ${purchaseReceiptLineId}`,
        },
      ];

      if (ppvReversalVal !== 0) {
        reversalGlLines.push({
          account_id: accounts.purchase_price_variance_account_id,
          debit: ppvReversalVal < 0 ? Math.abs(ppvReversalVal) : 0,
          credit: ppvReversalVal > 0 ? ppvReversalVal : 0,
          item_id: receiptLine.item_id,
          warehouse_id: receiptLine.warehouse_id,
          quantity: qty,
          unit_cost: Math.abs(ppvReversalVal / qty),
          reference_type: "PURCHASE_RECEIPT",
          reference_id: receiptLine.purchase_receipt_id,
          description: `Reversal of Purchase Price Variance line ${purchaseReceiptLineId}`,
        });
      }

      GLValidationService.validateBalanced(reversalGlLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: new Date().toISOString().split("T")[0],
        source: "PURCHASE",
        journal_type: "PURCHASE_RECEIPT",
        reference: `REV-${purchaseReceiptLineId.substring(0, 8)}`,
        source_id: receiptLine.purchase_receipt_id,
        description: `Financial reversal entry for deleted receipt item: ${purchaseReceiptLineId}`,
        lines: reversalGlLines,
      });

      // 7. Nullify the inventory layer balance tracking record
      await client.query(
        `UPDATE inventory_ledger_entries SET remaining_quantity = 0, status = 'CLOSED' WHERE reference_line_id = $1`,
        [purchaseReceiptLineId],
      );

      // 8. Soft-delete the document line row
      await client.query(
        `UPDATE purchase_receipt_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
        [purchaseReceiptLineId],
      );

      // 9. Synchronize Global Purchase Order Status Pipeline State
      const poFetch = await client.query(
        `SELECT purchase_order_id FROM purchase_receipts WHERE id = $1`,
        [receiptLine.purchase_receipt_id],
      );

      if (poFetch.rows.length) {
        await client.query(
          `
          UPDATE purchase_orders po
          SET status = CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM purchase_order_lines pol
              WHERE pol.purchase_order_id = po.id
                AND COALESCE(pol.received_quantity, 0) < COALESCE(pol.quantity, 0)
                AND COALESCE(pol.is_deleted, false) = false
            ) THEN 'received'::purchase_order_status_enum
            WHEN EXISTS (
              SELECT 1 FROM purchase_order_lines pol
              WHERE pol.purchase_order_id = po.id AND COALESCE(pol.received_quantity, 0) > 0
            ) THEN 'partial_received'::purchase_order_status_enum
            ELSE 'open'::purchase_order_status_enum
          END,
          updated_at = NOW()
          WHERE po.id = $1
          `,
          [poFetch.rows[0].purchase_order_id],
        );
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

// 4. Insert into core Inventory Ledger Engine (Inbound Layer Setup)
// await client.query(
//   `
//   INSERT INTO inventory_ledger_entries (
//     company_id, posting_date, transaction_type,
//     reference_type, reference_id, reference_line_id,
//     item_id, warehouse_id, location_id, bin_code,
//     batch_no, serial_no, expiry_date,
//     quantity, remaining_quantity, unit_cost, total_cost,
//     direction, status
//   )
//   VALUES ($1, $2, 'PURCHASE_RECEIPT', 'PURCHASE_RECEIPT', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $14, 'IN', 'OPEN')
//   `,
//   [
//     companyId,
//     receipt.posting_date,
//     receipt.id,
//     receiptLine.id,
//     line.item_id,
//     line.warehouse_id,
//     line.location_id || null,
//     line.bin_code || null,
//     line.batch_no || null,
//     line.serial_no || null,
//     line.expiry_date || null,
//     qtyReceived,
//     unitCost,
//     totalCost,
//   ],
// );

// 6. Handle Reservations Management (Consume Active Allocations)
/* if (line.purchase_order_line_id) {
        const reservationResult = await client.query(
          `
          SELECT id, reserved_quantity, consumed_quantity 
          FROM inventory_reservations 
          WHERE reference_id = $1 AND status IN ('OPEN', 'PARTIAL') 
          ORDER BY created_at ASC 
          FOR UPDATE
          `,
          [line.purchase_order_line_id],
        );

        let remainingToConsume = qtyReceived;

        for (const reservation of reservationResult.rows) {
          if (remainingToConsume <= 0) break;

          const currentConsumed = Number(reservation.consumed_quantity || 0);
          const availableToConsume =
            Number(reservation.reserved_quantity) - currentConsumed;

          if (availableToConsume <= 0) continue;

          const consumeQty = Math.min(availableToConsume, remainingToConsume);
          const nextConsumedTotal = Number(
            (currentConsumed + consumeQty).toFixed(6),
          );
          const isFullyConsumed =
            nextConsumedTotal >=
            Number(Number(reservation.reserved_quantity).toFixed(6));
          const nextStatus = isFullyConsumed ? "CONSUMED" : "PARTIAL";

          await client.query(
            `
            UPDATE inventory_reservations
            SET consumed_quantity = $1, status = $2, updated_at = NOW()
            WHERE id = $3
            `,
            [nextConsumedTotal, nextStatus, reservation.id],
          );

          remainingToConsume = Number(
            (remainingToConsume - consumeQty).toFixed(6),
          );
        }
      }

      // 7. Update Parent Purchase Order Document Line Metrics
      if (line.purchase_order_line_id) {
        await client.query(
          `
          UPDATE purchase_order_lines 
          SET received_quantity = COALESCE(received_quantity, 0) + $1, updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReceived, line.purchase_order_line_id],
        );
      } */

/* // 8. Build Financial Accounting Ledger Vectors
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      ); */

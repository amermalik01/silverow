// lib/services/debit-notes/stock-deallocation.service.ts

import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { StockDeAllocationPayload } from "@/types/debit-note"; // "@/types/stock-deallocation";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

export class StockDeAllocationService {
  /**
   * Standalone dispatch entry point (Creates and manages its own client connection)
   */
  static async create(companyId: string, payload: StockDeAllocationPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dispatch = await this.createTransactional(
        client,
        companyId,
        payload,
      );
      await client.query("COMMIT");
      return dispatch;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transactional creation engine designed to be combined safely with other services
   */
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: StockDeAllocationPayload,
  ) {
    const dispatchResult = await client.query(
      `
      INSERT INTO stock_dispatches (
        company_id,
        debit_note_id,
        vendor_id,
        dispatch_date,
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
        payload.dispatch.debit_note_id,
        payload.dispatch.vendor_id,
        payload.dispatch.dispatch_date,
        payload.dispatch.posting_date,
        payload.dispatch.reference_no || null,
        payload.dispatch.notes || null,
      ],
    );

    const dispatch = dispatchResult.rows[0];
    const glLines: JournalLineInput[] = [];

    for (const line of payload.lines) {
      if (!line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for item ${line.item_id}`,
        );
      }

      const qtyReturned = Number(line.quantity);
      if (qtyReturned <= 0) {
        throw new Error("Dispatch quantity must be greater than zero");
      }

      // 1. Prevent over-dispatching on Debit Note lines
      if (line.debit_note_line_id) {
        const dnLineResult = await client.query(
          `
          SELECT quantity, returned_quantity 
          FROM debit_note_lines 
          WHERE id = $1 FOR UPDATE
          `,
          [line.debit_note_line_id],
        );

        if (!dnLineResult.rows.length) {
          throw new Error(
            `Debit Note line ${line.debit_note_line_id} not found`,
          );
        }

        const dnLine = dnLineResult.rows[0];
        const remainingAllowed =
          Number(dnLine.quantity) - Number(dnLine.returned_quantity || 0);

        if (qtyReturned > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Dispatch quantity (${qtyReturned}) exceeds remaining open line quantity (${remainingAllowed})`,
          );
        }
      }

      // 2. Save Stock Dispatch Line Row
      const unitCost = Number(line.unit_cost || 0);
      const totalCost = Number((qtyReturned * unitCost).toFixed(2));

      const lineResult = await client.query(
        `
        INSERT INTO stock_dispatch_lines (
          company_id, stock_dispatch_id, debit_note_line_id,
          line_no, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, expiry_date,
          quantity, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        `,
        [
          companyId,
          dispatch.id,
          line.debit_note_line_id || null,
          line.line_no,
          line.item_id,
          line.warehouse_id,
          line.location_id || null,
          line.bin_code || null,
          line.batch_no || null,
          line.serial_no || null,
          line.expiry_date || null,
          qtyReturned,
          unitCost,
          totalCost,
        ],
      );

      const dispatchLine = lineResult.rows[0];

      // 3. Process Outbound Stock Movement in Inventory Engine
      const { outboundEntry, totalCost: inventoryValueDeducted } =
        await UnifiedInventoryEngineService.processOutboundStock(
          client,
          companyId,
          dispatch.posting_date,
          "DEBIT_NOTE_RETURN",
          {
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            location_id: line.location_id,
            bin_code: line.bin_code,
            batch_no: line.batch_no,
            serial_no: line.serial_no,
            expiry_date: line.expiry_date,
            quantity: qtyReturned,
            unit_cost: unitCost,
            reference_type: "STOCK_DISPATCH",
            reference_id: dispatch.id,
            reference_line_id: dispatchLine.id,
          },
        );

      // 4. Update Debit Note Line Returned Quantities
      if (line.debit_note_line_id) {
        await client.query(
          `
          UPDATE debit_note_lines 
          SET returned_quantity = COALESCE(returned_quantity, 0) + $1, updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReturned, line.debit_note_line_id],
        );
      }

      // 5. Build General Ledger Posting Entries
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      if (inventorySystem === "PERPETUAL") {
        // DR - GRNI Liability (Clears accrued GRNI liability)
        glLines.push({
          account_id: accounts.grni_account_id,
          debit: totalCost,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: unitCost,
          reference_type: "STOCK_DISPATCH",
          reference_id: dispatch.id,
          description: `GRNI clearing for return item ${line.item_id}`,
        });

        // CR - Inventory Asset (Reduces physical inventory value)
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: 0,
          credit: inventoryValueDeducted,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: Number(outboundEntry.unit_cost),
          reference_type: "STOCK_DISPATCH",
          reference_id: dispatch.id,
          description: `Asset return deduction for item ${line.item_id}`,
        });
      }
    }

    // 6. Validate GL Balance & Post Journal
    GLValidationService.validateBalanced(glLines);

    await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: dispatch.posting_date,
      source: "PURCHASE",
      journal_type: "DEBIT_NOTE_DISPATCH",
      reference: dispatch.dispatch_no,
      source_id: dispatch.id,
      description: `Posted stock dispatch return document: ${dispatch.dispatch_no}`,
      lines: glLines,
    });

    // 7. Mark Dispatch as Posted
    await client.query(
      `
      UPDATE stock_dispatches 
      SET is_posted = true, posted_at = NOW() 
      WHERE id = $1
      `,
      [dispatch.id],
    );

    // 8. Update Debit Note Workflow Status
    await client.query(
      `
      UPDATE debit_notes dn
      SET status = CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM debit_note_lines dnl
          WHERE dnl.debit_note_id = dn.id
            AND COALESCE(dnl.returned_quantity, 0) < COALESCE(dnl.quantity, 0)
            AND COALESCE(dnl.is_deleted, false) = false
        ) THEN 'dispatched'::debit_note_status_enum
        ELSE 'partial_dispatched'::debit_note_status_enum
      END,
      is_dispatched = true,
      dispatched_at = NOW(),
      updated_at = NOW()
      WHERE dn.id = $1
      `,
      [payload.dispatch.debit_note_id],
    );

    return dispatch;
  }
}

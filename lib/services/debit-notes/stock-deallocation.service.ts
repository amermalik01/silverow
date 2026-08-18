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
    // 1. Generate Dispatch Document Number if not supplied
    const dispatchNoRes = await client.query(
      `SELECT 'DSP-' || LPAD(NEXTVAL('stock_dispatch_no_seq')::text, 6, '0') AS dispatch_no`,
    );
    const dispatchNo =
      payload.dispatch.dispatch_no || dispatchNoRes.rows[0]?.dispatch_no;

    // 2. Insert Stock Dispatch Header
    const dispatchResult = await client.query(
      `
      INSERT INTO stock_dispatches (
        company_id,
        dispatch_no,
        debit_note_id,
        vendor_id,
        warehouse_id,
        dispatch_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN', false)
      RETURNING *
      `,
      [
        companyId,
        dispatchNo,
        payload.dispatch.debit_note_id,
        payload.dispatch.vendor_id,
        payload.dispatch.warehouse_id || null,
        payload.dispatch.dispatch_date,
        payload.dispatch.posting_date,
        payload.dispatch.reference_no || null,
        payload.dispatch.notes || null,
      ],
    );

    const dispatch = dispatchResult.rows[0];
    const glLines: JournalLineInput[] = [];

    // Fetch Inventory System mode setting
    const companyRes = await client.query(
      `SELECT inventory_system FROM companies WHERE id = $1`,
      [companyId],
    );
    const inventorySystem = companyRes.rows[0]?.inventory_system || "PERIODIC";

    for (const line of payload.lines) {
      if (line.item_id && !line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for item ${line.item_id}`,
        );
      }

      const qtyReturned = Number(line.quantity);
      if (qtyReturned <= 0) {
        throw new Error("Dispatch quantity must be greater than zero");
      }

      // 3. Validate against Debit Note line quantities
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

      const unitCost = Number(line.unit_cost || 0);
      const lineTotalCost = Number((qtyReturned * unitCost).toFixed(2));

      // 4. Save Dispatch Line Record
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
          lineTotalCost,
        ],
      );

      const dispatchLine = lineResult.rows[0];

      // 5. Execute Inventory Outbound Movement
      let actualCostDeducted = lineTotalCost;
      let outboundUnitCost = unitCost;

      // let inventoryValueDeducted = lineTotalCost;
      // let outboundEntryUnitCost = unitCost;

      if (line.item_id && line.warehouse_id) {
        const outboundRes =
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

        actualCostDeducted = Number(outboundRes.totalCost);
        outboundUnitCost = Number(outboundRes.unitCost);

        // inventoryValueDeducted = Number(outboundRes.totalCost);
        // outboundEntryUnitCost = Number(outboundRes.outboundEntry.unit_cost);
      }

      // 6. Update Debit Note Line Executed Quantities
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

      // 7. Balance & Generate GL Journal Lines (Perpetual Inventory Mode)
      if (inventorySystem === "PERPETUAL") {
        const accounts = await AccountResolutionService.resolvePurchaseAccounts(
          client,
          companyId,
          line.item_id,
        );

        const varianceAmount = Number(
          (actualCostDeducted - lineTotalCost).toFixed(2),
        );

        // DR - GRNI Liability (Clears accrued GRNI liability)
        glLines.push({
          account_id: accounts.grni_account_id,
          debit: lineTotalCost,
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
          credit: actualCostDeducted,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: outboundUnitCost,
          reference_type: "STOCK_DISPATCH",
          reference_id: dispatch.id,
          description: `Asset return deduction for item ${line.item_id}`,
        });

        // Balancing Entry: Inventory Purchase Variance Account (if layer cost differs from DN cost)
        if (Math.abs(varianceAmount) > 0) {
          const varianceAccountId =
            accounts.purchase_price_variance_account_id ||
            accounts.purchase_account_id;

          if (!varianceAccountId) {
            throw new Error(
              `Purchase variance/purchase GL account is missing for item ${line.item_id}.`,
            );
          }

          glLines.push({
            account_id: varianceAccountId,
            debit: varianceAmount > 0 ? varianceAmount : 0,
            credit: varianceAmount < 0 ? Math.abs(varianceAmount) : 0,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: 0,
            unit_cost: 0,
            reference_type: "STOCK_DISPATCH",
            reference_id: dispatch.id,
            description: `Inventory cost variance adjustment for item ${line.item_id}`,
          });
        }
      }
    }

    // 8. Post GL Journal Entry
    if (glLines.length > 0) {
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
    }

    // 9. Mark Dispatch Document Posted
    await client.query(
      `
      UPDATE stock_dispatches 
      SET is_posted = true, posted_at = NOW(), status = 'POSTED'
      WHERE id = $1
      `,
      [dispatch.id],
    );

    // 10. Sync Parent Debit Note Status safely using valid ENUM types
    await client.query(
      `
      UPDATE debit_notes dn
      SET status = CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM debit_note_lines dnl
          WHERE dnl.debit_note_id = dn.id
            AND COALESCE(dnl.returned_quantity, 0) < COALESCE(dnl.quantity, 0)
            AND COALESCE(dnl.is_deleted, false) = false
        ) THEN 'closed'::debit_note_status_enum
        ELSE 'posted'::debit_note_status_enum
      END,
      updated_at = NOW()
      WHERE dn.id = $1
      `,
      [payload.dispatch.debit_note_id],
    );

    return dispatch;
  }

  /**
   * Safely reverses stock dispatch lines, releases allocations, posts GL reversal entries,
   * decrements debit note returned quantities, and soft-deletes the dispatch line.
   */
  static async safeDeleteDispatchLine(
    companyId: string,
    stockDispatchLineId: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch current active dispatch line with Row Lock
      const lineRes = await client.query(
        `SELECT * FROM stock_dispatch_lines WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [stockDispatchLineId, companyId],
      );
      if (!lineRes.rows.length) {
        throw new Error("Dispatch line record not found.");
      }
      const dispatchLine = lineRes.rows[0];

      // Fetch parent header details
      const dispatchRes = await client.query(
        `SELECT * FROM stock_dispatches WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [dispatchLine.stock_dispatch_id, companyId],
      );
      if (!dispatchRes.rows.length) {
        throw new Error("Parent stock dispatch record not found.");
      }
      const dispatch = dispatchRes.rows[0];

      // 2. Fetch inventory layer entries generated by this outbound dispatch
      const layerRes = await client.query(
        `SELECT id, quantity, unit_cost, total_cost 
       FROM inventory_ledger_entries 
       WHERE reference_line_id = $1 AND reference_type = 'STOCK_DISPATCH' FOR UPDATE`,
        [stockDispatchLineId],
      );

      let actualCostDeducted = Number(dispatchLine.total_cost);
      let outboundUnitCost = Number(dispatchLine.unit_cost);

      if (layerRes.rows.length) {
        const layer = layerRes.rows[0];
        actualCostDeducted = Math.abs(Number(layer.total_cost));
        outboundUnitCost = Number(layer.unit_cost);
      }

      // 3. Remove inventory allocations created by this outbound movement
      await client.query(
        `DELETE FROM inventory_allocations 
       WHERE outbound_entry_id = (
         SELECT id FROM inventory_ledger_entries WHERE reference_line_id = $1 AND reference_type = 'STOCK_DISPATCH'
       )`,
        [stockDispatchLineId],
      );

      // 4. Reverse Debit Note Line executed returned quantities
      if (dispatchLine.debit_note_line_id) {
        await client.query(
          `UPDATE debit_note_lines 
         SET returned_quantity = GREATEST(0, COALESCE(returned_quantity, 0) - $1), 
             updated_at = NOW()
         WHERE id = $2`,
          [Number(dispatchLine.quantity), dispatchLine.debit_note_line_id],
        );
      }

      // 5. Generate Financial Reversal Entries (Perpetual Inventory Mode)
      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      if (inventorySystem === "PERPETUAL") {
        const accounts = await AccountResolutionService.resolvePurchaseAccounts(
          client,
          companyId,
          dispatchLine.item_id,
        );

        const qty = Number(dispatchLine.quantity);
        const lineTotalCost = Number(dispatchLine.total_cost);
        const varianceAmount = Number(
          (actualCostDeducted - lineTotalCost).toFixed(2),
        );

        const reversalGlLines: JournalLineInput[] = [
          // Reverse Credit to Inventory Asset -> DR Inventory Asset
          {
            account_id: accounts.inventory_account_id,
            debit: actualCostDeducted,
            credit: 0,
            item_id: dispatchLine.item_id,
            warehouse_id: dispatchLine.warehouse_id,
            quantity: qty,
            unit_cost: outboundUnitCost,
            reference_type: "STOCK_DISPATCH",
            reference_id: dispatch.id,
            description: `Reversal of inventory asset deduction for line ${stockDispatchLineId}`,
          },
          // Reverse Debit to GRNI -> CR GRNI Account
          {
            account_id: accounts.grni_account_id,
            debit: 0,
            credit: lineTotalCost,
            item_id: dispatchLine.item_id,
            warehouse_id: dispatchLine.warehouse_id,
            quantity: qty,
            unit_cost: Number(dispatchLine.unit_cost),
            reference_type: "STOCK_DISPATCH",
            reference_id: dispatch.id,
            description: `Reversal of GRNI clearing for line ${stockDispatchLineId}`,
          },
        ];

        // Reverse Purchase Variance Entry if original posting included cost variance
        if (Math.abs(varianceAmount) > 0) {
          const varianceAccountId =
            accounts.purchase_price_variance_account_id ||
            accounts.purchase_account_id;

          if (!varianceAccountId) {
            throw new Error(
              `Purchase variance/purchase GL account is missing for item ${dispatchLine.item_id}.`,
            );
          }

          reversalGlLines.push({
            account_id: varianceAccountId,
            debit: varianceAmount < 0 ? Math.abs(varianceAmount) : 0,
            credit: varianceAmount > 0 ? varianceAmount : 0,
            item_id: dispatchLine.item_id,
            warehouse_id: dispatchLine.warehouse_id,
            quantity: 0,
            unit_cost: 0,
            reference_type: "STOCK_DISPATCH",
            reference_id: dispatch.id,
            description: `Reversal of cost variance adjustment for line ${stockDispatchLineId}`,
          });
        }

        GLValidationService.validateBalanced(reversalGlLines);

        await GLPostingService.postJournal(client, {
          company_id: companyId,
          entry_date: new Date().toISOString().split("T")[0],
          source: "PURCHASE",
          journal_type: "DEBIT_NOTE_DISPATCH",
          reference: `REV-${dispatchLine.id.substring(0, 8)}`,
          source_id: dispatch.id,
          description: `Financial reversal entry for deleted dispatch line: ${stockDispatchLineId}`,
          lines: reversalGlLines,
        });
      }

      // 6. Close/Soft-delete inventory ledger entry for this dispatch line
      await client.query(
        `UPDATE inventory_ledger_entries 
       SET remaining_quantity = 0, status = 'CLOSED' 
       WHERE reference_line_id = $1 AND reference_type = 'STOCK_DISPATCH'`,
        [stockDispatchLineId],
      );

      // 7. Soft-delete dispatch line
      await client.query(
        `UPDATE stock_dispatch_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
        [stockDispatchLineId],
      );

      // 8. Synchronize Parent Debit Note Status Pipeline State
      if (dispatch.debit_note_id) {
        await client.query(
          `
        UPDATE debit_notes dn
        SET status = CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM debit_note_lines dnl
            WHERE dnl.debit_note_id = dn.id
              AND COALESCE(dnl.returned_quantity, 0) < COALESCE(dnl.quantity, 0)
              AND COALESCE(dnl.is_deleted, false) = false
          ) THEN 'closed'::debit_note_status_enum
          WHEN EXISTS (
            SELECT 1 FROM debit_note_lines dnl
            WHERE dnl.debit_note_id = dn.id AND COALESCE(dnl.returned_quantity, 0) > 0
          ) THEN 'posted'::debit_note_status_enum
          ELSE 'open'::debit_note_status_enum
        END,
        updated_at = NOW()
        WHERE dn.id = $1
        `,
          [dispatch.debit_note_id],
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
/* for (const line of payload.lines) {
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
    } */

// lib/services/sales/sales-return-receipt.service.ts
// lib/services/sales/sales-return-receipt.service.ts

import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { SalesReturnReceiptPayload } from "@/types/sales-return-receipt";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

export class SalesReturnReceiptService {
  /**
   * Standalone sales return receipt entry point
   */
  static async create(companyId: string, payload: SalesReturnReceiptPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const receipt = await this.createTransactional(client, companyId, payload);
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
   * Transactional creation engine reusing unified stock_dispatches & stock_dispatch_lines tables
   */
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: SalesReturnReceiptPayload
  ) {
    // 1. Generate Return Receipt Sequence Number (e.g. SRR-000001)
    const receiptNoRes = await client.query(
      `SELECT 'SRR-' || LPAD(NEXTVAL('sales_return_receipt_no_seq')::text, 6, '0') AS receipt_no`
    );
    const receiptNo =
      payload.receipt.reference_no || receiptNoRes.rows[0]?.receipt_no;

    // 2. Insert into unified stock_dispatches table (acting as Return Receipt document)
    const receiptResult = await client.query(
      `
      INSERT INTO stock_dispatches (
        company_id,
        dispatch_no,
        credit_note_id,
        customer_id,
        warehouse_id,
        dispatch_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN', false, $10)
      RETURNING *
      `,
      [
        companyId,
        receiptNo,
        payload.receipt.credit_note_id || null,
        payload.receipt.customer_id || null,
        null, // payload.receipt.warehouse_id || 
        payload.receipt.receipt_date,
        payload.receipt.posting_date,
        payload.receipt.reference_no || null,
        payload.receipt.notes || null,
        payload.receipt.userId || null,
      ]
    );

    const receipt = receiptResult.rows[0];
    const currencyId = payload.receipt.currency_id;
    const exchangeRate = payload.receipt.exchange_rate;
    const userId = payload.receipt.userId;

    const glLines: JournalLineInput[] = [];

    // Fetch Inventory System mode (PERPETUAL vs PERIODIC)
    const companyRes = await client.query(
      `SELECT inventory_system FROM companies WHERE id = $1`,
      [companyId]
    );
    const inventorySystem = companyRes.rows[0]?.inventory_system || "PERIODIC";

    for (const line of payload.lines) {
      if (line.item_id && !line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for returning item ${line.item_id}`
        );
      }

      const qtyReturned = Number(line.quantity);
      if (qtyReturned <= 0) {
        throw new Error("Return receipt quantity must be greater than zero");
      }

      // 3. Validate line open capacity against parent Credit Note Line
      if (line.credit_note_line_id) {
        const cnLineResult = await client.query(
          `
          SELECT quantity, returned_quantity, cancelled_quantity
          FROM credit_note_lines
          WHERE id = $1 FOR UPDATE
          `,
          [line.credit_note_line_id]
        );

        if (!cnLineResult.rows.length) {
          throw new Error(
            `Credit Note line ${line.credit_note_line_id} not found`
          );
        }

        const cnLine = cnLineResult.rows[0];
        const remainingAllowed =
          Number(cnLine.quantity) -
          Number(cnLine.returned_quantity || 0) -
          Number(cnLine.cancelled_quantity || 0);

        if (qtyReturned > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Return quantity (${qtyReturned}) exceeds remaining open line quantity (${remainingAllowed})`
          );
        }
      }

      const unitCost = Number(line.unit_cost || 0);
      const totalCost = Number((qtyReturned * unitCost).toFixed(2));

      // 4. Save into unified stock_dispatch_lines table
      const lineResult = await client.query(
        `
        INSERT INTO stock_dispatch_lines (
          company_id, 
          stock_dispatch_id, 
          credit_note_line_id,
          line_no, 
          item_id, 
          warehouse_id, 
          location_id, 
          bin_code,
          batch_no, 
          serial_no, 
          expiry_date, 
          quantity, 
          unit_cost, 
          total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        `,
        [
          companyId,
          receipt.id,
          line.credit_note_line_id || null,
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
        ]
      );

      const receiptLine = lineResult.rows[0];

      // 5. Post physical inbound stock receipt via Inventory Engine
      let inventoryValueToCapitalize = totalCost;
      let ledgerEntryUnitCost = unitCost;

      if (line.item_id && line.warehouse_id) {
        const inboundRes =
          await UnifiedInventoryEngineService.processInboundStock(
            client,
            companyId,
            receipt.posting_date,
            "CREDIT_NOTE_RETURN",
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
              reference_type: "SALES_RETURN",
              reference_id: receipt.id,
              reference_line_id: receiptLine.id,
            }
          );

        inventoryValueToCapitalize = Number(inboundRes.ledgerEntry.total_cost);
        ledgerEntryUnitCost = Number(inboundRes.ledgerEntry.unit_cost);
      }

      // 6. Update Credit Note Line returned quantity metrics
      if (line.credit_note_line_id) {
        await client.query(
          `
          UPDATE credit_note_lines
          SET returned_quantity = COALESCE(returned_quantity, 0) + $1, 
              updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReturned, line.credit_note_line_id]
        );
      }

      // 7. Build GL Postings for Return Receipt (PERPETUAL Mode)
      if (inventorySystem === "PERPETUAL") {
        const accounts = await AccountResolutionService.resolveSalesAccounts(
          client,
          companyId,
          line.item_id
        );

        // DR - Inventory Asset (Increases Asset)
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: inventoryValueToCapitalize,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: ledgerEntryUnitCost,
          reference_type: "SALES_RETURN",
          reference_id: receipt.id,
          description: `Stock return asset restoration for item ${line.item_id}`,
        });

        // CR - COGS (Reduces Cost of Goods Sold)
        const cogsAccountId = accounts.cogs_account_id;

        if (!cogsAccountId) {
          throw new Error(
            `COGS GL account configuration missing for item ${line.item_id}`
          );
        }

        glLines.push({
          account_id: cogsAccountId,
          debit: 0,
          credit: inventoryValueToCapitalize,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: ledgerEntryUnitCost,
          reference_type: "SALES_RETURN",
          reference_id: receipt.id,
          description: `COGS adjustment for returned item ${line.item_id}`,
        });
      }
    }

    // 8. Validate GL Balance & Post Journal Entry
    if (glLines.length > 0) {
      GLValidationService.validateBalanced(glLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: receipt.posting_date,
        source: "SALES",
        journal_type: "SALES_RETURN",
        reference: receiptNo,
        source_id: receipt.id,
        description: `Posted sales return receipt document: ${receiptNo}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });
    }

    // 9. Mark status as posted in stock_dispatches
    await client.query(
      `
      UPDATE stock_dispatches
      SET is_posted = true, posted_at = NOW(), status = 'POSTED'
      WHERE id = $1
      `,
      [receipt.id]
    );

    return receipt;
  }
}

/* import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { SalesReturnReceiptPayload } from "@/types/sales-return-receipt";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";

export class SalesReturnReceiptService {
 
  static async create(companyId: string, payload: SalesReturnReceiptPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const receipt = await this.createTransactional(client, companyId, payload);
      await client.query("COMMIT");
      return receipt;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: SalesReturnReceiptPayload,
  ) {
    // 1. Create Return Receipt Header
    const receiptResult = await client.query(
      `
      INSERT INTO sales_return_receipts (
        company_id,
        credit_note_id,
        customer_id,
        receipt_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', false, $8)
      RETURNING *
      `,
      [
        companyId,
        payload.receipt.credit_note_id,
        payload.receipt.customer_id || null,
        payload.receipt.receipt_date,
        payload.receipt.posting_date,
        payload.receipt.reference_no || null,
        payload.receipt.notes || null,
        payload.receipt.userId || null,
      ],
    );

    const receipt = receiptResult.rows[0];
    const currencyId = payload.receipt.currency_id;
    const exchangeRate = payload.receipt.exchange_rate;
    const userId = payload.receipt.userId;

    const glLines: JournalLineInput[] = [];

    // Fetch Inventory System mode (PERPETUAL vs PERIODIC)
    const companyRes = await client.query(
      `SELECT inventory_system FROM companies WHERE id = $1`,
      [companyId],
    );
    const inventorySystem = companyRes.rows[0]?.inventory_system || "PERIODIC";

    for (const line of payload.lines) {
      if (line.item_id && !line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for returning item ${line.item_id}`,
        );
      }

      const qtyReturned = Number(line.quantity);
      if (qtyReturned <= 0) {
        throw new Error("Return receipt quantity must be greater than zero");
      }

      // 2. Validate line capacity against parent Credit Note Line
      if (line.credit_note_line_id) {
        const cnLineResult = await client.query(
          `
          SELECT quantity, returned_quantity, cancelled_quantity
          FROM credit_note_lines
          WHERE id = $1 FOR UPDATE
          `,
          [line.credit_note_line_id],
        );

        if (!cnLineResult.rows.length) {
          throw new Error(
            `Credit Note line ${line.credit_note_line_id} not found`,
          );
        }

        const cnLine = cnLineResult.rows[0];
        const remainingAllowed =
          Number(cnLine.quantity) -
          Number(cnLine.returned_quantity || 0) -
          Number(cnLine.cancelled_quantity || 0);

        if (qtyReturned > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Return quantity (${qtyReturned}) exceeds remaining open line quantity (${remainingAllowed})`,
          );
        }
      }

      const unitCost = Number(line.unit_cost);
      const totalCost = Number((qtyReturned * unitCost).toFixed(2));

      // 3. Save Return Receipt Line Row
      const lineResult = await client.query(
        `
        INSERT INTO sales_return_receipt_lines (
          company_id, sales_return_receipt_id, credit_note_line_id,
          line_no, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, expiry_date, quantity, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        `,
        [
          companyId,
          receipt.id,
          line.credit_note_line_id || null,
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

      const receiptLine = lineResult.rows[0];

      // 4. Delegate physical stock receipt back to Inventory Engine
      let inventoryValueToCapitalize = totalCost;
      let ledgerEntryUnitCost = unitCost;

      if (line.item_id && line.warehouse_id) {
        const inboundRes =
          await UnifiedInventoryEngineService.processInboundStock(
            client,
            companyId,
            receipt.posting_date,
            "CREDIT_NOTE_RETURN",
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
              reference_type: "SALES_RETURN",
              reference_id: receipt.id,
              reference_line_id: receiptLine.id,
            },
          );

        inventoryValueToCapitalize = Number(inboundRes.ledgerEntry.total_cost);
        ledgerEntryUnitCost = Number(inboundRes.ledgerEntry.unit_cost);
      }

      // 5. Update Credit Note Line returned quantity metrics
      if (line.credit_note_line_id) {
        await client.query(
          `
          UPDATE credit_note_lines
          SET returned_quantity = COALESCE(returned_quantity, 0) + $1, updated_at = NOW()
          WHERE id = $2
          `,
          [qtyReturned, line.credit_note_line_id],
        );
      }

      // 6. Build General Ledger Postings (PERPETUAL Mode Only)
      if (inventorySystem === "PERPETUAL") {
        const accounts = await AccountResolutionService.resolveSalesAccounts(
          client,
          companyId,
          line.item_id,
        );

        // DR - Inventory Asset (Restoring inventory layer value)
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: inventoryValueToCapitalize,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: ledgerEntryUnitCost,
          reference_type: "SALES_RETURN",
          reference_id: receipt.id,
          description: `Stock return asset restoration for item ${line.item_id}`,
        });

        // CR - COGS / Stock Returns Clearing Account
        const cogsOrReturnAccountId =
          accounts.cogs_account_id || accounts.sales_account_id;//|| accounts.sales_return_account_id;

        if (!cogsOrReturnAccountId) {
          throw new Error(
            `COGS/Sales Return GL account configuration missing for item ${line.item_id}`,
          );
        }

        glLines.push({
          account_id: cogsOrReturnAccountId,
          debit: 0,
          credit: inventoryValueToCapitalize,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyReturned,
          unit_cost: ledgerEntryUnitCost,
          reference_type: "SALES_RETURN",
          reference_id: receipt.id,
          description: `COGS adjustment for returned item ${line.item_id}`,
        });
      }
    }

    // 7. Validate GL Balance & Post Journal Entry
    if (glLines.length > 0) {
      GLValidationService.validateBalanced(glLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: receipt.posting_date,
        source: "SALES",
        journal_type: "SALES_RETURN",
        reference: receipt.receipt_no || `SRR-${receipt.id.substring(0, 8)}`,
        source_id: receipt.id,
        description: `Posted sales return receipt: ${
          receipt.receipt_no || receipt.id
        }`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });
    }

    // 8. Seal Status
    await client.query(
      `
      UPDATE sales_return_receipts
      SET is_posted = true, posted_at = NOW()
      WHERE id = $1
      `,
      [receipt.id],
    );

    return receipt;
  }
} */
//  lib/services/sales-invoices/sales-invoice.service.ts
import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";

export class SalesInvoiceService {
  /**
   * =========================================================
   * GET AR ACCOUNT
   * =========================================================
   */
  private static async getReceivableAccount(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const result = await client.query(
      `
      SELECT receivable_account_id
      FROM sales_posting_groups
      WHERE company_id = $1
      LIMIT 1
      `,
      [companyId],
    );

    if (!result.rows.length) {
      throw new Error("Sales posting group not configured");
    }

    return result.rows[0].receivable_account_id;
  }
  /**
   * =========================================================
   * POST SALES INVOICE
   * =========================================================
   */
  static async postInvoice(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
    userId?: string,
  ): Promise<void> {
    /**
     * -----------------------------------------------------
     * LOAD INVOICE HEADER
     * -----------------------------------------------------
     */
    const invoiceResult = await client.query(
      `
      SELECT *
      FROM sales_invoices
      WHERE id = $1
      `,
      [invoiceId],
    );

    if (!invoiceResult.rows.length) {
      throw new Error("Sales invoice not found");
    }

    const invoice = invoiceResult.rows[0];
    /**
     * -----------------------------------------------------
     * PREVENT DOUBLE POSTING
     * -----------------------------------------------------
     */
    if (invoice.is_posted) {
      throw new Error("Sales invoice already posted");
    }

    /**
     * -----------------------------------------------------
     * LOAD INVOICE LINES
     * -----------------------------------------------------
     */
    const linesResult = await client.query(
      `
      SELECT *
      FROM sales_invoice_lines
      WHERE sales_invoice_id = $1
      ORDER BY line_no ASC
      `,
      [invoiceId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No sales invoice lines found");
    }

    /**
     * -----------------------------------------------------
     * GET AR ACCOUNT
     * -----------------------------------------------------
     */
    await this.getReceivableAccount(
      client,
      companyId,
    );

    /**
     * -----------------------------------------------------
     * BUILD GL LINES
     * -----------------------------------------------------
     */
    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      /**
       * RESOLVE ACCOUNTS
       */
      const accounts = await AccountResolutionService.resolveSalesAccounts(
        client,
        companyId,
        line.item_id,
      );

      const baseAmount =
        Number(line.quantity || 0) * Number(line.unit_price || 0);

      const vatAmount = Number(line.vat_amount || 0);

      const totalAmount = baseAmount + vatAmount;

      /**
       * -----------------------------------------------------
       * DR: ACCOUNTS RECEIVABLE
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.receivable_account_id,

        debit: totalAmount,

        credit: 0,

        item_id: line.item_id,

        quantity: Number(line.quantity || 0),

        unit_cost: Number(line.unit_price || 0),

        reference_type: "SALES_INVOICE",

        reference_id: invoice.id,
      });

      /**
       * -----------------------------------------------------
       * CR: REVENUE
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.sales_account_id,

        debit: 0,

        credit: baseAmount,

        item_id: line.item_id,

        quantity: Number(line.quantity || 0),

        unit_cost: Number(line.unit_price || 0),

        reference_type: "SALES_INVOICE",

        reference_id: invoice.id,
      });

      /**
       * -----------------------------------------------------
       * CR: VAT OUTPUT
       * -----------------------------------------------------
       */
      if (vatAmount > 0) {
        glLines.push({
          account_id: accounts.vat_account_id,

          debit: 0,

          credit: vatAmount,

          item_id: line.item_id,

          quantity: Number(line.quantity || 0),

          unit_cost: Number(line.unit_price || 0),

          reference_type: "SALES_INVOICE",

          reference_id: invoice.id,
        });
      }
    }

    /**
     * -----------------------------------------------------
     * VALIDATION
     * -----------------------------------------------------
     */
    GLValidationService.validateBalanced(glLines);

    /**
     * -----------------------------------------------------
     * POST TO GL
     * -----------------------------------------------------
     */
    const journal = await GLPostingService.postJournal(client, {
      company_id: companyId,

      entry_date: invoice.invoice_date,

      source: "SALES",

      journal_type: "SALES_INVOICE",

      reference: invoice.invoice_no,

      source_id: invoice.id,

      // description: "Sales invoice posting",
      description: `Sales Invoice ${invoice.invoice_no}`,

      created_by: userId || null,

      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * CREATE CUSTOMER LEDGER ENTRY
     * -----------------------------------------------------
     */

    await client.query(
      `
        INSERT INTO customer_ledger_entries (
          company_id,
          customer_id,
          document_type,
          document_id,
          document_no,
          posting_date,
          description,
          original_amount,
          remaining_amount,
          currency_id,
          is_open,
          journal_entry_id
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          true,$11
        )
      `,
      [
        companyId,
        invoice.customer_id,
        "SALES_INVOICE",
        invoice.id,
        invoice.invoice_no,
        invoice.invoice_date,
        "Sales invoice",
        invoice.total_amount,
        invoice.total_amount,
        invoice.currency_id || null,
        journal.id,
      ],
    );

    /**
     * -----------------------------------------------------
     * MARK POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_invoices
      SET is_posted = true,
          posted_at = now(),
        journal_entry_id = $2,
        updated_at = now()
      WHERE id = $1
      `,
      [invoiceId, journal.id],
    );
  }

  /* static async createFromShipment(
    client: PoolClient,
    companyId: string,
    shipmentId: string,
    userId?: string,
  ) {
    try {
      await client.query("BEGIN");

      const shipmentRes = await client.query(
        `
      SELECT * FROM inventory_shipments
      WHERE id = $1
      `,
        [shipmentId],
      );

      const shipment = shipmentRes.rows[0];

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      const lineRes = await client.query(
        `
      SELECT * FROM inventory_shipment_lines
      WHERE shipment_id = $1
      `,
        [shipmentId],
      );

      const shipmentLines = lineRes.rows;

      const invoiceRes = await client.query(
        `
      INSERT INTO sales_invoices (
        company_id,
        shipment_id,
        invoice_date,
        status
      )
      VALUES ($1,$2,now(),'DRAFT')
      RETURNING *
      `,
        [companyId, shipmentId],
      );

      const invoice = invoiceRes.rows[0];

      const glLines: any[] = [];

      for (const line of shipmentLines) {
        const invoiceLine = await client.query(
          `
        INSERT INTO sales_invoice_lines (
          sales_invoice_id,
          item_id,
          quantity,
          unit_price,
          total_amount
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
        `,
          [
            invoice.id,
            line.item_id,
            line.quantity,
            line.unit_cost,
            Number(line.quantity) * Number(line.unit_cost),
          ],
        );

        const accounts = await AccountResolutionService.resolveSalesAccounts(
          client,
          companyId,
          line.item_id,
        );

        const amount = Number(line.quantity) * Number(line.unit_cost);

        // *
        //  * DR: AR (Customer Receivable)
        
        glLines.push({
          account_id: accounts.ar_account_id,
          debit: amount,
          credit: 0,
          reference_type: "SALES_INVOICE",
          reference_id: invoice.id,
        });

        // *
        //  * CR: REVENUE
        
        glLines.push({
          account_id: accounts.revenue_account_id,
          debit: 0,
          credit: amount,
          reference_type: "SALES_INVOICE",
          reference_id: invoice.id,
        });

        GLValidationService.validateBalanced(glLines);

        await GLPostingService.postJournal(client, {
          company_id: companyId,
          entry_date: new Date().toISOString().split("T")[0],
          source: "SALES",
          journal_type: "SALES_INVOICE",
          reference: invoice.invoice_no,
          source_id: invoice.id,
          description: "Sales Invoice Posting",
          created_by: userId || null,
          lines: glLines,
        });

        await client.query(
          `
      UPDATE sales_invoices
      SET status = 'POSTED'
      WHERE id = $1
      `,
          [invoice.id],
        );

        await client.query(
          `
      UPDATE inventory_shipments
      SET is_invoiced = true
      WHERE id = $1
      `,
          [shipmentId],
        );
      }

      await client.query("COMMIT");

      return invoice;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } */
}

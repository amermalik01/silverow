//  lib/services/sales-invoices/sales-invoice.service.ts
import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";

export class SalesInvoiceService {
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
     * LOAD INVOICE LINES
     * -----------------------------------------------------
     */
    const linesResult = await client.query(
      `
      SELECT *
      FROM sales_invoice_lines
      WHERE sales_invoice_id = $1
      `,
      [invoiceId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No sales invoice lines found");
    }

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
      const accounts =
        await AccountResolutionService.resolveSalesAccounts(
          client,
          companyId,
          line.item_id,
        );

      const baseAmount =
        Number(line.quantity) * Number(line.unit_price);

      const vatAmount =
        Number(line.vat_amount || 0);

      /**
       * -----------------------------------------------------
       * DR: ACCOUNTS RECEIVABLE
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.receivable_account_id,

        debit: baseAmount + vatAmount,

        credit: 0,

        item_id: line.item_id,

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
    await GLPostingService.postJournal(client, {
      company_id: companyId,

      entry_date: invoice.invoice_date,

      source: "SALES",

      journal_type: "SALES_INVOICE",

      reference: invoice.invoice_no,

      source_id: invoice.id,

      description: "Sales invoice posting",

      created_by: userId || null,

      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * MARK POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_invoices
      SET is_posted = true,
          posted_at = now()
      WHERE id = $1
      `,
      [invoiceId],
    );
  }
}
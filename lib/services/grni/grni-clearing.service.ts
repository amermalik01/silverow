// lib/services/grni/grni-clearing.service.ts
import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";

export class GRNIClearingService {
  /**
   * =========================================================
   * CLEAR GRNI FOR PURCHASE INVOICE
   * =========================================================
   */
  static async clearGRNI(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
    userId?: string,
  ): Promise<void> {
    /**
     * -----------------------------------------------------
     * LOAD INVOICE
     * -----------------------------------------------------
     */
    const invoiceResult = await client.query(
      `
      SELECT *
      FROM purchase_invoices
      WHERE id = $1
      `,
      [invoiceId],
    );

    if (!invoiceResult.rows.length) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    /**
     * -----------------------------------------------------
     * LOAD LINES
     * -----------------------------------------------------
     */
    const linesResult = await client.query(
      `
      SELECT *
      FROM purchase_invoice_lines
      WHERE purchase_invoice_id = $1
      `,
      [invoiceId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No invoice lines found");
    }

    /**
     * -----------------------------------------------------
     * BUILD GRNI CLEARING LINES
     * -----------------------------------------------------
     */
    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      const amount = Number(line.quantity) * Number(line.unit_cost);

      /**
       * -----------------------------------------------------
       * DR: GRNI (CLEAR LIABILITY)
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.grni_account_id,

        debit: amount,

        credit: 0,

        item_id: line.item_id,

        reference_type: "GRNI_CLEARING",

        reference_id: invoice.id,
      });

      /**
       * -----------------------------------------------------
       * CR: ACCOUNTS PAYABLE
       * -----------------------------------------------------
       */
      glLines.push({
        account_id: accounts.purchase_account_id,

        debit: 0,

        credit: amount,

        item_id: line.item_id,

        reference_type: "GRNI_CLEARING",

        reference_id: invoice.id,
      });
    }

    /**
     * -----------------------------------------------------
     * VALIDATE
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

      source: "PURCHASE",

      journal_type: "GRNI_CLEARING",

      reference: invoice.invoice_no,

      source_id: invoice.id,

      description: "GRNI clearing entry",

      created_by: userId || null,

      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * MARK CLEARED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE purchase_invoices
      SET grni_cleared = true,
          grni_cleared_at = now()
      WHERE id = $1
      `,
      [invoiceId],
    );
  }

  /**
   * =========================================================
   * BUILD GRNI CLEARING LINES
   * =========================================================
   */
  static async buildLines(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
  ): Promise<JournalLineInput[]> {
    /**
     * -----------------------------------------------------
     * LOAD RECEIPT LINES
     * -----------------------------------------------------
     */
    const result = await client.query(
      `
      SELECT
        pil.id,
        pil.item_id,
        pil.quantity,
        pil.unit_cost,

        ppg.grni_account_id,
        ppg.payable_account_id

      FROM purchase_invoice_lines pil

      INNER JOIN items i
        ON i.id = pil.item_id

      INNER JOIN purchase_posting_groups ppg
        ON ppg.id = i.purchase_posting_group_id

      WHERE pil.purchase_invoice_id = $1
      `,
      [invoiceId],
    );

    const lines: JournalLineInput[] = [];

    for (const row of result.rows) {
      const amount = Number(row.quantity) * Number(row.unit_cost);

      /**
       * DR GRNI
       */
      lines.push({
        account_id: row.grni_account_id,

        debit: amount,

        credit: 0,

        item_id: row.item_id,

        reference_type: "PURCHASE_INVOICE",

        reference_id: invoiceId,
      });

      /**
       * CR AP
       */
      lines.push({
        account_id: row.payable_account_id,

        debit: 0,

        credit: amount,

        item_id: row.item_id,

        reference_type: "PURCHASE_INVOICE",

        reference_id: invoiceId,
      });
    }

    return lines;
  }
}

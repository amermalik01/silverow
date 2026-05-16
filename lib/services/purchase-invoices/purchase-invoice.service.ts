// lib/services/purchase-invoices/purchase-invoice.service.ts

import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";
import { PurchaseOrderStatusService } from "../purchase-orders/purchase-order-status.service";
export class PurchaseInvoiceService {
  private static async getPayableAccount(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const result = await client.query(
      `
    SELECT payable_account_id
    FROM purchase_posting_groups
    WHERE company_id = $1
    LIMIT 1
    `,
      [companyId],
    );

    if (!result.rows.length) {
      throw new Error("Purchase posting group not configured");
    }

    return result.rows[0].payable_account_id;
  }

  /**
   * =========================================================
   * POST PURCHASE INVOICE
   * =========================================================
   */
  static async postInvoice(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
    userId?: string,
  ) {
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

    if (invoice.is_posted) {
      throw new Error("Invoice already posted");
    }

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
      ORDER BY line_no ASC
      `,
      [invoiceId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No invoice lines found");
    }

    /**
     * -----------------------------------------------------
     * BUILD GL LINES
     * -----------------------------------------------------
     */

    const payableAccountId = await this.getPayableAccount(client, companyId);
    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      /**
       * ---------------------------------------------------
       * VALIDATE RECEIVED QTY
       * ---------------------------------------------------
       */
      if (line.purchase_order_line_id) {
        const poLineResult = await client.query(
          `
          SELECT
            quantity,
            received_quantity,
            invoiced_quantity
          FROM purchase_order_lines
          WHERE id = $1
          `,
          [line.purchase_order_line_id],
        );

        if (!poLineResult.rows.length) {
          throw new Error("Purchase order line not found");
        }

        const poLine = poLineResult.rows[0];

        const receivedQty = Number(poLine.received_quantity || 0);

        const alreadyInvoiced = Number(poLine.invoiced_quantity || 0);

        const remainingToInvoice = receivedQty - alreadyInvoiced;

        if (Number(line.quantity) > remainingToInvoice) {
          throw new Error(
            `Invoice quantity exceeds received quantity for item ${line.item_id}`,
          );
        }
      }

      /**
       * ---------------------------------------------------
       * RESOLVE ACCOUNTS
       * ---------------------------------------------------
       */
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      const amount = Number(line.quantity) * Number(line.unit_cost);

      /**
       * ---------------------------------------------------
       * DR GRNI
       * ---------------------------------------------------
       */
      glLines.push({
        account_id: accounts.grni_account_id,

        debit: amount,

        credit: 0,

        item_id: line.item_id,

        quantity: Number(line.quantity),

        unit_cost: Number(line.unit_cost),

        reference_type: "PURCHASE_INVOICE",

        reference_id: invoice.id,
      });

      /**
       * ---------------------------------------------------
       * CR AP LIABILITY
       * ---------------------------------------------------
       */
      glLines.push({
        // account_id: accounts.payable_account_id,
        account_id: payableAccountId,

        debit: 0,

        credit: amount,

        item_id: line.item_id,

        quantity: Number(line.quantity),

        unit_cost: Number(line.unit_cost),

        reference_type: "PURCHASE_INVOICE",

        reference_id: invoice.id,
      });
    }

    /**
     * -----------------------------------------------------
     * VALIDATE BALANCE
     * -----------------------------------------------------
     */
    GLValidationService.validateBalanced(glLines);

    /**
     * -----------------------------------------------------
     * POST JOURNAL
     * -----------------------------------------------------
     */
    const journal = await GLPostingService.postJournal(client, {
      company_id: companyId,

      entry_date: invoice.invoice_date,

      source: "PURCHASE",

      journal_type: "PURCHASE_INVOICE",

      reference: invoice.invoice_no,

      source_id: invoice.id,

      description: `Purchase Invoice ${invoice.invoice_no}`,

      created_by: userId || null,

      lines: glLines,
    });

    /**
     * -----------------------------------------------------
     * UPDATE QUANTITY INVOICED
     * -----------------------------------------------------
     */
    for (const line of lines) {
      if (!line.purchase_order_line_id) {
        continue;
      }

      await client.query(
        `
        UPDATE purchase_order_lines
        SET
          invoiced_quantity =
            COALESCE(invoiced_quantity,0) + $1,

          updated_at = now()

        WHERE id = $2
        `,
        [Number(line.quantity), line.purchase_order_line_id],
      );
    }

    /**
     * -----------------------------------------------------
     * CREATE AP LEDGER ENTRY
     * -----------------------------------------------------
     */
    await client.query(
      `
  INSERT INTO vendor_ledger_entries (
    company_id,
    vendor_id,
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
        invoice.supplier_id,
        "PURCHASE_INVOICE",
        invoice.id,
        invoice.invoice_no,
        invoice.invoice_date,
        "Purchase invoice",
        invoice.total_amount,
        invoice.total_amount,
        invoice.currency_id || null,
        journal.id,
      ],
    );

    /**
     * -----------------------------------------------------
     * RECALCULATE PO STATUS
     * -----------------------------------------------------
     */
    if (invoice.purchase_order_id) {
      await PurchaseOrderStatusService.recalculate(
        client,
        invoice.purchase_order_id,
      );
    }

    /**
     * -----------------------------------------------------
     * MARK INVOICE POSTED
     * -----------------------------------------------------
     */
    await client.query(
      `
      UPDATE purchase_invoices
      SET
        is_posted = true,
        posted_at = now(),
        journal_entry_id = $2,
        updated_at = now()
      WHERE id = $1
      `,
      [invoiceId, journal.id],
    );
  }
}
/* import { PoolClient } from "pg";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";

import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";

export class PurchaseInvoiceService {
  
  static async postInvoice(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
    userId?: string,
  ) {

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


    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      const accounts = await AccountResolutionService.resolvePurchaseAccounts(
        client,
        companyId,
        line.item_id,
      );

      const amount = Number(line.quantity) * Number(line.unit_cost);


      glLines.push({
        account_id: accounts.grni_account_id,
        debit: amount,
        credit: 0,
        item_id: line.item_id,
        reference_type: "PURCHASE_INVOICE",
        reference_id: invoice.id,
      });


      glLines.push({
        account_id: accounts.purchase_account_id,
        debit: 0,
        credit: amount,
        item_id: line.item_id,
        reference_type: "PURCHASE_INVOICE",
        reference_id: invoice.id,
      });
    }


    GLValidationService.validateBalanced(glLines);


    await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: invoice.invoice_date,
      source: "PURCHASE",
      journal_type: "PURCHASE_INVOICE",
      reference: invoice.invoice_no,
      source_id: invoice.id,
      description: "Purchase invoice posting",
      created_by: userId || null,
      lines: glLines,
    });


    await client.query(
      `
      UPDATE purchase_invoices
      SET is_posted = true,
          posted_at = now()
      WHERE id = $1
      `,
      [invoiceId],
    );
  }
} */

// lib/services/sales/sales-order-posting.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { CustomerLedgerService } from "@/lib/services/ledger/customer-ledger.service";

export interface PostSalesOrderInput {
  companyId: string;
  salesOrderId: string;
  userId?: string;
  postingData: {
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials?: {
    amount: number;
    discount?: number;
    vat: number;
    amountInclVat: number;
  };
}

export class SalesOrderPostingService {
  static async postSalesOrder(
    input: PostSalesOrderInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient || (await pool.connect());
    const isExternalClient = !!externalClient;

    const { companyId, salesOrderId, userId, postingData, financials } = input;

    try {
      if (!isExternalClient) {
        await client.query("BEGIN");
      }

      // 1. Fetch & lock Sales Order header record
      const soResult = await client.query(
        `SELECT id, order_no, customer_id, subtotal, vat_amount, total_amount, is_posted, status, currency_id, exchange_rate 
         FROM sales_orders 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [salesOrderId, companyId],
      );

      if (!soResult.rows.length) {
        throw new Error("Sales order document not found.");
      }

      const order = soResult.rows[0];

      if (order.is_posted) {
        throw new Error("Sales order is already posted.");
      }

      // 2. Fetch active Sales Order lines
      const linesResult = await client.query(
        `SELECT id, item_id, gl_account_id, warehouse_id, quantity, unit_price, discount_amount, description, vat_percent, vat_amount, net_amount, gross_amount, line_type
         FROM sales_order_lines 
         WHERE sales_order_id = $1 AND company_id = $2 AND COALESCE(is_deleted, false) = false`,
        [salesOrderId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post a sales order without lines.");
      }

      const postingDate =
        postingData.posting_date || new Date().toISOString().split("T")[0];

      // Multi-currency resolution
      const currencyId = postingData.currency_id || order.currency_id || null;
      const exchangeRate = Number(
        postingData.exchange_rate || order.exchange_rate || 1,
      );

      // Auto-generate sequence for posted sales invoice_no
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_invoice"],
      );
      const invoiceNo = seqResult.rows[0]?.code || `SINV-${Date.now()}`;

      const glLines: GLLineInput[] = [];
      let fallbackArAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let calculatedNetSum = 0;
      let calculatedVatSum = 0;

      // 3. Process lines and build line-level GL entries (CREDIT Revenue)
      for (const line of lines) {
        const qty = Number(line.quantity || 0);
        const unitPrice = Number(line.unit_price || 0);
        const lineDiscount = Number(line.discount_amount || 0);
        const grossLineCost = qty * unitPrice;

        const netAmt = Number(
          line.net_amount
            ? line.net_amount
            : (grossLineCost - lineDiscount).toFixed(2),
        );

        const vatAmt = Number(line.vat_amount || 0);

        calculatedNetSum += netAmt;
        calculatedVatSum += vatAmt;

        if (line.line_type === "ITEM" || (!line.line_type && line.item_id)) {
          const accounts = await AccountResolutionService.resolveSalesAccounts(
            client,
            companyId,
            line.item_id,
          );

          if (!fallbackArAccountId && accounts.receivable_account_id) {
            fallbackArAccountId = accounts.receivable_account_id;
          }
          if (!fallbackVatAccountId && accounts.vat_account_id) {
            fallbackVatAccountId = accounts.vat_account_id;
          }

          // CREDIT: Sales Revenue Account
          glLines.push({
            account_id: accounts.sales_account_id,
            debit: 0,
            credit: netAmt,
            party_id: order.customer_id,
            party_type: "customer",
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: qty,
            reference_type: "SALES_ORDER",
            reference_id: order.id,
            description: `Sales revenue for ${invoiceNo}`,
          });
        } else if (line.line_type === "GL_ACCOUNT" || line.gl_account_id) {
          // G/L Direct Line CREDIT
          glLines.push({
            account_id: line.gl_account_id,
            debit: 0,
            credit: netAmt,
            party_id: order.customer_id,
            party_type: "customer",
            reference_type: "SALES_ORDER",
            reference_id: order.id,
            description: line.description || `Sales order line direct revenue`,
          });
        }
      }

      // If AR Account was not resolved via items, pull default setup account
      if (!fallbackArAccountId || !fallbackVatAccountId) {
        const spgResult = await client.query(
          `SELECT receivable_account_id, vat_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (!fallbackArAccountId) {
          fallbackArAccountId =
            spgResult.rows[0]?.receivable_account_id || null;
        }
        if (!fallbackVatAccountId) {
          fallbackVatAccountId = spgResult.rows[0]?.vat_account_id || null;
        }
      }

      if (!fallbackArAccountId) {
        throw new Error("Accounts Receivable account is not configured.");
      }

      // Resolve final VAT Amount (financials override or lines sum)
      const finalVatAmount = financials
        ? Number(financials.vat)
        : calculatedVatSum;

      // 4. CREDIT: Output VAT / Sales VAT Account
      if (finalVatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Sales VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: 0,
          credit: finalVatAmount,
          party_id: order.customer_id,
          party_type: "customer",
          reference_type: "SALES_ORDER",
          reference_id: order.id,
          description: `Output VAT for ${invoiceNo}`,
        });
      }

      // 5. DEBIT: Accounts Receivable (Increases Customer Debt/Asset)
      const totalCreditSum = glLines.reduce(
        (sum, l) => sum + (l.credit || 0),
        0,
      );
      const grossTotal = Number(totalCreditSum.toFixed(2));

      glLines.push({
        account_id: fallbackArAccountId,
        debit: grossTotal,
        credit: 0,
        party_id: order.customer_id,
        party_type: "customer",
        reference_type: "SALES_ORDER",
        reference_id: order.id,
        description: `Customer AR asset charge for ${invoiceNo}`,
      });

      // 6. Validate double-entry balance
      GLValidationService.validateBalanced(glLines);

      // 7. Post through core GL Posting Engine
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "SALES",
        journal_type: "SALES_INVOICE",
        reference: invoiceNo,
        source_id: order.id,
        description: `Posted Sales Order Invoice ${invoiceNo}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      const arLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackArAccountId,
      );

      // 8. Post Customer Sub-Ledger Entry
      await CustomerLedgerService.createEntry(client, {
        companyId,
        customerId: order.customer_id,
        documentType: "SALES_INVOICE",
        documentId: order.id,
        documentNo: invoiceNo,
        postingDate,
        dueDate: postingDate,
        description: `Sales Invoice ${invoiceNo}`,
        originalAmount: grossTotal,
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: arLine?.id || null,
      });

      // 9. Update Sales Order header status and record generated invoice number
      await client.query(
        `UPDATE sales_orders 
         SET 
             is_posted = true,
             sales_invoice_no = $1,
             invoice_status = 'INVOICED',
             posted_at = NOW(),
             posting_date = COALESCE($2, posting_date),
             status = 'invoiced'::public.sales_order_status_enum,
             notes = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $3 AND company_id = $4`,
        [
          invoiceNo,
          postingDate,
          salesOrderId,
          companyId,
          postingData.notes || null,
        ],
      );

      if (!isExternalClient) {
        await client.query("COMMIT");
      }

      return {
        id: order.id,
        sales_order_no: order.order_no,
        posted_sales_invoice_no: invoiceNo,
        journalId: journal.id,
      };
    } catch (err) {
      if (!isExternalClient) {
        await client.query("ROLLBACK");
      }
      throw err;
    } finally {
      if (!isExternalClient) {
        client.release();
      }
    }
  }

  static async postSalesOrderTransactional(
    client: PoolClient,
    params: PostSalesOrderInput,
  ) {
    return this.postSalesOrder(params, client);
  }
}

/* import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { CustomerLedgerService } from "@/lib/services/ledger/customer-ledger.service";

export interface PostSalesOrderInput {
  companyId: string;
  salesOrderId: string;
  userId?: string;
  postingData: {
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials?: {
    amount: number;
    discount?: number;
    vat: number;
    amountInclVat: number;
  };
}

export class SalesOrderPostingService {
  static async postSalesOrder(
    input: PostSalesOrderInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient || (await pool.connect());
    const isExternalClient = !!externalClient;

    const { companyId, salesOrderId, userId, postingData, financials } = input;

    try {
      if (!isExternalClient) {
        await client.query("BEGIN");
      }

      // 1. Fetch & lock Sales Order header record
      const soResult = await client.query(
        `SELECT id, order_no, customer_id, subtotal, tax_amount, total_amount, is_posted, status, currency_id, exchange_rate 
         FROM sales_orders 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [salesOrderId, companyId],
      );

      if (!soResult.rows.length) {
        throw new Error("Sales order document not found.");
      }

      const order = soResult.rows[0];

      if (order.is_posted) {
        throw new Error("Sales order is already posted.");
      }

      // 2. Fetch active Sales Order lines
      const linesResult = await client.query(
        `SELECT id, item_id, gl_account_id, warehouse_id, quantity, unit_price, discount_amount, description, tax_percent, tax_amount, net_amount, gross_amount, line_type
         FROM sales_order_lines 
         WHERE sales_order_id = $1 AND company_id = $2 AND COALESCE(is_deleted, false) = false`,
        [salesOrderId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post a sales order without lines.");
      }

      const postingDate =
        postingData.posting_date || new Date().toISOString().split("T")[0];

      // Multi-currency resolution
      const currencyId = postingData.currency_id || order.currency_id || null;
      const exchangeRate = Number(
        postingData.exchange_rate || order.exchange_rate || 1,
      );

      // Auto-generate sequence for posted sales invoice_no
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_invoice"],
      );
      const invoiceNo = seqResult.rows[0]?.code || `SINV-${Date.now()}`;

      const glLines: GLLineInput[] = [];
      let fallbackArAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let calculatedNetSum = 0;
      let calculatedVatSum = 0;

      // 3. Process lines and build line-level GL entries (CREDIT Revenue)
      for (const line of lines) {
        const qty = Number(line.quantity || 0);
        const unitPrice = Number(line.unit_price || 0);
        const lineDiscount = Number(line.discount_amount || 0);
        const grossLineCost = qty * unitPrice;

        const netAmt = Number(
          line.net_amount
            ? line.net_amount
            : (grossLineCost - lineDiscount).toFixed(2),
        );

        const vatAmt = Number(line.tax_amount || 0);

        calculatedNetSum += netAmt;
        calculatedVatSum += vatAmt;

        if (line.line_type === "ITEM" || (!line.line_type && line.item_id)) {
          const accounts = await AccountResolutionService.resolveSalesAccounts(
            client,
            companyId,
            line.item_id,
          );

          if (!fallbackArAccountId && accounts.receivable_account_id) {
            fallbackArAccountId = accounts.receivable_account_id;
          }
          if (!fallbackVatAccountId && accounts.vat_account_id) {
            fallbackVatAccountId = accounts.vat_account_id;
          }

          // CREDIT: Sales Revenue Account
          glLines.push({
            account_id: accounts.sales_account_id,
            debit: 0,
            credit: netAmt,
            party_id: order.customer_id,
            party_type: "customer",
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: qty,
            reference_type: "SALES_ORDER",
            reference_id: order.id,
            description: `Sales revenue for ${invoiceNo}`,
          });
        } else if (line.line_type === "GL_ACCOUNT" || line.gl_account_id) {
          // G/L Direct Line CREDIT
          glLines.push({
            account_id: line.gl_account_id,
            debit: 0,
            credit: netAmt,
            party_id: order.customer_id,
            party_type: "customer",
            reference_type: "SALES_ORDER",
            reference_id: order.id,
            description: line.description || `Sales order line direct revenue`,
          });
        }
      }

      // If AR Account was not resolved via items, pull default setup account
      if (!fallbackArAccountId || !fallbackVatAccountId) {
        const spgResult = await client.query(
          `SELECT receivable_account_id, vat_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (!fallbackArAccountId) {
          fallbackArAccountId =
            spgResult.rows[0]?.receivable_account_id || null;
        }
        if (!fallbackVatAccountId) {
          fallbackVatAccountId = spgResult.rows[0]?.vat_account_id || null;
        }
      }

      if (!fallbackArAccountId) {
        throw new Error("Accounts Receivable account is not configured.");
      }

      // Resolve final VAT Amount (financials override or lines sum)
      const finalVatAmount = financials
        ? Number(financials.vat)
        : calculatedVatSum;

      // 4. CREDIT: Output VAT / Sales VAT Account
      if (finalVatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Sales VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: 0,
          credit: finalVatAmount,
          party_id: order.customer_id,
          party_type: "customer",
          reference_type: "SALES_ORDER",
          reference_id: order.id,
          description: `Output VAT for ${invoiceNo}`,
        });
      }

      // 5. DEBIT: Accounts Receivable (Increases Customer Debt/Asset)
      const totalCreditSum = glLines.reduce(
        (sum, l) => sum + (l.credit || 0),
        0,
      );
      const grossTotal = Number(totalCreditSum.toFixed(2));

      glLines.push({
        account_id: fallbackArAccountId,
        debit: grossTotal,
        credit: 0,
        party_id: order.customer_id,
        party_type: "customer",
        reference_type: "SALES_ORDER",
        reference_id: order.id,
        description: `Customer AR asset charge for ${invoiceNo}`,
      });

      // 6. Validate double-entry balance
      GLValidationService.validateBalanced(glLines);

      // 7. Post through core GL Posting Engine
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "SALES",
        journal_type: "SALES_INVOICE",
        reference: order.order_no,
        source_id: order.id,
        description: `Posted Sales Order Invoice ${invoiceNo}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      const arLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackArAccountId,
      );

      // 8. Post Customer Sub-Ledger Entry
      await CustomerLedgerService.createEntry(client, {
        companyId,
        customerId: order.customer_id,
        documentType: "SALES_INVOICE",
        documentId: order.id,
        documentNo: order.order_no,
        postingDate,
        dueDate: postingDate,
        description: `Sales Invoice ${invoiceNo}`,
        originalAmount: grossTotal,
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: arLine?.id || null,
      });

      // 9. Update Sales Order status
      await client.query(
        `UPDATE sales_orders 
         SET 
             is_posted = true,
             sales_invoice_no = $1,
             posted_at = NOW(),
             status = 'posted',
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [invoiceNo || null, salesOrderId, companyId, postingData.notes || null],
      );

      if (!isExternalClient) {
        await client.query("COMMIT");
      }

      return {
        id: order.id,
        sales_order_no: order.order_no,
        posted_sales_invoice_no: invoiceNo,
        journalId: journal.id,
      };
    } catch (err) {
      if (!isExternalClient) {
        await client.query("ROLLBACK");
      }
      throw err;
    } finally {
      if (!isExternalClient) {
        client.release();
      }
    }
  }


  static async postSalesOrderTransactional(
    client: PoolClient,
    params: PostSalesOrderInput,
  ) {
    return this.postSalesOrder(params, client);
  }
}
 */

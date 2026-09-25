// lib/services/sales/sales-return-posting.service.ts

// lib/services/sales/sales-return-posting.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { CustomerLedgerService } from "../ledger/customer-ledger.service";

export interface PostSalesReturnInput {
  companyId: string;
  salesReturnId: string;
  userId?: string;
  skipReturnMatchCheck?: boolean;
  creditNoteData?: {
    customer_credit_note_no?: string;
    credit_note_date?: string;
    due_date?: string;
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials?: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

export class SalesReturnPostingService {
  static async postSalesReturn(
    input: PostSalesReturnInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient || (await pool.connect());
    const isExternalClient = !!externalClient;

    const {
      companyId,
      salesReturnId,
      userId,
      skipReturnMatchCheck,
      creditNoteData = {},
      financials,
    } = input;

    try {
      if (!isExternalClient) {
        await client.query("BEGIN");
      }

      // 1. Fetch & lock Credit Note header record
      const returnResult = await client.query(
        `SELECT id, credit_note_no, customer_id, status, is_posted, currency_id, exchange_rate
         FROM credit_notes 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [salesReturnId, companyId],
      );

      if (!returnResult.rows.length) {
        throw new Error("Credit note / Sales return document not found.");
      }

      const salesReturn = returnResult.rows[0];

      if (salesReturn.is_posted) {
        throw new Error("Credit note / Sales return is already posted.");
      }

      // 2. Fetch active Credit Note lines
      const linesResult = await client.query(
        `SELECT id, item_id, gl_account_id, line_type, warehouse_id, quantity, returned_quantity, unit_price, discount_amount, description, vat_percent, vat_amount, net_amount, gross_amount
         FROM credit_note_lines 
         WHERE credit_note_id = $1 AND company_id = $2 AND COALESCE(is_deleted, false) = false`,
        [salesReturnId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post credit note without lines.");
      }

      // 3. Enforce Goods Receipt Check
      if (!skipReturnMatchCheck) {
        const stockLines = lines.filter(
          (line) =>
            line.line_type === "ITEM" || (!line.line_type && !!line.item_id),
        );

        const unreceivedLines = stockLines.filter(
          (line) => Number(line.returned_quantity || 0) < Number(line.quantity || 0),
        );

        if (unreceivedLines.length > 0) {
          throw new Error(
            "Return Verification Failed: Stock must be physically returned/received into warehouse before posting credit note.",
          );
        }
      }

      const postingDate =
        creditNoteData.posting_date ||
        creditNoteData.credit_note_date ||
        new Date().toISOString().split("T")[0];
      const dueDate = creditNoteData.due_date || postingDate;

      // Currency resolution: Input override -> Header fallback
      const currencyId = creditNoteData.currency_id || salesReturn.currency_id || null;
      const exchangeRate = Number(
        creditNoteData.exchange_rate || salesReturn.exchange_rate || 1,
      );

      // Auto-generate sequence for posted credit note number
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_credit_note"],
      );
      const postedCreditNoteNo = seqResult.rows[0]?.code || `SCRN-${Date.now()}`;

      const glLines: GLLineInput[] = [];
      let fallbackArAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let calculatedNetSum = 0;
      let calculatedVatSum = 0;

      // 4. Process lines and build line-level GL entries (DEBIT Revenue/Allowance)
      for (const line of lines) {
        const qty = Number(line.quantity || 0);
        const unitPrice = Number(line.unit_price || 0);
        const lineDiscount = Number(line.discount_amount || 0);
        const grossLineCost = qty * unitPrice;

        const netAmt = Number(
          line.net_amount !== undefined && line.net_amount !== null
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

          // DEBIT: Sales Revenue / Sales Return Account
          glLines.push({
            account_id: accounts.sales_account_id,
            debit: netAmt,
            credit: 0,
            party_id: salesReturn.customer_id,
            party_type: "customer",
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: qty,
            reference_type: "SALES_CREDIT_NOTE",
            reference_id: salesReturn.id,
            description: `Sales return line for ${postedCreditNoteNo}`,
          });
        } else if (line.line_type === "GL_ACCOUNT" || line.gl_account_id) {
          // G/L Direct Line DEBIT
          glLines.push({
            account_id: line.gl_account_id,
            debit: netAmt,
            credit: 0,
            party_id: salesReturn.customer_id,
            party_type: "customer",
            reference_type: "SALES_CREDIT_NOTE",
            reference_id: salesReturn.id,
            description: line.description || `Sales return line direct allowance`,
          });
        }
      }

      // If AR/VAT Account was not resolved via items, pull default setup account
      if (!fallbackArAccountId || !fallbackVatAccountId) {
        const spgResult = await client.query(
          `SELECT receivable_account_id, vat_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (!fallbackArAccountId) {
          fallbackArAccountId = spgResult.rows[0]?.receivable_account_id || null;
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

      // 5. DEBIT: Output VAT Reversal
      if (finalVatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Sales VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: finalVatAmount,
          credit: 0,
          party_id: salesReturn.customer_id,
          party_type: "customer",
          reference_type: "SALES_CREDIT_NOTE",
          reference_id: salesReturn.id,
          description: `Output VAT reversal for ${postedCreditNoteNo}`,
        });
      }

      // 6. CREDIT: Accounts Receivable (Reduces Customer Debt/Balance)
      const totalDebitSum = glLines.reduce(
        (sum, l) => sum + (l.debit || 0),
        0,
      );
      const grossTotal = Number(totalDebitSum.toFixed(2));

      glLines.push({
        account_id: fallbackArAccountId,
        debit: 0,
        credit: grossTotal,
        party_id: salesReturn.customer_id,
        party_type: "customer",
        reference_type: "SALES_CREDIT_NOTE",
        reference_id: salesReturn.id,
        description: `Customer AR credit for ${postedCreditNoteNo}`,
      });

      // 7. Validate double-entry balance
      GLValidationService.validateBalanced(glLines);

      // 8. Post through core GL Posting Engine
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "SALES",
        journal_type: "SALES_CREDIT_NOTE",
        reference: postedCreditNoteNo,
        source_id: salesReturn.id,
        description: `Posted Sales Credit Note ${postedCreditNoteNo}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      const arLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackArAccountId,
      );

      // 9. Post Customer Sub-Ledger Entry
      await CustomerLedgerService.createEntry(client, {
        companyId,
        customerId: salesReturn.customer_id,
        documentType: "CREDIT_MEMO",
        documentId: salesReturn.id,
        documentNo: postedCreditNoteNo,
        postingDate,
        dueDate,
        description: `Credit Note ${postedCreditNoteNo}`,
        originalAmount: -grossTotal, // Stored as negative for credit memo balance
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: arLine?.id || null,
      });

      // 10. Update Credit Note header record
      await client.query(
        `UPDATE credit_notes 
         SET 
             is_posted = true,
             posted_credit_note_no = $1,
             posted_at = NOW(),
             posting_date = COALESCE($2, posting_date),
             status = 'posted',
             notes = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $3 AND company_id = $4`,
        [
          postedCreditNoteNo,
          postingDate,
          salesReturnId,
          companyId,
          creditNoteData.notes || null,
        ],
      );

      if (!isExternalClient) {
        await client.query("COMMIT");
      }

      return {
        id: salesReturn.id,
        credit_note_no: salesReturn.credit_note_no,
        posted_credit_note_no: postedCreditNoteNo,
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

  static async postSalesReturnTransactional(
    client: PoolClient,
    params: PostSalesReturnInput,
  ) {
    return this.postSalesReturn(params, client);
  }
}

/* import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { CustomerLedgerService } from "../ledger/customer-ledger.service";

export interface PostSalesReturnInput {
  companyId: string;
  salesReturnId: string;
  userId?: string;
  skipReturnMatchCheck?: boolean;
  creditNoteData: {
    customer_credit_note_no?: string;
    credit_note_date?: string;
    due_date?: string;
    posting_date?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
  };
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

export class SalesReturnPostingService {
  static async postSalesReturn(
    input: PostSalesReturnInput,
    externalClient?: PoolClient,
  ) {
    const client = externalClient || (await pool.connect());
    const isExternalClient = !!externalClient;

    const {
      companyId,
      salesReturnId,
      userId,
      skipReturnMatchCheck,
      creditNoteData,
      financials,
    } = input;

    try {
      if (!isExternalClient) {
        await client.query("BEGIN");
      }

      // 1. Fetch & lock Sales Return record
      const returnResult = await client.query(
        `SELECT id, customer_id, status, currency_id, exchange_rate
         FROM credit_notes 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [salesReturnId, companyId],
      );

      if (!returnResult.rows.length) {
        throw new Error("Target Sales Return document not found.");
      }

      const salesReturn = returnResult.rows[0];

      // 2. Load active return lines
      const linesResult = await client.query(
        `SELECT id, item_id, line_type, warehouse_id, quantity, returned_quantity, unit_price, discount_amount, description, tax_percent, tax_amount, net_amount, vat_percent, vat_amount, gross_amount
         FROM credit_note_lines 
         WHERE credit_note_id = $1 AND company_id = $2 AND is_deleted = false`,
        [salesReturnId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error(
          "Cannot post credit note for a return order without lines.",
        );
      }

      // 3. Enforce Goods Receipt Check
      if (!skipReturnMatchCheck) {
        const stockLines = lines.filter(
          (line) =>
            line.line_type === "ITEM" || (!line.line_type && !!line.item_id),
        );

        const unreceivedLines = stockLines.filter(
          (line) => Number(line.returned_quantity) < Number(line.quantity),
        );

        if (unreceivedLines.length > 0) {
          throw new Error(
            "Return Verification Failed: Stock must be physically returned/received into warehouse before posting credit note.",
          );
        }
      }

      // 4. Auto-generate sequence for credit note number
      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "sales_credit_note"],
      );
      const creditNoteNo = seqResult.rows[0]?.code || `SCRN-${Date.now()}`;

      const creditNoteDate =
        creditNoteData.credit_note_date ||
        creditNoteData.posting_date ||
        new Date().toISOString().split("T")[0];
      const dueDate = creditNoteData.due_date || creditNoteDate;

      // Currency resolution: Request body override -> Return header fallback
      const currencyId =
        creditNoteData.currency_id || salesReturn.currency_id || null;
      const exchangeRate = Number(
        creditNoteData.exchange_rate || salesReturn.exchange_rate || 1,
      );

      // Calculate Subtotal using Net Amount (or Quantity * Unit Price - Discount)
      const returnSubtotal = lines.reduce((sum, line) => {
        const lineNet =
          line.net_amount !== undefined && line.net_amount !== null
            ? Number(line.net_amount)
            : Number(line.quantity) * Number(line.unit_price || 0) -
              Number(line.discount_amount || 0);
        return sum + lineNet;
      }, 0);

      const vatAmount = Number(financials.vat || 0);

      // Ensure Gross Total = Return Subtotal + VAT Amount
      const grossTotal = returnSubtotal + vatAmount;

      // 5. Insert Sales Credit Note record
      const cnResult = await client.query(
        `INSERT INTO sales_credit_notes (
          company_id, 
          sales_return_id, 
          customer_id, 
          credit_note_no,
          customer_credit_note_no,
          credit_note_date,
          due_date,
          currency_id,
          exchange_rate,
          subtotal, 
          tax_amount, 
          total_amount, 
          status, 
          is_posted,
          posted_at,
          approved_at,
          notes,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
          'POSTED', true, NOW(), NOW(), $13, $14
        )
        RETURNING id, credit_note_no`,
        [
          companyId,
          salesReturnId,
          salesReturn.customer_id,
          creditNoteNo,
          creditNoteData.customer_credit_note_no || null,
          creditNoteDate,
          dueDate,
          currencyId,
          exchangeRate,
          returnSubtotal,
          vatAmount,
          grossTotal,
          creditNoteData.notes || null,
          userId || null,
        ],
      );

      const createdCreditNote = cnResult.rows[0];
      const glLines: GLLineInput[] = [];

      let fallbackArAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let lineNo = 10000;

      // 6. Create Credit Note Lines, resolve Accounts & build GL lines
      for (const line of lines) {
        const lineGross = Number(line.quantity) * Number(line.unit_price || 0);
        const lineDiscount = Number(line.discount_amount || 0);

        const lineNet =
          line.net_amount !== undefined && line.net_amount !== null
            ? Number(line.net_amount)
            : lineGross - lineDiscount;

        await client.query(
          `INSERT INTO sales_credit_note_lines (
            company_id,
            sales_credit_note_id,
            line_no,
            sales_return_line_id,
            item_id,
            warehouse_id,
            description,
            quantity,
            unit_price,
            line_amount,
            discount_amount,
            tax_percent,
            tax_amount,
            net_amount,
            gross_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            companyId,
            createdCreditNote.id,
            lineNo,
            line.id,
            line.item_id || null,
            line.warehouse_id || null,
            line.description || null,
            line.quantity,
            line.unit_price,
            lineGross,
            lineDiscount,
            line.vat_percent || 0,
            line.vat_amount || 0,
            lineNet,
            line.gross_amount || lineNet,
          ],
        );
        lineNo += 10000;

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

        // DEBIT: Sales Returns & Allowances (Revenue Reduction)
        glLines.push({
          account_id:
            accounts.sales_account_id, // accounts.sales_return_account_id || 
          debit: lineNet,
          credit: 0,
          party_id: salesReturn.customer_id,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: Number(line.quantity),
          reference_type: "SALES_CREDIT_NOTE",
          reference_id: createdCreditNote.id,
          description: `Sales return credit line for ${createdCreditNote.credit_note_no}`,
        });

        await client.query(
          `UPDATE sales_return_lines 
           SET credited_quantity = quantity, updated_at = NOW() 
           WHERE id = $1`,
          [line.id],
        );
      }

      // 7. DEBIT: Output Tax / VAT Reversal (if applicable)
      if (vatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Sales VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: vatAmount,
          credit: 0,
          party_id: salesReturn.customer_id,
          reference_type: "SALES_CREDIT_NOTE",
          reference_id: createdCreditNote.id,
          description: `Output VAT reversal for credit note ${createdCreditNote.credit_note_no}`,
        });
      }

      // 8. CREDIT: Accounts Receivable (Customer Reduction)
      if (!fallbackArAccountId) {
        throw new Error(
          "Accounts Receivable account not configured in sales posting groups.",
        );
      }

      const totalDebitLinesAmount = glLines.reduce(
        (sum, l) => sum + (l.debit || 0),
        0,
      );

      glLines.push({
        account_id: fallbackArAccountId,
        debit: 0,
        credit: Number(totalDebitLinesAmount.toFixed(2)),
        party_id: salesReturn.customer_id,
        reference_type: "SALES_CREDIT_NOTE",
        reference_id: createdCreditNote.id,
        description: `Customer AR credit for ${createdCreditNote.credit_note_no}`,
      });

      // 9. Validate journal balance
      GLValidationService.validateBalanced(glLines);

      // 10. Post journal entry
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: creditNoteDate,
        source: "SALES",
        journal_type: "SALES_CREDIT_NOTE",
        reference: createdCreditNote.credit_note_no,
        source_id: createdCreditNote.id,
        description: `Posted Credit Note ${createdCreditNote.credit_note_no}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      // Locate the posted AR line
      const arLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackArAccountId,
      );

      // 11. Post Customer Sub-Ledger Entry
      await CustomerLedgerService.createEntry(client, {
        companyId,
        customerId: salesReturn.customer_id,
        documentType: "CREDIT_MEMO",
        documentId: createdCreditNote.id,
        documentNo: createdCreditNote.credit_note_no,
        postingDate: creditNoteDate,
        dueDate,
        description: `Credit Note ${createdCreditNote.credit_note_no}`,
        originalAmount: -grossTotal, // Stored as a negative liability/credit balance
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: arLine?.id || null,
      });

      // 12. Mark Sales Return completed
      await client.query(
        `UPDATE credit_notes 
         SET status = 'completed', is_credited = true, updated_at = NOW() 
         WHERE id = $1`,
        [salesReturnId],
      );

      if (!isExternalClient) {
        await client.query("COMMIT");
      }

      return createdCreditNote;
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

  static async postSalesReturnTransactional(
    client: PoolClient,
    params: PostSalesReturnInput,
  ) {
    return this.postSalesReturn(params, client);
  }
} */

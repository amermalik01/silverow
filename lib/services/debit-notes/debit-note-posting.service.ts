// lib/services/debit-notes/debit-note-posting.service.ts

import { pool } from "@/lib/db";
import {
  GLPostingService,
  GLLineInput,
  PostedJournalLine,
} from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { VendorLedgerService } from "../ledger/vendor-ledger.service";

export interface PostDebitNoteInput {
  companyId: string;
  debitNoteId: string;
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

export class DebitNotePostingService {
  static async postDebitNote(input: PostDebitNoteInput) {
    const client = await pool.connect();
    const { companyId, debitNoteId, userId, postingData, financials } = input;

    try {
      await client.query("BEGIN");

      // 1. Fetch & lock Debit Note header record
      const dnResult = await client.query(
        `SELECT id, debit_note_no, supplier_id, subtotal, discount_amount, tax_amount, total_amount, is_posted, status, currency_id, exchange_rate 
         FROM debit_notes 
         WHERE id = $1 AND company_id = $2 
         FOR UPDATE`,
        [debitNoteId, companyId],
      );

      if (!dnResult.rows.length) {
        throw new Error("Debit note document not found.");
      }

      const note = dnResult.rows[0];

      if (note.is_posted) {
        throw new Error("Debit note is already posted.");
      }

      // 2. Fetch active Debit Note lines
      const linesResult = await client.query(
        `SELECT id, item_id, gl_account_id, warehouse_id, quantity, unit_cost, discount_amount, description, tax_percent, tax_amount, net_amount, gross_amount, line_type
         FROM debit_note_lines 
         WHERE debit_note_id = $1 AND company_id = $2 AND is_deleted = false`,
        [debitNoteId, companyId],
      );

      const lines = linesResult.rows;
      if (!lines.length) {
        throw new Error("Cannot post a debit note without lines.");
      }

      const postingDate =
        postingData.posting_date || new Date().toISOString().split("T")[0];

      // Multi-currency resolution
      const currencyId = postingData.currency_id || note.currency_id || null;
      const exchangeRate = Number(
        postingData.exchange_rate || note.exchange_rate || 1,
      );

      const companyRes = await client.query(
        `SELECT inventory_system FROM companies WHERE id = $1`,
        [companyId],
      );
      const inventorySystem =
        companyRes.rows[0]?.inventory_system || "PERIODIC";

      const glLines: GLLineInput[] = [];
      let fallbackApAccountId: string | null = null;
      let fallbackVatAccountId: string | null = null;
      let calculatedNetSum = 0;
      let calculatedVatSum = 0;

      // 3. Process lines and build line-level GL entries
      for (const line of lines) {
        const qty = Number(line.quantity || 0);
        const unitCost = Number(line.unit_cost || 0);
        const lineDiscount = Number(line.discount_amount || 0);
        const grossLineCost = qty * unitCost;

        const netAmt = Number(
          line.net_amount
            ? line.net_amount
            : (grossLineCost - lineDiscount).toFixed(2),
        );

        // const netAmt = Number(
        //   line.net_amount ||
        //     Number(line.quantity || 0) * Number(line.unit_cost || 0),
        // );
        const vatAmt = Number(line.tax_amount || 0);

        calculatedNetSum += netAmt;
        calculatedVatSum += vatAmt;

        if (line.line_type === "ITEM" || (!line.line_type && line.item_id)) {
          const accounts =
            await AccountResolutionService.resolvePurchaseAccounts(
              client,
              companyId,
              line.item_id,
            );

          if (!fallbackApAccountId && accounts.payable_account_id) {
            fallbackApAccountId = accounts.payable_account_id;
          }
          if (!fallbackVatAccountId && accounts.vat_account_id) {
            fallbackVatAccountId = accounts.vat_account_id;
          }

          if (inventorySystem === "PERPETUAL") {
            // CREDIT: GRNI Account (Reverses accrued liability)
            glLines.push({
              account_id: accounts.grni_account_id,
              debit: 0,
              credit: netAmt,
              party_id: note.supplier_id,
              item_id: line.item_id,
              warehouse_id: line.warehouse_id,
              quantity: qty,
              reference_type: "DEBIT_NOTE",
              reference_id: note.id,
              description: `GRNI return clearing for ${note.debit_note_no}`,
            });
          } else {
            // CREDIT: Purchase Expense / Return Account
            glLines.push({
              account_id: accounts.purchase_account_id,
              debit: 0,
              credit: netAmt,
              party_id: note.supplier_id,
              item_id: line.item_id,
              warehouse_id: line.warehouse_id,
              quantity: qty,
              reference_type: "DEBIT_NOTE",
              reference_id: note.id,
              description: `Purchase return for ${note.debit_note_no}`,
            });
          }
        } else if (line.line_type === "GL_ACCOUNT" || line.gl_account_id) {
          // G/L Direct Line CREDIT
          glLines.push({
            account_id: line.gl_account_id,
            debit: 0,
            credit: netAmt,
            party_id: note.supplier_id,
            reference_type: "DEBIT_NOTE",
            reference_id: note.id,
            description: line.description || `Debit note line adjustment`,
          });
        }
      }

      // If AP Account was not resolved via items, pull default setup account
      if (!fallbackApAccountId || !fallbackVatAccountId) {
        const ppgResult = await client.query(
          `SELECT payable_account_id, vat_account_id FROM purchase_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (!fallbackApAccountId) {
          fallbackApAccountId = ppgResult.rows[0]?.payable_account_id || null;
        }
        if (!fallbackVatAccountId) {
          fallbackVatAccountId = ppgResult.rows[0]?.vat_account_id || null;
        }
      }

      if (!fallbackApAccountId) {
        throw new Error("Accounts Payable account is not configured.");
      }

      // Resolve final VAT Amount (financials override or lines sum)
      const finalVatAmount = financials
        ? Number(financials.vat)
        : calculatedVatSum;

      // 4. CREDIT: Input VAT / Purchase VAT Account (Reversal)
      if (finalVatAmount > 0) {
        if (!fallbackVatAccountId) {
          throw new Error("Purchase VAT account not configured in setup.");
        }

        glLines.push({
          account_id: fallbackVatAccountId,
          debit: 0,
          credit: finalVatAmount,
          party_id: note.supplier_id,
          reference_type: "DEBIT_NOTE",
          reference_id: note.id,
          description: `Input VAT reversal for ${note.debit_note_no}`,
        });
      }

      // 5. DEBIT: Accounts Payable (Reduces Liability owed to Supplier)
      const totalCreditSum = glLines.reduce(
        (sum, l) => sum + (l.credit || 0),
        0,
      );
      const grossTotal = Number(totalCreditSum.toFixed(2));

      glLines.push({
        account_id: fallbackApAccountId,
        debit: grossTotal,
        credit: 0,
        party_id: note.supplier_id,
        party_type: "supplier",
        reference_type: "DEBIT_NOTE",
        reference_id: note.id,
        description: `Vendor AP liability reduction for ${note.debit_note_no}`,
      });

      // 6. Validate double-entry balance
      GLValidationService.validateBalanced(glLines);

      // 7. Post through core GL Posting Engine
      const journal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: postingDate,
        source: "PURCHASE",
        journal_type: "DEBIT_NOTE",
        reference: note.debit_note_no,
        source_id: note.id,
        description: `Posted Debit Note ${note.debit_note_no}`,
        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });

      const apLine = journal.lines.find(
        (line: PostedJournalLine) => line.account_id === fallbackApAccountId,
      );

      // 8. Post Vendor Sub-Ledger Entry (Positive magnitude // Negative amount reduces vendor balance/liability)
      await VendorLedgerService.createEntry(client, {
        companyId,
        vendorId: note.supplier_id,
        documentType: "DEBIT_NOTE",
        documentId: note.id,
        documentNo: note.debit_note_no,
        postingDate,
        dueDate: postingDate,
        description: `Debit Note ${note.debit_note_no}`,
        originalAmount: grossTotal, // Positive magnitude // Remove Negative amount to represent AP debit/credit-adjustment
        currencyId,
        exchangeRate,
        journalEntryId: journal.id,
        journalLineId: apLine?.id || null,
      });

      // 9. Update Debit Note status
      await client.query(
        `UPDATE debit_notes 
         SET is_posted = true, 
             posted_at = NOW(), 
             status = 'posted',
             discount_amount = COALESCE($4, discount_amount),
             notes = COALESCE($3, notes),
             updated_at = NOW()
         WHERE id = $1 AND company_id = $2`,
        [
          debitNoteId,
          companyId,
          postingData.notes || null,
          financials?.discount || null,
        ],
      );

      await client.query("COMMIT");

      return {
        id: note.id,
        debit_note_no: note.debit_note_no,
        journalId: journal.id,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

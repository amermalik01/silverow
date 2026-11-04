// lib/services/ledger/vendor-ledger.service.ts

import { PoolClient } from "pg";

export interface CreateVendorLedgerEntryInput {
  companyId: string;
  vendorId: string;
  documentType:
    | "PURCHASE_INVOICE"
    | "PAYMENT"
    | "VENDOR_PAYMENT"
    | "CREDIT_MEMO"
    | "CREDIT_NOTE"
    | "REFUND"
    | "DEBIT_NOTE";
  documentId: string;
  documentNo: string;
  postingDate: string;
  dueDate?: string;
  description?: string;
  originalAmount: number;
  currencyId?: string | null;
  exchangeRate?: number;
  journalEntryId?: string;
  journalLineId?: string | null;
}

export class VendorLedgerService {
  /**
   * Creates an initial open vendor ledger entry upon document posting.
   * Aligned with vendor_ledger_entries schema.
   */
  static async createEntry(
    client: PoolClient,
    input: CreateVendorLedgerEntryInput,
  ) {
    const exchangeRate = input.exchangeRate ?? 1;
    const originalAmountFCY = input.originalAmount;
    const originalAmountLCY = Number(
      (originalAmountFCY * exchangeRate).toFixed(2),
    );
    // const originalAmountLCY = originalAmountFCY * exchangeRate;

    if (!Number.isFinite(originalAmountFCY) || originalAmountFCY <= 0) {
      throw new Error("Vendor invoice amount must be greater than zero.");
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error(
        "Vendor invoice exchange rate must be greater than zero.",
      );
    }

    const res = await client.query(
      `
      INSERT INTO vendor_ledger_entries (
        company_id,
        vendor_id,
        document_type,
        document_id,
        document_no,
        posting_date,
        due_date,
        description,
        original_amount_fcy,
        remaining_amount_fcy,
        original_amount_lcy,
        remaining_amount_lcy,
        currency_id,
        exchange_rate,
        is_open,
        journal_entry_id,
        journal_line_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 
        $9, $9, $10, $10, 
        $11, $12, true, $13, $14, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        input.companyId,
        input.vendorId,
        input.documentType,
        input.documentId,
        input.documentNo,
        input.postingDate,
        input.dueDate || null,
        input.description || null,
        originalAmountFCY,
        originalAmountLCY,
        input.currencyId || null,
        exchangeRate,
        input.journalEntryId || null,
        input.journalLineId || null,
      ],
    );

    return res.rows[0];
  }
}

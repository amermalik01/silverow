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
    | "REFUND"
    | "DEBIT_NOTE";
  documentId: string;
  documentNo: string;
  postingDate: string;
  dueDate?: string;
  description?: string;
  originalAmount: number;
  currencyId?: string;
  exchangeRate?: number;
  journalEntryId?: string;
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
        original_amount,
        remaining_amount,
        currency_id,
        exchange_rate,
        is_open,
        journal_entry_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, true, $13, NOW(), NOW()
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
        input.originalAmount,
        input.originalAmount,
        input.currencyId || null,
        exchangeRate,
        input.journalEntryId || null,
      ],
    );

    return res.rows[0];
  }
}

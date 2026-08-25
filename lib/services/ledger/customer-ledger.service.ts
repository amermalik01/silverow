// lib/services/ledger/customer-ledger.service.ts

import { PoolClient } from "pg";

export interface CreateCustomerLedgerEntryInput {
  companyId: string;
  customerId: string;
  documentType:
    | "SALES_INVOICE"
    | "PAYMENT"
    | "CREDIT_MEMO"
    | "REFUND";
  documentId: string;
  documentNo: string;
  postingDate: string;
  dueDate?: string;
  description?: string;
  originalAmount: number;
  currencyId?: string;
  exchangeRate?: number;
  journalEntryId?: string;
  journalLineId?: string;
}

export class CustomerLedgerService {
  static async createEntry(
    client: PoolClient,
    input: CreateCustomerLedgerEntryInput,
  ) {
    const exchangeRate = input.exchangeRate ?? 1;
    const originalAmountFCY = input.originalAmount;
    const originalAmountLCY = originalAmountFCY * exchangeRate;

    const res = await client.query(
      `
      INSERT INTO customer_ledger_entries (
        company_id,
        customer_id,
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
        input.customerId,
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
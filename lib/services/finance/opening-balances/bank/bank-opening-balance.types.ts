// lib/services/finance/opening-balances/bank/bank-opening-balance.types.ts

export type BankOpeningBalancePartyType = "customer" | "supplier";

export type BankOpeningBalanceDocumentType =
  | "Invoice"
  | "Credit Note"
  | "Debit Note"
  | "Payment"
  | "Refund";

export type BankOpeningBalanceStatus = "Open" | "Posted";

export type BankOpeningBalanceRow = {
  id: string;
  company_id: string;

  bank_account_id: string;
  bank_gl_account_id: string;
  bank_gl_code?: string | null;
  bank_gl_name?: string | null;

  party_type: BankOpeningBalancePartyType;
  party_id: string;
  party_code: string | null;
  party_name: string;

  posting_date: string;

  doc_type: BankOpeningBalanceDocumentType;
  doc_no: string;
  external_ref_no: string;
  description: string;

  currency_id: string | null;
  currency_code: string;

  debit: number;
  credit: number;
  exchange_rate: number;
  amount_lcy: number;

  status: BankOpeningBalanceStatus;
  posted_at: string | null;
  posted_by: string | null;

  gl_ledger_entry_id: string | null;
  general_ledger_document_no: string | null;

  created_at: string;
  updated_at: string;
};

export type BankOpeningBalanceInput = {
  bank_account_id?: string;
  bank_gl_account_id?: string;

  party_type: BankOpeningBalancePartyType;
  party_id: string;
  party_code?: string | null;
  party_name?: string | null;

  posting_date: string;

  doc_type: BankOpeningBalanceDocumentType;
  doc_no?: string | null;
  external_ref_no?: string | null;
  description?: string | null;

  currency_id?: string | null;
  currency_code: string;

  debit?: number;
  credit?: number;
  exchange_rate?: number;
};

export type BankOpeningBalanceCreatePayload = {
  lines: BankOpeningBalanceInput[];
};

export type BankOpeningBalanceQuery = {
  bankAccountId?: string;
  partyId?: string;
  partyType?: BankOpeningBalancePartyType;
  status?: BankOpeningBalanceStatus;
  id?: string;
};

export type BankOpeningBalanceWithIdInput = BankOpeningBalanceInput & {
  id?: string;
};

/* export type BankOpeningBalancePartyType = "customer" | "supplier";

export type BankOpeningBalanceDocumentType =
  | "Invoice"
  | "Credit Note"
  | "Debit Note"
  | "Payment"
  | "Refund";

export type BankOpeningBalanceStatus = "Open" | "Posted";

export type BankOpeningBalanceRow = {
  id: string;
  company_id: string;

  bank_account_id: string;

  party_type: BankOpeningBalancePartyType;
  party_id: string;
  party_code: string | null;
  party_name: string;

  posting_date: string;

  doc_type: BankOpeningBalanceDocumentType;
  doc_no: string;
  external_ref_no: string;
  description: string;

  currency_id: string;
  currency_code: string;

  debit: number;
  credit: number;
  exchange_rate: number;
  amount_lcy: number;

  status: BankOpeningBalanceStatus;
  posted_at: string | null;
  posted_by: string | null;

  gl_ledger_entry_id: string | null;
  general_ledger_document_no: string | null;

  created_at: string;
  updated_at: string;
};

export type BankOpeningBalanceInput = {
  bank_account_id?: string;
  bank_gl_account_id?: string;

  party_type: BankOpeningBalancePartyType;
  party_id: string;
  party_code?: string | null;
  party_name?: string | null;

  posting_date: string;

  doc_type: BankOpeningBalanceDocumentType;
  doc_no?: string | null;
  external_ref_no?: string | null;
  description?: string | null;

  currency_id?: string | null;
  currency_code: string;

  debit?: number;
  credit?: number;
  exchange_rate?: number;
};

export type BankOpeningBalanceCreatePayload = {
  lines: BankOpeningBalanceInput[];
};

export type BankOpeningBalanceQuery = {
  bankAccountId?: string;
  partyId?: string;
  partyType?: BankOpeningBalancePartyType;
  status?: BankOpeningBalanceStatus;
  id?: string;
}; */

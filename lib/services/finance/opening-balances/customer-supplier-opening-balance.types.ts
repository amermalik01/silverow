// lib/services/finance/opening-balances/customer-supplier-opening-balance.types.ts

export type OpeningBalancePartyType = "customer" | "supplier";

export type OpeningBalanceDocumentType =
  | "Invoice"
  | "Credit Note"
  | "Debit Note"
  | "Payment"
  | "Refund";

export type OpeningBalanceRow = {
  id: string;

  company_id: string;

  party_id: string;
  party_code: string | null;
  party_name: string;

  posting_date: string;

  doc_type: OpeningBalanceDocumentType;
  doc_no: string;
  external_ref_no: string;

  description: string;

  currency_id: string | null;
  currency_code: string;

  debit: number;
  credit: number;

  exchange_rate: number;

  amount_lcy: number;

  created_at: string;
  updated_at: string;
};

export type OpeningBalanceInput = {
  party_id: string;

  party_code?: string | null;
  party_name?: string | null;

  posting_date: string;

  doc_type: OpeningBalanceDocumentType;
  doc_no?: string | null;
  external_ref_no?: string | null;

  description?: string | null;

  currency_id?: string | null;
  currency_code: string;

  debit?: number;
  credit?: number;

  exchange_rate?: number;
};

export type OpeningBalanceCreatePayload = {
  lines: OpeningBalanceInput[];
};

export type OpeningBalanceQuery = {
  partyId?: string;
  id?: string;
};

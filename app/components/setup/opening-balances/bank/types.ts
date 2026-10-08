// app/components/setup/opening-balances/bank/types.ts

export type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

export type BankOpeningBalanceRow = {
  posting_date: string;

  party_type: "supplier" | "customer";
  party_id: string;
  party_code?: string;
  party_name: string;

  doc_type: "Payment" | "Refund";
  doc_no: string;
  external_ref_no: string;

  bank_gl_account_id: string;
  bank_gl_code?: string;
  bank_gl_name?: string;

  currency_id: string;
  currency_code: string;

  debit: number;
  credit: number;
  exchange_rate: number;
};

/**
 * Only fields that the table is allowed to edit.
 *
 * This prevents accidental changes to party identity fields,
 * such as party_id or party_type.
 */
export type EditableBankOpeningBalanceField =
  | "posting_date"
  | "doc_type"
  | "doc_no"
  | "external_ref_no"
  | "currency_id"
  | "debit"
  | "credit"
  | "exchange_rate";

// app/components/setup/opening-balances/gl/types.ts

export type GLAccountOpeningBalanceLineRow = {
  _stableKey: string;
  id?: string;

  posting_date: string;
  document_no: string;
  external_ref_no: string;

  gl_account_id: string;
  gl_account_no: string;
  gl_account_name: string;

  currency_code: string;
  debit: number;
  credit: number;
  exchange_rate: number;
  amount_lcy: number;

  posted?: boolean;
  posted_at?: string | null;
  general_ledger_document_no?: string | null;
};

export type GLAccountOpeningBalanceField = keyof GLAccountOpeningBalanceLineRow;

export type GLAccountOpeningBalanceFieldValue =
  GLAccountOpeningBalanceLineRow[GLAccountOpeningBalanceField];

export type GLAccountOpeningBalanceApiResponse = {
  data?: unknown;
  error?: string;
  message?: string;
};

export type GLAccountOption = {
  id: string;
  code: string;
  name: string;
};

export type GLAccountOpeningBalanceTotals = {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  totalLines: number;
  unpostedCount: number;
};

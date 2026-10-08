// app/components/setup/opening-balances/customer/types.ts

export type CustomerOpeningBalanceDocType = "Invoice" | "Credit Note";

export type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

export type CustomerOpeningBalanceRow = {
  posting_date: string;

  customer_id: string;
  customer_code?: string;
  customer_name: string;

  doc_type: CustomerOpeningBalanceDocType;
  doc_no: string;
  external_ref_no: string;

  currency_id: string;
  currency_code: string;

  debit: number;
  credit: number;

  exchange_rate: number;
};
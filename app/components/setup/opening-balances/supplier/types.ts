// app/components/setup/opening-balances/supplier/types.ts

export type SupplierOpeningBalanceDocType =
  | "Invoice"
  | "Debit Note";

export type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

export type SupplierOpeningBalanceRow = {
  posting_date: string;

  supplier_id: string;
  supplier_code?: string;
  supplier_name: string;

  doc_type: SupplierOpeningBalanceDocType;
  doc_no: string;
  external_ref_no: string;

  currency_id: string;
  currency_code: string;

  debit: number;
  credit: number;

  exchange_rate: number;
};
// /types/finance.ts

export type Account = {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
  vat_rate_id?: string | null;
  posting_group_id?: string | null;
  is_summary: boolean;
};

export type PostingGroup = {
  id: string;
  name: string;
};

export type ParentAccount = {
  id: string;
  code: string;
  name: string;
};

export type VatRate = {
  id: string;
  name: string;
  rate: number;
};

export type LedgerRow = {
  id: string;
  entry_date: string;
  reference: string;
  description: string | null;
  debit: number | string;
  credit: number | string;
};

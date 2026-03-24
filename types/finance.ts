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

export type JournalLine = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type Journal = {
  id: string;
  entry_no: number;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
  is_posted: boolean;
  lines: JournalLine[];
};

// export type JournalLine = {
//   id: string;
//   account_id: string;
//   debit: number;
//   credit: number;
//   description?: string | null;
// };

// export type Journal = {
//   id: string;
//   entry_no: number;
//   entry_date: string;
//   reference?: string | null;
//   description?: string | null;
//   lines: JournalLine[];
// };

export type JournalListItem = {
  id: string;
  entry_no: number;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
};

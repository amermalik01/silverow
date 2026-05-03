// types/journal.ts

export type JournalSource =
  | "GENERAL"
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "INVENTORY";

export type JournalModule = "customer" | "supplier" | "item" | "general";

export type JournalType = "customer" | "supplier" | "item" | "general";

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_no: number;
  entry_date: string;
  source: JournalSource;
  reference?: string;
  description?: string;
  is_posted: boolean;
  posted_at?: string;
  created_at: string;
}

export interface JournalPayload {
  entry_date: string;
  source: JournalSource;
  reference?: string;
  description?: string;
  lines: JournalLine[];
}

export interface Journal {
  id: string;
  company_id: string;
  entry_no: number;
  entry_date: string;
  source: JournalSource;
  type?: JournalType;
  reference?: string;
  description?: string;
  is_posted: boolean;
  posted_at?: string | null;
  created_at: string;
}

export interface JournalLine {
  id: string;
  company_id?: string;
  journal_id: string;
  account_id: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;

  // optional relations
  party_id?: string;
  item_id?: string;
}

export interface JournalWithLines {
  journal: Journal;
  lines: JournalLine[];
}

export interface JournalListItem {
  id: string;
  entry_no: number;
  entry_date: string;
  reference?: string;
  description?: string;
  is_posted: boolean;
}

// export interface JournalLine {
//   id?: string;
//   company_id?: string;
//   journal_id?: string;
//   account_id: string;
//   debit: number;
//   credit: number;
//   description?: string;

//   // optional relations
//   party_id?: string;
//   item_id?: string;
// }

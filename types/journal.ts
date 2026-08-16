// types/journal.ts

export type JournalSource = 
  | "GENERAL" 
  | "CUSTOMER_JOURNAL"
  | "SUPPLIER_JOURNAL"
  | "ITEM_JOURNAL"
  | "SALES" 
  | "PURCHASE" 
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

export interface JournalPayload2 {
  entry_date: string;
  source: JournalSource;
  reference?: string;
  description?: string;
  lines: JournalLineInput[];   // ✅ FIX HERE
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
  party_id?: string;
  item_id?: string;
  reference_type?: string;
  reference_id?: string;
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

export interface JournalLineInput {
  posting_date?: string;
  document_type?: string;
  document_no?: string;
  transaction_type?: "gl_no" | "customer" | "supplier" | "item"; 
  account_id: string;
  debit?: number;
  credit?: number;
  description?: string;
  party_id?: string;
  party_type?: string;
  item_id?: string;
  currency_id?: string;
  exchange_rate?: number;
  warehouse_id?: string;
  quantity?: number;
  unit_cost?: number;
  balancing_account_id?: string;
  reference_type?: string;
  reference_id?: string;
  currency_amount?: number;
}

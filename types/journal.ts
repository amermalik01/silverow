// types/journal.ts

export type JournalSource = 
  | "GENERAL" 
  | "CUSTOMER_JOURNAL"  // 🔥 Added
  | "SUPPLIER_JOURNAL"  // 🔥 Added (Good to add now for the next module)
  | "ITEM_JOURNAL"      // 🔥 Added (Good to add now for the next module)
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

// export interface JournalLineInput {
//   account_id: string;
//   debit?: number;
//   credit?: number;
//   description?: string;
//   party_id?: string;
//   item_id?: string;
//   currency_id?: string;
//   exchange_rate?: number;
//   warehouse_id?: string;
//   quantity?: number;
//   unit_cost?: number;
//   reference_type?: string;
//   reference_id?: string;
//   currency_amount?: number;
// }


export interface JournalLineInput {
  transaction_type?: "gl_no" | "customer" | "supplier" | "item"; // 🔥 Added to prevent type "any" errors
  account_id: string;
  debit?: number;
  credit?: number;
  description?: string;
  party_id?: string;
  item_id?: string;
  currency_id?: string;
  exchange_rate?: number;
  warehouse_id?: string;
  quantity?: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  currency_amount?: number;
}
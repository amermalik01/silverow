// types/posted-ledger.ts
export interface PostedLedgerEntry {
  entry_no: number | string;
  posting_date: string;
  document_type: string;
  document_number: string;
  gl_no: string;
  name: string;
  source_no: string;
  currency_code?: string;
  currency_factor?: number;
  debit_fcy: number;            // Debit FCY
  credit_fcy: number;           // Credit FCY
  net_amount_fcy: number;           // Total FCY
  debit_lcy?: number;       // Debit LCY
  credit_lcy?: number;      // Credit LCY
  net_amount_lcy: number;       // Total LCY
  user_id: string;
  created_at?: string;
}
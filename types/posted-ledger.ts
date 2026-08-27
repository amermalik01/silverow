// types/posted-ledger.ts

// export interface PostedLedgerEntry {
//   entry_no: number | string;
//   posting_date: string;
//   document_type: string;
//   document_number: string;
//   gl_no: string;
//   name: string;
//   source_no: string;
//   currency_code?: string;
//   currency_factor?: number;
//   debit: number;            // Debit FCY
//   credit: number;           // Credit FCY
//   amount: number;           // Total FCY
//   debit_lcy?: number;       // Debit LCY
//   credit_lcy?: number;      // Credit LCY
//   amount_lcy: number;       // Total LCY
//   total?: number;       // Total LCY
//   user_id: string;
//   created_at?: string;
// }



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
  debit: number;            // Debit FCY
  credit: number;           // Credit FCY
  amount: number;           // Total FCY
  debit_lcy?: number;       // Debit LCY
  credit_lcy?: number;      // Credit LCY
  amount_lcy: number;       // Total LCY
  user_id: string;
  created_at?: string;
}
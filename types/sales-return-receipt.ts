// types/sales-return-receipt.ts

export interface SalesReturnReceiptHeaderInput {
  credit_note_id: string;
  customer_id?: string;
  receipt_date: string;
  posting_date: string;
  reference_no?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  userId?: string;
}

export interface SalesReturnReceiptLineInput {
  line_no: number;
  credit_note_line_id: string;
  item_id: string;
  warehouse_id: string;
  location_id?: string | null;
  bin_code?: string | null;
  batch_no?: string | null;
  serial_no?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_cost: number;
  source_allocation_id?: string | null;
}

export interface SalesReturnReceiptPayload {
  receipt: SalesReturnReceiptHeaderInput;
  lines: SalesReturnReceiptLineInput[];
}
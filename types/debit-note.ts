// types/debit-note.ts

export type DebitNoteStatus = string;

export interface DebitNote {
  id?: string;
  company_id?: string;
  debit_note_no?: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id?: string;
  currency_id?: string;
  exchange_rate?: number;
  document_date: string;
  reference?: string;
  notes?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status?: DebitNoteStatus;
  created_at?: string;
  is_posted?: boolean;
}

export type DebitNoteAddressType = "billing" | "shipping";

export interface DebitNoteAddress {
  id?: string;
  debit_note_id?: string;
  address_type: DebitNoteAddressType;
  name?: string;
  phone?: string;
  email?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface DebitNotePayload {
  debitNote: DebitNote;
  billing_address?: DebitNoteAddress;
  shipping_address?: DebitNoteAddress;
  lines: DebitNoteLine[];
}

export type DebitNoteLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface DebitNoteLine {
  id?: string;
  debit_note_id?: string;
  line_no?: number;
  line_type: DebitNoteLineType;
  
  /* ITEM */
  item_id?: string;
  item_code?: string;
  item_name?: string;

  /* GL ACCOUNT */
  gl_account_id?: string;
  account_code?: string;
  account_name?: string;

  description?: string;
  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  warehouse_location_id?: string | null;

  uom_id?: string;
  uom_name?: string;

  quantity: number;
  unit_cost: number;

  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;
  discount_amount?: number;
  original_amount?: number;
  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;
  vat_percent?: number;
  vat_amount?: number;
  net_amount?: number;
  gross_amount?: number;
}
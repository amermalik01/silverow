// types/debit-note.ts

export type DebitNoteStatus = string;

export interface DebitNote {
  id?: string;
  company_id?: string;
  debit_note_no?: string;
  supplier_id: string;
  supplier_no?: string;
  supplier_name?: string;

  pay_to_supplier_id: string;
  pay_to_supplier_no?: string;
  pay_to_supplier_name?: string;
  
  warehouse_id?: string;

  stage_id?: string;
  stage_name?: string;
  current_stage?: string;

  purchaser?: string;
  consignment_no?: string;
  supp_order_no?: string;
  link_to_so_no?: string;
  anonymous_supplier?: boolean;

  order_date: string;
  req_receipt_date: string;
  receipt_date: string;
  expected_date?: string;
  invoice_date?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;
  previous_code?: string;

  purchase_posting_group_id?: string;
  supplier_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  contact?: string;
  book_in_phone?: string;
  book_in_contact?: string;
  book_in_email?: string;

  shipment_method_id?: string;
  shipment_method?: string;
  shipping_agent?: string;
  shipment_ref_no?: string;
  warehouse_booking_ref_no?: string;
  supplier_booking_ref_no?: string;
  // shipment_po_not_req?: boolean;
  reason?: string;

  apply_to_pi?: string;
  apply_to_pi_id?: string;
  linked_po?: string;

  currency_id?: string;
  exchange_rate?: number;
  document_date: string;
  reference?: string;

  freight_charges?: number;
  shipment_date?: string;
  delivery_date?: string;
  delivery_time?: string;

  notes?: string;
  internal_notes?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status?: DebitNoteStatus;
  created_at?: string;
  is_dispatched?: boolean;
  is_posted?: boolean;
}

export type DebitNoteAddressType = "primary" | "billing" | "shipping";

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
  county?: string;  
  contact_person?: string;
  contact_name?: string;
}

export interface DebitNotePayload {
  debitNote: DebitNote;
  primary_address?: DebitNoteAddress;
  billing_address?: DebitNoteAddress;
  shipping_address?: DebitNoteAddress;
  lines: DebitNoteLine[];
}

export type DebitNoteLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface DebitNoteLine {
  id?: string;
  debit_note_id?: string;
  line_no?: number;
  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
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
  returned_quantity?: string | number;
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

  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;
}

export interface LookupItem {
  id: string;
  name: string;
}

export interface PaymentTermLookup extends LookupItem {
  days: number;
}

export interface CurrencyLookup {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

export interface OrderStageLookup {
  id: string;
  name: string;
  rank: number;
}

export interface DebitNoteMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}

export interface StockDispatchHeader {
  id?: string;
  dispatch_no?: string;
  vendor_id: string;
  debit_note_id?: string;
  warehouse_id?: string;
  dispatch_date: string;
  posting_date: string;
  reference_no?: string;
  notes?: string;
  status?: string;
  is_posted?: boolean;
}

export interface StockDispatchLine {
  id?: string;
  debit_note_line_id?: string;
  line_no?: number;
  item_id: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  bin_code?: string;
  batch_no?: string;
  serial_no?: string;
  expiry_date?: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
}

export interface StockDeAllocationPayload {
  dispatch: StockDispatchHeader;
  lines: StockDispatchLine[];
}
// types/sales-return.ts

export type SalesReturnStatus = string;

export type SalesReturn = {
  id?: string;
  company_id?: string;
  credit_note_no?: string;
  posted_credit_note_no?: string;

  customer_id: string;
  customer_no?: string;
  customer_name?: string;

  bill_to_customer_id: string;
  bill_to_customer_no?: string;
  bill_to_customer_name?: string;

  sales_posting_group_id?: string;
  customer_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  sales_invoice_id?: string;
  sales_invoice?: string;
  stage_id?: string;
  stage_name?: string;
  current_stage?: string;

  currency_id?: string;
  exchange_rate?: string | number;

  reference?: string;
  salesperson_id?: string;
  salesperson?: string;
  cust_return_no?: string;
  cust_order_no?: string;
  consignment_no?: string;

  credit_note_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  order_date?: string;

  receipt_date?: string;
  subtotal?: number;
  vat_amount?: number;
  total_amount?: number;
  discount_amount?: number;
  credited_amount?: number;
  invoiced_amount?: number;
  email?: string;
  link_to_cm?: string;

  internal_notes?: string;
  notes?: string;
  source_of_return?: string;
  credit_status?: string;

  receivable_bank?: string;
  receivable_bank_id?: string;
  due_date?: string;

  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  status?: SalesReturnStatus;

  created_at?: string;
  updated_at?: string;
  posted_at?: string;
  created_by?: string;
  updated_by?: string;
  approved_at?: string;
  closed_at?: string;
  cancelled_at?: string;
  is_posted?: boolean;

  link_to_po?: string;
  sq_no?: string;

  shipment_status?: string;
  source_of_order?: string;
  invoice_status?: string;
  anonymous_customer?: boolean;

  contact?: string;
  book_in_phone?: string;
  book_in_contact?: string;
  book_in_email?: string;

  shipment_method?: string;
  shipment_method_id?: string;
  shipping_agent?: string;
  shipment_ref_no?: string;
  warehouse_ref_no?: string;
  cust_warehouse_ref_no?: string;
  reason?: string;

  finance_charges?: number;
  insurance_charges?: number;
  converted_by?: string;
  freight_charges?: number;
  shipment_date?: string;
  delivery_time?: string;
};

export type SalesReturnAddressType = "primary" | "billing" | "shipping";

export interface SalesReturnAddress {
  id?: string;
  company_id?: string;
  credit_note_id?: string;
  address_type: SalesReturnAddressType;
  name?: string;
  company_name?: string;
  attention?: string;
  phone?: string;
  email?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  contact_name?: string;
}

export type SalesReturnPayload = {
  returnOrder: SalesReturn;

  primary_address?: SalesReturnAddress | null;
  billing_address?: SalesReturnAddress | null;
  shipping_address?: SalesReturnAddress | null;

  lines: SalesReturnLine[];
  allow_empty_lines: boolean;
};

export type SalesReturnLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface SalesReturnLine {
  _key?: string;
  id?: string;
  credit_note_id?: string;
  sales_invoice_line_id?: string;

  line_no?: number;
  line_type: SalesReturnLineType;

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

  uom_id?: string;
  uom_name?: string;

  quantity: number;
  returned_quantity?: number;
  cancelled_quantity?: number;

  unit_price: number;
  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;
  discount_amount?: number;

  vat_percent?: number;
  vat_amount?: number;

  net_amount?: number;
  gross_amount?: number;
  line_amount?: number;
  line_total?: number;

  original_amount?: number;

  return_reason_code?: string;

  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;
}

export interface SalesReturnLineUI extends SalesReturnLine {
  _stableKey?: string;
  reserved_quantity?: string | number;
  available_stock?: string | number;
  is_allocated?: boolean;

  // allocations?: SO_StockAllocationRecord[];
  // initialAllocations?: SO_StockAllocationRecord[];
  // stock_allocations?: SO_StockAllocationRecord[];
  // po_line_allocations?: SO_StockAllocationRecord[];
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

export interface SalesReturnMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}

export type SalesReturnListing = {
  id?: string;
  company_id?: string;
  credit_note_id?: string;
  sales_invoice_line_id?: string;

  customer_id: string;
  customer_no?: string;
  customer_name?: string;
  reference?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  dispatch_date?: string;
  delivery_date?: string;

  invoice_date?: string;
  order_date?: string;
  due_date?: string;
  requested_delivery_date?: string;
  receiptDate?: string;
  posting_date?: string;

  currency_id?: string;
  currency_code?: string;
  exchange_rate?: string | number;
  subtotal?: number;
  vat_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  invoiced_amount?: number;
  email?: string;
  salesperson?: string;
  cust_order_no?: string;
  link_to_po?: string;
  sq_no?: string;

  internal_notes?: string;
  notes?: string;
  status?: string;
  shipment_status?: string;
  source_of_order?: string;
  invoice_status?: string;
  created_at?: string;
  updated_at?: string;
  sales_quote_id?: string;
  sales_quote_no?: string;
  anonymous_customer?: boolean;

  contact?: string;
  book_in_phone?: string;
  book_in_contact?: string;
  book_in_email?: string;

  shipment_method?: string;
  shipment_method_id?: string;
  shipping_agent?: string;
  shipment_ref_no?: string;
  warehouse_ref_no?: string;
  cust_warehouse_ref_no?: string;
  reason?: string;

  finance_charges?: number;
  insurance_charges?: number;
  converted_by?: string;
  freight_charges?: number;
  shipment_date?: string;
  delivery_time?: string;

  // --- Display & Data Grid Computed Fields ---
  sale_order_code?: string;
  sale_quote_code?: string;
  prev_code?: string;

  sell_to_cust_no?: string;
  sell_to_cust_name?: string;
  sell_to_address?: string;
  sell_to_address2?: string;
  sell_to_city?: string;
  sell_to_county?: string;
  sell_to_post_code?: string;
  country_code?: string;
  sell_to_contact_no?: string;
  cust_phone?: string;
  cust_email?: string;

  sale_person?: string;
  bill_to_posting_group_name?: string;
  segment?: string;

  offer_date?: string;
  converted_to_so_on?: string;

  net_amount?: number;
  tax_amount?: number;
  grand_total?: number;

  finance_charges_exists?: boolean;
  insurance_charges_exists?: boolean;
  proof_of_delivery?: string;

  shipping_agent_code?: string;
  shipment_method_code?: string;
  ship_to_address?: string;
  ship_to_address2?: string;
  ship_to_city?: string;
  ship_to_county?: string;
  ship_to_post_code?: string;

  customer_address?: string;
  customer_address2?: string;
  city?: string;
  county?: string;
  post_code?: string;

  book_in_tel?: string;
  comm_book_in_contact?: string;
  warehouse_booking_ref?: string;
  customer_warehouse_ref?: string;
  linked_pos_1?: string;
  converted_to_so_by_name?: string;
};

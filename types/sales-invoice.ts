// /types/sales-invoice.ts

export type SalesInvoice = {
  id?: string;
  company_id?: string;
  invoice_no?: string;
  sales_order_id?: string;
  sales_order_no?: string;
  customer_id: string;
  customer_no?: string;
  customer_name?: string;
  reference?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  invoice_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  vat_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;

  email?: string;
  salesperson?: string;
  cust_order_no?: string;
  link_to_po?: string;
  sq_no?: string;

  internal_notes?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  is_posted?: boolean;
  posted_at?: string;
  posted_by?: string;
  journal_entry_id?: string;

  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
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
  freight_charges?: number;
  shipment_date?: string;
  delivery_time?: string;
};

export type SalesInvoiceAddressType = "primary" | "billing" | "shipping";

export interface SalesInvoiceAddress {
  id?: string;
  sales_invoice_id?: string;
  address_type: SalesInvoiceAddressType;
  contact_name?: string;
  name?: string;
  company_name?: string;
  attention?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

export type SalesInvoiceLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface SalesInvoiceLine {
  id?: string;
  sales_invoice_id?: string;
  sales_order_line_id?: string;
  line_no?: number;
  line_type: SalesInvoiceLineType;

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
  unit_price: number;
  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;
  discount_amount?: number;

  vat_percent?: number;
  vat_amount?: number;
  net_amount?: number;
  gross_amount?: number;
  line_amount?: number;

  original_amount?: number;
}

export type SalesInvoicePayload = {
  invoice: SalesInvoice;
  primary_address?: SalesInvoiceAddress;
  billing_address?: SalesInvoiceAddress;
  shipping_address?: SalesInvoiceAddress;
  lines: SalesInvoiceLine[];
};

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

export interface InvoiceStageLookup {
  id: string;
  name: string;
  rank: number;
}

export interface SalesInvoiceMasterData {
  currencies: CurrencyLookup[];
  stages: InvoiceStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}

export type SalesInvoiceLineUI = SalesInvoiceLine & {
  item_code?: string;
  item_name?: string;
  account_code?: string;
  account_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_name?: string;
  line_total?: number;
  gl_account_id?: string;
};

export type SalesInvoiceListing = {
  id?: string;
  company_id?: string;
  invoice_no?: string;
  sales_order_id?: string;
  sales_order_no?: string;
  customer_id: string;
  customer_no?: string;
  customer_name?: string;
  reference?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  invoice_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  vat_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;

  email?: string;
  salesperson?: string;
  cust_order_no?: string;
  link_to_po?: string;
  sq_no?: string;

  internal_notes?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  is_posted?: boolean;
  posted_at?: string;
  posted_by?: string;

  created_at?: string;
  updated_at?: string;
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
  freight_charges?: number;
  shipment_date?: string;
  delivery_time?: string;

  // --- Display & Data Grid Computed Fields ---
  sale_invoice_code?: string;
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

  net_amount?: number;
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

  book_in_tel?: string;
  comm_book_in_contact?: string;
  warehouse_booking_ref?: string;
  customer_warehouse_ref?: string;
};
// /types/sales-order.ts

export type SalesOrder = {
  id?: string;
  company_id?: string;
  order_no?: string;
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

  sales_posting_group_id?: string;
  customer_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  order_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  tax_amount?: number;
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
};

export type SalesOrderAddressType = "primary" | "billing" | "shipping";

export interface SalesOrderAddress {
  id?: string;
  sales_order_id?: string;
  address_type: SalesOrderAddressType;
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

export type SalesOrderLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface SalesOrderLine {
  id?: string;
  sales_order_id?: string;
  sales_quote_line_id?: string;
  line_no?: number;
  line_type: SalesOrderLineType;

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
  // warehouse_location_id?: string | null;
  is_allocated?: boolean;

  uom_id?: string;
  uom_name?: string;

  quantity: number;

  quantity_reserved?: number;
  quantity_shipped?: number;
  quantity_invoiced?: number;

  is_deleted?: boolean;

  unit_price: number;
  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;
  discount_amount?: number;
  original_amount?: string | number;

  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;

  vat_percent?: number;
  vat_amount?: number;
  net_amount?: number;
  gross_amount?: number;
  line_amount?: number;
  line_total?: number;
  
  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;

  deleted_at?: string;
  deleted_by?: string;
  updated_at?: string;
}

// export type SalesOrderLineUI = SalesOrderLine & {
//   item_code?: string;
//   item_name?: string;
//   account_code?: string;
//   account_name?: string;
//   warehouse_code?: string;
//   warehouse_name?: string;
//   uom_name?: string;
//   line_total?: number;
//   gl_account_id?: string;
//   available_stock?: number;
// };

export type SalesOrderPayload = {
  order: SalesOrder;
  primary_address?: SalesOrderAddress;
  billing_address?: SalesOrderAddress;
  shipping_address?: SalesOrderAddress;
  lines: SalesOrderLine[];
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

export interface OrderStageLookup {
  id: string;
  name: string;
  rank: number;
}

export interface SalesOrderMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}



export interface SalesOrderLineUI extends SalesOrderLine {
  reserved_quantity?: string | number;
  available_stock?: string | number;
  is_allocated?: boolean;

  allocations?: Array<{
    quantity: number;
    [key: string]: unknown;
  }>;

  initialAllocations?: Array<{
    quantity: number;
    [key: string]: unknown;
  }>;
}

export type SalesOrderListing = {
  id?: string;
  company_id?: string;
  order_no?: string;
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

  order_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
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

  book_in_tel?: string;
  comm_book_in_contact?: string;
  warehouse_booking_ref?: string;
  customer_warehouse_ref?: string;
  linked_pos_1?: string;
  converted_to_so_by_name?: string;
};
/* 
import { SalesLine } from "./sales-line";

export type SalesOrderLine = SalesLine;

export type SalesOrder = {
  id?: string;
  company_id?: string;
  order_no?: string;
  customer_id: string;
  customer_no: string;
  customer_name?: string;
  reference?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  order_date: string;
  posting_date: string;
  dispatch_date: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  tax_amount?: number;
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
  // delivery_date?: string;
  delivery_time?: string;
};

export type SalesOrderAddressType = "primary" | "billing" | "shipping";
export interface SalesOrderAddress {
  id?: string;
  purchase_order_id?: string;
  address_type: SalesOrderAddressType;
  contact_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export type SalesOrderPayload = {
  order: SalesOrder;
  primary_address?: SalesOrderAddress;
  billing_address?: SalesOrderAddress;
  shipping_address?: SalesOrderAddress;
  lines: SalesOrderLine[];
};

export type SalesOrderLineUI = SalesOrderLine & {
  item_code?: string;
  item_name?: string;
  account_code?: string;
  account_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_name?: string;
  line_total?: number;
  gl_account_id?: string;
  available_stock?: number;
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

export interface OrderStageLookup {
  id: string;
  name: string;
  rank: number;
}

export interface SalesOrderMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}
 */
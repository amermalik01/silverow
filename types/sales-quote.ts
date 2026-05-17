// types/sales-quote.ts

export type SalesQuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type SalesOrderAddressType = "billing" | "shipping";

/**
 * STAMPED ADDRESS
 * Saved per order
 */
export interface SalesOrderAddress {
  id?: string;

  sale_order_id?: string;

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

export interface SalesQuote {
  id?: string;

  company_id?: string;

  quote_no?: string;

  customer_id: string;

  customer_name?: string;

  warehouse_id?: string;

  currency_id?: string;
  exchange_rate?: string;

  quote_date: string;
  valid_until?: string;

  expiry_date?: string;

  reference_no?: string;

  notes?: string;

  subtotal?: number;

  tax_amount?: number;

  total_amount?: number;

  status?: SalesQuoteStatus;

  created_at?: string;
}


export interface SalesQuoteLine {
  id?: string;
  line_type: "ITEM" | "GL_ACCOUNT" | "SERVICE" | "COMMENT";

  item_id?: string;
  gl_account_id?: string;

  service_name?: string;

  description?: string;

  quantity: number;
  unit_price: number;

  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;

  tax_percent?: number;

  original_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

export type SalesQuoteLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface SalesQuoteLine2 {
  id?: string;

  sales_quote_id?: string;

  line_no?: number;
  line_type?: SalesQuoteLineType;

  item_id?: string;
  item_code?: string;
  item_name?: string;

  /*
   * GL ACCOUNT
   */
  gl_account_id?: string;
  account_code?: string;
  account_name?: string;

  description?: string;

  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;

  quantity: number;

  unit_price: number;

  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;

  discount_percent?: number;

  discount_amount?: number;

  original_amount?: number;
  net_amount?: number;

  tax_percent?: number;

  tax_amount?: number;
  total_amount?: number;

  line_total?: number;
}

export interface SalesQuoteLineUI extends SalesQuoteLine2 {
  item_code?: string;
  account_code?: string;
  account_name?: string;

  available_stock?: number;
}

export interface SalesQuotePayload {
  quote: SalesQuote;

  lines: SalesQuoteLine2[];
}
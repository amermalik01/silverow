// types/sales-quote.ts

import { PO_StockAllocationRecord } from "@/app/components/shared/modals/PO_StockAllocationModal";

export type SalesQuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

export type SalesQuoteConversionStatus =
  | "NOT_CONVERTED"
  | "PARTIALLY_CONVERTED"
  | "FULLY_CONVERTED";

export type SalesQuoteLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export type SalesQuoteLineStatus =
  | "OPEN"
  | "PARTIALLY_CONVERTED"
  | "FULLY_CONVERTED"
  | "CANCELLED";

export type SalesQuoteDiscountType = "PERCENT" | "FIXED";

export type SalesQuote = {
  id?: string;
  company_id?: string;

  quote_no?: string;

  customer_id: string;
  customer_no?: string;
  customer_name?: string;

  bill_to_customer_id: string;
  bill_to_customer_no?: string;
  bill_to_customer_name?: string;

  customer_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  order_date: string;
  posting_date?: string;
  dispatch_date?: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  due_date?: string;

  stage_id?: string;
  stage_name?: string;
  current_stage?: string;

  currency_id?: string;
  currency_code?: string;
  exchange_rate?: string | number;

  quote_date: string;
  valid_from?: string;
  valid_until?: string;

  salesperson_id?: string;
  salesperson?: string;

  reference?: string;
  customer_reference?: string;

  source_of_quote?: string;

  opportunity_id?: string;

  contact_id?: string;

  payment_terms_id?: string;
  payment_terms?: string;

  payment_method_id?: string;
  payment_method?: string;

  receivable_bank_id?: string;
  receivable_bank?: string;

  shipment_method_id?: string;
  shipment_method?: string;

  shipping_agent?: string;

  warehouse_id?: string;
  warehouse_name?: string;

  subtotal?: number;
  discount_amount?: number;
  freight_charges?: number;
  finance_charges?: number;
  insurance_charges?: number;
  vat_amount?: number;
  tax_amount?: number;
  total_amount?: number;

  status?: SalesQuoteStatus;

  conversion_status?: SalesQuoteConversionStatus;

  is_posted?: boolean;
  is_expired?: boolean;
  is_accepted?: boolean;
  is_rejected?: boolean;
  is_cancelled?: boolean;
  is_converted?: boolean;

  accepted_at?: string;
  accepted_by?: string;

  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;

  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  expired_at?: string;

  converted_at?: string;
  converted_by?: string;

  anonymous_customer?: boolean;

  email?: string;
  contact?: string;
  phone?: string;

  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;

  cust_order_no?: string;
  payable_bank?: string;
  payable_bank_id?: string;
  link_to_po?: string;

  book_in_phone?: string;
  book_in_contact?: string;
  book_in_email?: string;

  warehouse_ref_no?: string;
  shipment_ref_no?: string;
  cust_warehouse_ref_no?: string;
  delivery_time?: string;

  reason?: string;

  version?: number;

  created_by?: string;
  updated_by?: string;

  created_at?: string;
  updated_at?: string;

  posted_at?: string;
};

export type SalesQuoteAddressType = "primary" | "billing" | "shipping";

export interface SalesQuoteAddress {
  id?: string;
  company_id?: string;

  sales_quote_id?: string;

  address_type: SalesQuoteAddressType;

  name?: string;
  company_name?: string;

  contact_name?: string;
  contact_person?: string;

  attention?: string;

  phone?: string;
  email?: string;

  address_1?: string;
  address_2?: string;

  city?: string;
  county?: string;
  state?: string;

  postcode?: string;
  country?: string;

  created_at?: string;
  updated_at?: string;
}

export interface SalesQuoteLine {
  _key?: string;
  id?: string;
  company_id?: string;
  sales_quote_id?: string;
  line_no?: number;
  line_type: SalesQuoteLineType;

  item_id?: string;
  item_code?: string;
  item_name?: string;

  gl_account_id?: string;
  account_code?: string;
  account_name?: string;

  description?: string;

  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;

  warehouse_location_id?: string;

  uom_id?: string;
  uom_name?: string;

  quantity: number;
  quantity_converted?: number;
  quantity_remaining?: number;

  unit_price: number;

  discount_type?: SalesQuoteDiscountType;
  discount_value?: number;
  discount_amount?: number;

  original_amount?: string | number;

  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;

  vat_percent?: number;
  vat_amount?: number;

  line_amount?: number;
  net_amount?: number;
  gross_amount?: number;

  line_status?: SalesQuoteLineStatus;

  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;

  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;

  created_at?: string;
  updated_at?: string;
}

export interface SalesQuoteLineUI extends SalesQuoteLine {
  _stableKey?: string;

  reserved_quantity?: string | number;
  available_stock?: string | number;

  is_allocated?: boolean;

  allocations?: PO_StockAllocationRecord[];
  initialAllocations?: PO_StockAllocationRecord[];
  stock_allocations?: PO_StockAllocationRecord[];
  po_line_allocations?: PO_StockAllocationRecord[];
}

export interface SalesQuoteOrderConversion {
  id?: string;
  company_id?: string;

  sales_quote_id: string;
  sales_order_id: string;

  conversion_no?: number;
  conversion_date?: string;
  converted_by?: string;

  notes?: string;

  created_at?: string;
  sales_order_no?: string;
}

export interface SalesQuoteConversionLine {
  id?: string;

  company_id?: string;

  sales_quote_id: string;

  sales_quote_line_id: string;

  sales_order_id: string;

  sales_order_line_id: string;

  quantity_converted: number;

  converted_at?: string;

  converted_by?: string;

  created_at?: string;

  /**
   * Optional display fields.
   */
  quote_no?: string;
  sales_order_no?: string;
  item_code?: string;
  item_name?: string;
}

export type SalesQuotePayload = {
  quote: SalesQuote;

  primary_address?: SalesQuoteAddress | null;
  billing_address?: SalesQuoteAddress | null;
  shipping_address?: SalesQuoteAddress | null;

  lines: SalesQuoteLine[];
  allow_empty_lines?: boolean;
};

export interface SalesQuoteConversionRequest {
  sales_quote_id: string;
  lines: SalesQuoteConversionRequestLine[];
}

export interface SalesQuoteConversionRequestLine {
  sales_quote_line_id: string;
  quantity: number;
}
export interface SalesQuoteConversionResult {
  sales_quote_id: string;
  sales_order_id: string;
  sales_order_no?: string;

  conversion_status: SalesQuoteConversionStatus;
  converted_lines: SalesQuoteConversionResultLine[];
}

export interface SalesQuoteConversionResultLine {
  sales_quote_line_id: string;
  sales_order_line_id: string;

  quantity_converted: number;
  quantity_remaining: number;
}

export type SalesQuoteListing = {
  id?: string;
  company_id?: string;

  quote_no?: string;

  customer_id: string;
  customer_no?: string;
  customer_name?: string;

  customer_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  reference?: string;
  customer_reference?: string;

  stage_id?: string;
  stage_name?: string;
  current_stage?: string;

  quote_date: string;
  valid_from?: string;
  valid_until?: string;

  requested_delivery_date?: string;

  currency_id?: string;
  currency_code?: string;
  exchange_rate?: string | number;

  salesperson_id?: string;
  salesperson?: string;

  payment_terms_id?: string;
  payment_terms?: string;

  payment_method_id?: string;
  payment_method?: string;

  receivable_bank_id?: string;
  receivable_bank?: string;

  shipment_method_id?: string;
  shipment_method?: string;

  shipping_agent?: string;

  warehouse_id?: string;
  warehouse_name?: string;

  subtotal?: number;
  discount_amount?: number;
  vat_amount?: number;
  freight_charges?: number;
  finance_charges?: number;
  insurance_charges?: number;
  total_amount?: number;

  email?: string;
  contact?: string;
  phone?: string;

  status?: SalesQuoteStatus;

  conversion_status?: SalesQuoteConversionStatus;

  is_posted?: boolean;
  is_expired?: boolean;
  is_accepted?: boolean;
  is_rejected?: boolean;
  is_cancelled?: boolean;
  is_converted?: boolean;

  accepted_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  expired_at?: string;
  converted_at?: string;
  converted_by?: string;

  notes?: string;
  internal_notes?: string;

  source_of_quote?: string;

  anonymous_customer?: boolean;

  created_at?: string;
  updated_at?: string;

  sale_quote_code?: string;
  sale_order_code?: string;

  converted_to_so_on?: string;
  converted_to_so_by_name?: string;

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

  net_amount?: number;
  tax_amount?: number;
  grand_total?: number;

  finance_charges_exists?: boolean;
  insurance_charges_exists?: boolean;

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

export interface SalesQuoteMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}

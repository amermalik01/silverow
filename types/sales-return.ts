// /types/sales-return.ts

import { SalesLine } from "./sales-line";

// If your return lines structure exactly matches your standard sales line, alias it here.
// If you ever need return-specific DB line fields, you can extend SalesLine instead.
export type SalesReturnLine = SalesLine;

export type SalesReturn = {
  id?: string;
  company_id?: string;
  return_no?: string;
  customer_id: string;
  customer_no: string;
  customer_name?: string;

  reference?: string;
  return_date: string;
  posting_date: string;
  receipt_date: string; // Corresponds to the Return Logistics delivery/arrival track
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  credited_amount?: number; // Unique tracking metrics for credit memos issued against returns
  email?: string;
  salesperson?: string;
  cust_return_no?: string;
  link_to_cm?: string; // Reference connection to credit memo document

  internal_notes?: string;
  notes?: string;
  status?: string;
  source_of_return?: string;
  credit_status?: string; // e.g., 'PENDING', 'CREDITED', 'PARTIAL'
  created_at?: string;
  updated_at?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  order_date: string;
  dispatch_date: string;
  requested_delivery_date?: string;
  delivery_date?: string;
  invoiced_amount?: number;
  cust_order_no?: string;
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
  sales_return_id?: string;
  address_type: SalesReturnAddressType;
  name?: string;
  contact_name?: string;
  company_name?: string;
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

export type SalesReturnPayload = {
  returnOrder: SalesReturn;

  primary_address?: Partial<SalesReturnAddress>;
  billing_address?: Partial<SalesReturnAddress>;
  shipping_address?: Partial<SalesReturnAddress>;
  lines: SalesReturnLine[];
};

export interface SalesReturnLineUI extends SalesReturnLine {
  item_code?: string;
  item_name?: string;
  account_code?: string;
  account_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_name?: string;
  line_total?: number;
  gl_account_id?: string;
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

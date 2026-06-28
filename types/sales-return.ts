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
  notes?: string;
  status?: string;
  source_of_return?: string;
  credit_status?: string; // e.g., 'PENDING', 'CREDITED', 'PARTIAL'
  created_at?: string;
  updated_at?: string;
};

export type SalesReturnAddressType = "billing" | "shipping";

export interface SalesReturnAddress {
  id?: string;
  sales_return_id?: string;
  address_type: SalesReturnAddressType;
  name?: string; // Maps to form handling name fields
  contact_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  county?: string; // Integrated with regional billing/shipping form tab
  postcode?: string;
  country?: string;
}

export type SalesReturnPayload = {
  returnOrder: SalesReturn;
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
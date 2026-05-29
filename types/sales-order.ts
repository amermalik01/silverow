// /types/sales-order.ts

import { SalesLine } from "./sales-line";

export type SalesOrderLine = SalesLine;

export type SalesOrder = {
  id?: string;
  company_id?: string;
  order_no?: string;
  customer_id: string;
  customer_name?: string;
  reference?: string;
  order_date: string;
  requested_delivery_date?: string;
  currency_id?: string;
  exchange_rate?: number;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  invoiced_amount?: number;

  notes?: string;
  status?: string;
  shipment_status?: string;
  invoice_status?: string;
  created_at?: string;
  updated_at?: string;
  sales_quote_id?: string;
};

export type SalesOrderAddressType = "billing" | "shipping";
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
  billing_address?: SalesOrderAddress;
  shipping_address?: SalesOrderAddress;
  lines: SalesOrderLine[];
};

export interface SalesOrderLineUI extends SalesOrderLine {
  item_code?: string;
  account_code?: string;
  account_name?: string;
  available_stock?: number;
}

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

/**
 * STAMPED ADDRESS
 * Saved per order
 */
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

// export type SalesOrderLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

/* export type SalesOrderLine = {
  id?: string;

  sales_order_id?: string;

  sales_quote_line_id?: string;

  line_no?: number;

  line_type: SalesOrderLineType;

  item_id?: string;

  item_code?: string;

  item_name?: string;

  description?: string;

  warehouse_id?: string;

  warehouse_code?: string;

  warehouse_name?: string;

  quantity: number;

  reserved_quantity?: number;

  shipped_quantity?: number;

  invoiced_quantity?: number;

  unit_price: number;

  discount_amount?: number;

  tax_amount?: number;

  line_total?: number;
}; */

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

/* 
export type SalesOrder = {
  id?: string;

  company_id?: string;

  order_no?: string;

  customer_id: string;

  customer_name?: string;

  reference?: string;

  sales_quote_id?: string;

  order_date: string;

  requested_delivery_date?: string;

  currency_id?: string;

  exchange_rate?: number;

  subtotal?: number;

  tax_amount?: number;

  total_amount?: number;

  status?: string;

  notes?: string;
}; */
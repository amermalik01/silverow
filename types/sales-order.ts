// /types/sales-order.ts

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
  reason?: string;
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

// export interface SalesOrderLineUI extends SalesOrderLine {
//   item_code?: string;
//   account_code?: string;
//   account_name?: string;
//   available_stock?: number;
// }

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

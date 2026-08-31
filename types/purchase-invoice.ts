// types/purchase-invoice.ts

import { PurchaseOrderAddress } from "./purchase-order";

export type PurchaseInvoiceStatus = string;

export interface PurchaseInvoice {
  id?: string;
  company_id?: string;
  invoice_no?: string;
  invoice_code?: string; // Legacy/Display alias for invoice_no
  purchase_order_id?: string; // Links back to source PO
  purchase_order_no?: string;
  order_code?: string; // Legacy/Display alias for purchase_order_no
  
  supplier_id: string;
  supplier_no?: string;
  supplier_name?: string;

  pay_to_supplier_id: string;
  pay_to_supplier_no?: string;
  pay_to_supplier_name?: string;

  supplier_invoice_no?: string;
  supp_order_no?: string;
  prev_code?: string;
  sell_to_cust_no?: string;
  sell_to_cust_name?: string;

  // Supplier Address (mapped from PO primary address)
  sell_to_address?: string;
  sell_to_address2?: string;
  sell_to_city?: string;
  sell_to_county?: string;
  sell_to_post_code?: string;
  country?: string;
  sell_to_contact_no?: string;
  cust_phone?: string;
  cust_email?: string;

  // SRM & Grouping Details
  srm_purchase_code?: string;
  purchaser?: string;
  posting_grp?: string;
  supplier_posting_group_id?: string;
  vat_business_posting_group_id?: string;
  segment?: string;
  currency_id?: string;
  crcode?: string; // Currency code string
  currency_code?: string;
  exchange_rate?: number;

  stage_id?: string;
  stage_name?: string;
  current_stage?: string;

  // Amounts
  subtotal?: number;
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  grand_total?: number;

  // Dates
  invoice_date: string;
  order_date?: string;
  due_date?: string;
  requested_delivery_date?: string;
  req_receipt_date?: string;
  receiptDate?: string;
  receipt_date?: string;

  // Shipping & Warehouse Booking
  shipping_agent?: string;
  shipment_method?: string;
  shipment_method_id?: string;
  shipment_ref_no?: string;
  ship_to_address?: string;
  ship_to_address2?: string;
  ship_to_city?: string;
  ship_to_county?: string;
  ship_to_post_code?: string;

  book_in_contact?: string;
  book_in_tel?: string;
  book_in_phone?: string;
  book_in_email?: string;
  warehouse_booking_ref?: string;
  warehouse_ref_no?: string;
  consignmentNo?: string;
  consignment_no?: string;
  vatPosted?: string | boolean;
  LinkToSo?: string;
  link_to_so_no?: string;

  // Terms & Lookup References
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;
  payable_bank?: string;
  payable_bank_id?: string;
  anonymous_supplier?: boolean;

  reference?: string;
  notes?: string;
  status?: PurchaseInvoiceStatus;
  created_at?: string;
  is_posted?: boolean;
}

export interface PurchaseInvoiceLine {
  id?: string;
  purchase_invoice_line_id?: string;
  purchase_invoice_id?: string;
  purchase_order_line_id?: string;
  line_no?: number;
  line_type?: "ITEM" | "GL_ACCOUNT" | "COMMENT";

  // Item Details
  item_id?: string;
  item_code?: string;
  item_name?: string;

  // GL Account Details (from PO Line)
  gl_account_id?: string;
  account_code?: string;
  account_name?: string;

  // Warehouse & Location Details
  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  warehouse_location_id?: string;

  // UOM Details
  uom_id?: string;
  uom_name?: string;

  description?: string;
  quantity: number | string;
  unit_cost: number | string;

  // Discounts
  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number | string;
  discount_amount?: number;
  original_amount?: number | string;

  // Tax Details
  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;
  vat_percent?: number | string;
  tax_percent?: number;
  tax_amount?: number;
  vat_amount?: number | string;

  // Totals
  net_amount?: number;
  gross_amount?: number;

  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  updated_at?: string;
}

export interface PurchaseInvoicePayload {
  invoice: PurchaseInvoice;
  lines: PurchaseInvoiceLine[];
  primary_address?: PurchaseOrderAddress | null;
  billing_address?: PurchaseOrderAddress | null;
  shipping_address?: PurchaseOrderAddress | null;
}

/* export type PurchaseInvoiceStatus = string;

export interface PurchaseInvoice {
  id?: string;
  company_id?: string;
  invoice_no?: string;
  purchase_order_id?: string; // Links back to the source PO
  purchase_order_no?: string;
  supplier_id: string;
  supplier_name?: string;
  currency_id?: string;
  exchange_rate?: number;
  invoice_date: string;
  due_date?: string;
  reference?: string;
  notes?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status?: PurchaseInvoiceStatus;
  created_at?: string;
  is_posted?: boolean;
}

export interface PurchaseInvoiceLine {
  id?: string;
  purchase_invoice_id?: string;
  line_no?: number;
  line_type: "ITEM" | "GL_ACCOUNT" | "COMMENT";
  item_id?: string;
  item_code?: string;
  item_name?: string;
  gl_account_id?: string;
  account_code?: string;
  account_name?: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  discount_amount?: number;
  vat_percent?: number;
  vat_amount?: number;
  net_amount?: number;
  gross_amount?: number;
} */

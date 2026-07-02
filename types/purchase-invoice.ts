// types/purchase-invoice.ts

export type PurchaseInvoiceStatus = string;

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
}
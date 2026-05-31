// types/purchase-order.ts

export type PurchaseOrderStatus =
  | "draft"
  | "open"
  | "partial_received"
  | "received"
  | "closed"
  | "cancelled";

export interface PurchaseOrder {
  id?: string;
  company_id?: string;
  order_no?: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id?: string;
  currency_id?: string;
  order_date: string;
  expected_date?: string;
  reference?: string;
  notes?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status?: PurchaseOrderStatus;
  created_at?: string;
  is_posted?: boolean;
}

export type PurchaseOrderAddressType = "billing" | "shipping";

/**
 * STAMPED ADDRESS
 * Saved per order
 */
export interface PurchaseOrderAddress {
  id?: string;
  purchase_order_id?: string;
  address_type: PurchaseOrderAddressType;
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

export interface PurchaseOrderPayload {
  order: PurchaseOrder;
  billing_address?: PurchaseOrderAddress;
  shipping_address?: PurchaseOrderAddress;
  lines: PurchaseOrderLine[];
}

export type PurchaseOrderLineType = "ITEM" | "GL_ACCOUNT" | "COMMENT";

export interface PurchaseOrderLine {
  id?: string;
  purchase_order_id?: string;
  line_no?: number;
  line_type: PurchaseOrderLineType;
  /*
   * ITEM
   */
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
  warehouse_location_id?: string;

  uom_id?: string;
  uom_name?: string;

  quantity: number;

  received_quantity?: number;

  unit_cost: number;

  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;

  discount_amount?: number;
  original_amount?: number;
  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;
  vat_percent?: number;
  vat_amount?: number;
  net_amount?: number;
  gross_amount?: number;
  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;
}

export interface PurchaseOrderLineUI extends PurchaseOrderLine {
  reserved_quantity?: number;
  available_stock?: number;
}

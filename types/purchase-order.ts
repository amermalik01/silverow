// types/purchase-order.ts

export type PurchaseOrderStatus = string;
export interface PurchaseOrder {
  id?: string;
  company_id?: string;
  order_no?: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id?: string;
  currency_id?: string;
  exchange_rate?: string | number;
  order_date: string;
  expected_date?: string;
  invoice_date?: string;
  reference?: string;
  notes?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status?: PurchaseOrderStatus;
  posted_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  approved_at?: string;
  closed_at?: string;
  cancelled_at?: string;
  is_posted?: boolean;
}

export type PurchaseOrderAddressType = "billing" | "shipping";

/**
 * STAMPED ADDRESS
 * Saved per order
 */
export interface PurchaseOrderAddress {
  id?: string;
  company_id?: string;
  purchase_order_id?: string;
  address_type: PurchaseOrderAddressType;
  name?: string;
  attention?: string;
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
  company_id?: string;
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

  quantity: string | number;

  received_quantity?: string | number;
  remaining_quantity?: string | number;
  invoiced_quantity?: string | number;
  cancelled_quantity?: string | number;

  reserved_quantity?: string | number;
  returned_quantity?: string | number;

  is_deleted?: boolean;

  unit_cost?: string | number;

  discount_type?: "PERCENT" | "FIXED";
  discount_value?: string | number;

  discount_amount?: number;
  original_amount?: string | number;
  vat_business_posting_group_id?: string;
  vat_product_posting_group_id?: string;
  vat_percent?: string | number;
  vat_amount?: string | number;
  net_amount?: string | number;
  gross_amount?: string | number;
  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;

  deleted_at?: string;
  deleted_by?: string;
  updated_at?: string;
}

export interface PurchaseOrderLineUI extends PurchaseOrderLine {
  reserved_quantity?: string | number;
  available_stock?: string | number;

  is_allocated?: boolean;
  allocations?: Array<{
    quantity: number;
    [key: string]: unknown; // Avoids 'any' while remaining structurally open for StockAllocationRecord
  }>;
}

// export type PurchaseOrderStatus =
//   | "draft"
//   | "open"
//   | "partial_received"
//   | "received"
//   | "closed"
//   | "cancelled";

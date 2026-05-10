// types/purchase-order.ts

export type PurchaseOrderStatus =
  | "draft"
  | "open"
  | "partial_received"
  | "received"
  | "cancelled"
  | "posted";

export interface PurchaseOrder {
  id?: string;
  company_id?: string;
  order_no?: string;
  supplier_id: string;
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

export interface PurchaseOrderLine {
  id?: string;
  purchase_order_id?: string;
  item_id: string;
  description?: string;
  warehouse_id?: string;
  uom_id?: string;
  quantity: number;
  received_quantity?: number;
  unit_cost: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total?: number;
}

export interface PurchaseOrderPayload {
  order: PurchaseOrder;

  billing_address?: PurchaseOrderAddress;

  shipping_address?: PurchaseOrderAddress;

  lines: PurchaseOrderLine[];
}

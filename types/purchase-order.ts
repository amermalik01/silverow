// types/purchase-order.ts

export type PurchaseOrderStatus = string;
export interface PurchaseOrder {
  id?: string;
  company_id?: string;
  order_no?: string;
  invoice_no?: string;
  supplier_id: string;
  supplier_no?: string;
  supplier_name?: string;

  purchaser?: string;
  consignment_no?: string;
  supp_order_no?: string;
  link_to_so_no?: string;

  // warehouse_id?: string;
  currency_id?: string;
  exchange_rate?: string | number;

  order_date: string;
  req_receipt_date: string;
  receipt_date: string;
  expected_date?: string;
  invoice_date?: string;
  reference?: string;

  payable_bank?: string;
  payable_bank_id?: string;
  due_date?: string;
  payment_terms?: string;
  payment_terms_id?: string;
  payment_method?: string;
  payment_method_id?: string;

  purchase_posting_group_id?: string;
  supplier_posting_group_id?: string;
  vat_business_posting_group_id?: string;

  previous_code?: string;
  link_to_cust?: string;
  deduct_from_rebate?: boolean;
  anonymous_supplier?: boolean;

  contact?: string;
  book_in_phone?: string;
  book_in_contact?: string;
  book_in_email?: string;

  shipment_method?: string;
  shipment_method_id?: string;
  shipping_agent?: string;
  shipment_ref_no?: string;
  warehouse_ref_no?: string;
  // shipment_po_not_req?: boolean;
  reason?: string;
  linked_po?: string;

  notes?: string;
  internal_notes?: string;
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

export type PurchaseOrderAddressType = "primary" | "billing" | "shipping";

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
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  contact_name?: string;
}

export interface PurchaseOrderPayload {
  order: PurchaseOrder;

  primary_address?: PurchaseOrderAddress;
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
  // location_id?: string;
  // location_code?: string;
  // location_name?: string;
  is_allocated?: boolean;

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
    [key: string]: unknown;
  }>;

  initialAllocations?: Array<{
    quantity: number;
    [key: string]: unknown;
  }>;
}

export interface StockAllocationRecord {
  production_date?: string;
  use_by_date?: string;
  date_received?: string;
  storage_location?: string;
  cons_no?: string;
  ref_no?: string;
  serial_no: string;
  quantity: number;
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

export interface PurchaseOrderMasterData {
  currencies: CurrencyLookup[];
  stages: OrderStageLookup[];
  paymentTerms: PaymentTermLookup[];
  paymentMethods: LookupItem[];
  shipmentMethods: LookupItem[];
}

// export type PurchaseOrderStatus =
//   | "draft"
//   | "open"
//   | "partial_received"
//   | "received"
//   | "closed"
//   | "cancelled";

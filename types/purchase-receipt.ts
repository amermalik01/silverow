// types/purchase-receipt.ts

export interface PurchaseReceipt {
  id?: string;

  receipt_no?: string;

  vendor_id: string;

  purchase_order_id?: string;

  warehouse_id?: string;

  receipt_date: string;

  posting_date: string;

  reference_no?: string;

  notes?: string;

  status?: string;

  is_posted?: boolean;
}

export interface PurchaseReceiptLine {
  id?: string;

  purchase_order_line_id?: string;

  line_no?: number;

  item_id: string;

  item_code?: string;

  item_name?: string;

  warehouse_id: string;

  warehouse_name?: string;

  location_id?: string;

  bin_code?: string;

  batch_no?: string;

  serial_no?: string;

  expiry_date?: string;

  quantity: number;

  reserved_quantity?: number;

  consumed_reservation_qty?: number;

  available_reservation_qty?: number;

  unit_cost: number;

  total_cost?: number;
}

export interface PurchaseReceiptPayload {
  receipt: PurchaseReceipt;

  lines: PurchaseReceiptLine[];
}
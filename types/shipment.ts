// types/shipment.ts

export type AllocationMethod = "FIFO" | "FEFO";

export interface ShipmentLine {
  id: string;

  item_id: string;
  item_code?: string;
  item_name?: string;

  warehouse_id: string;

  quantity: number;

  picked_quantity?: number;

  reserved_quantity?: number;

  available_stock?: number;

  is_picked?: boolean;
}

export interface PickingAllocationLine {
  inbound_entry_id: string;

  quantity: number;

  unit_cost: number;

  batch_no?: string | null;

  bin_code?: string | null;

  expiry_date?: string | null;
}
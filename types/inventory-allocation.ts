//  types/inventory-allocation.ts

export type InventoryLedgerDirection = "IN" | "OUT";
export type AllocationMethod = "FIFO" | "FEFO";
export type AllocationStatus = "ACTIVE" | "REVERSED";

export interface InventoryAllocationResult {
  inbound_entry_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  batch_no?: string | null;
  bin_code?: string | null;
  expiry_date?: string | null;
}

export interface InventoryLedgerEntry {
  id: string;
  item_id: string;
  warehouse_id: string;
  remaining_quantity: number;
  unit_cost: number;
  batch_no?: string | null;
  bin_code?: string | null;
  expiry_date?: string | null;
  created_at: string;
}
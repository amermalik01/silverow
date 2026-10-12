// app/components/finance/journals/item-journal/stock-allocation/utils.ts

import type { ItemJournalAllocationRecord } from "../types";

export type NormalizeAllocation = (
  allocation: Partial<ItemJournalAllocationRecord>,
  fallbackLocationId?: string,
  fallbackLocationName?: string,
) => ItemJournalAllocationRecord;

export const normalizeAllocation = (
  allocation: Partial<ItemJournalAllocationRecord>,
  fallbackLocationId = "",
  fallbackLocationName = "",
): ItemJournalAllocationRecord => ({
  id: allocation.id ?? null,
  source_allocation_id: allocation.source_allocation_id ?? null,
  inbound_entry_id: allocation.inbound_entry_id ?? null,

  location_id: allocation.location_id
    ? String(allocation.location_id)
    : fallbackLocationId,

  location_name: allocation.location_name || fallbackLocationName || "",

  date_received: String(allocation.date_received ?? ""),
  prod_date: String(allocation.prod_date ?? ""),
  expiry_date: String(allocation.expiry_date ?? ""),

  batch_no: String(allocation.batch_no ?? ""),
  bin_code: String(allocation.bin_code ?? ""),
  sequence_no: String(allocation.sequence_no ?? ""),
  serial_no: String(allocation.serial_no ?? ""),

  quantity: Number(allocation.quantity ?? 0),

  available_quantity:
    allocation.available_quantity === undefined
      ? undefined
      : Number(allocation.available_quantity),

  unit_cost:
    allocation.unit_cost === undefined
      ? undefined
      : Number(allocation.unit_cost),
});

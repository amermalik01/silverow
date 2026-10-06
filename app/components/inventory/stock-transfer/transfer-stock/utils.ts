// app/components/inventory/stock-transfer/transfer-stock/utils.ts

import type { TransferStockLine, TransferAllocationRecord } from "./types";

export const today = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const normalizeDate = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return String(value).split("T")[0];
};

export const createStableKey = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const normalizeNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

export const getAllocationTotal = (
  allocations: TransferAllocationRecord[] = [],
): number => {
  return allocations.reduce(
    (sum, allocation) => sum + normalizeNumber(allocation.quantity),
    0,
  );
};

export type TransferStockStatus =
  | "allocated"
  | "partial"
  | "unallocated"
  | "overallocated";

export const getStockStatus = (
  quantity: number,
  allocations: TransferAllocationRecord[],
): TransferStockStatus => {
  const target = normalizeNumber(quantity);

  if (target <= 0) {
    return "unallocated";
  }

  const allocated = getAllocationTotal(allocations);

  if (allocated <= 0) {
    return "unallocated";
  }

  if (Math.abs(allocated - target) < 0.000001) {
    return "allocated";
  }

  if (allocated < target) {
    return "partial";
  }

  return "overallocated";
};

export const createInitialLine = (): TransferStockLine => {
  return {
    _stableKey: createStableKey(),

    item_id: "",
    item_code: "",
    item_description: "",

    qty: 0,
    uom: "Pcs",

    from_location_id: "",
    from_location_name: "",

    to_location_id: "",
    to_location_name: "",

    allocations: [],
    initialAllocations: [],
  };
};

export const normalizeAllocation = (
  allocation: Partial<TransferAllocationRecord>,
): TransferAllocationRecord => ({
  id: allocation.id ?? null,

  source_allocation_id: allocation.source_allocation_id ?? null,

  inbound_entry_id: allocation.inbound_entry_id ?? null,

  location_id: String(allocation.location_id ?? ""),
  location_name: String(allocation.location_name ?? ""),

  date_received: String(allocation.date_received ?? ""),
  prod_date: String(allocation.prod_date ?? ""),
  expiry_date: String(allocation.expiry_date ?? ""),

  batch_no: String(allocation.batch_no ?? ""),
  bin_code: String(allocation.bin_code ?? ""),

  sequence_no: String(allocation.sequence_no ?? ""),
  serial_no: String(allocation.serial_no ?? ""),

  quantity: normalizeNumber(allocation.quantity),

  available_quantity:
    allocation.available_quantity === undefined
      ? undefined
      : normalizeNumber(allocation.available_quantity),

  unit_cost:
    allocation.unit_cost === undefined
      ? undefined
      : normalizeNumber(allocation.unit_cost),
});

export const normalizeTransferLine = (line: {
  id: string;
  item_id: string;
  item_code: string;
  qty: number | string;
  uom?: string | null;
  from_location_id?: string | null;
  to_location_id?: string | null;
  from_location_name?: string | null;
  to_location_name?: string | null;
  item_description?: string | null;
  item_name?: string | null;
  allocations?: TransferAllocationRecord[];
}): TransferStockLine => {
  const allocations = (line.allocations ?? []).map(normalizeAllocation);

  return {
    _stableKey: createStableKey(),

    id: line.id,

    item_id: String(line.item_id ?? ""),
    item_code: String(line.item_code ?? ""),

    item_description:
      String(line.item_description ?? "") ||
      String(line.item_name ?? "") ||
      String(line.item_code ?? ""),

    qty: normalizeNumber(line.qty),

    uom: String(line.uom ?? "Pcs"),

    from_location_id: String(line.from_location_id ?? ""),
    from_location_name: String(line.from_location_name ?? ""),

    to_location_id: String(line.to_location_id ?? ""),
    to_location_name: String(line.to_location_name ?? ""),

    allocations,

    initialAllocations: allocations.map((allocation) => ({
      ...allocation,
    })),
  };
};

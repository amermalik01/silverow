// app/components/finance/journals/item-journal/utils.ts

import type { ItemJournalLineRow, StockStatus } from "./types";
import type { StockAllocationRecord } from "../../../shared/modals/StockAllocationModal";

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

export const calculateAmount = (quantity: number, cost: number): number => {
  const normalizedQuantity = Number(quantity || 0);
  const normalizedCost = Number(cost || 0);

  return Number((normalizedQuantity * normalizedCost).toFixed(2));
};

export const getAllocationTotal = (
  allocations: StockAllocationRecord[] = [],
): number => {
  return allocations.reduce(
    (sum, allocation) => sum + Number(allocation.quantity || 0),
    0,
  );
};

export const getStockStatus = (
  quantity: number,
  allocations: StockAllocationRecord[] = [],
): StockStatus => {
  const lineQuantity = Number(quantity || 0);

  const allocatedQuantity = getAllocationTotal(allocations);

  if (lineQuantity <= 0 || allocatedQuantity <= 0) {
    return "unallocated";
  }

  if (allocatedQuantity >= lineQuantity) {
    return "allocated";
  }

  return "partial";
};

export const createInitialRow = (
  entryDate?: string,
  overrides: Partial<ItemJournalLineRow> = {},
): ItemJournalLineRow => {
  const quantity = Number(overrides.quantity ?? 0);

  const costPerUnit = Number(overrides.cost_per_unit ?? 0);

  const allocations = overrides.allocations ?? [];

  const initialAllocations = overrides.initialAllocations ?? allocations;

  const stockStatus =
    overrides.stock_status ?? getStockStatus(quantity, allocations);

  const isAllocated = overrides.is_allocated ?? stockStatus === "allocated";

  const row: ItemJournalLineRow = {
    _stableKey: overrides._stableKey ?? createStableKey(),

    posting_date: overrides.posting_date ?? entryDate ?? today(),

    transaction_type: overrides.transaction_type ?? "Negative Entry",

    item_id: overrides.item_id ?? "",
    item_no: overrides.item_no ?? "",
    item_description: overrides.item_description ?? "",

    warehouse_id: overrides.warehouse_id ?? "",
    warehouse_code: overrides.warehouse_code ?? "",
    warehouse_name: overrides.warehouse_name ?? "",

    location_id: overrides.location_id ?? "",
    location_name: overrides.location_name ?? "",

    quantity,
    uom: overrides.uom ?? "Pcs",
    cost_per_unit: costPerUnit,

    amount: calculateAmount(quantity, costPerUnit),

    balancing_account_id: overrides.balancing_account_id ?? "",
    balancing_display_name: overrides.balancing_display_name ?? "",

    allocations,
    initialAllocations,
    stock_status: stockStatus,
    is_allocated: isAllocated,
  };

  return row;
};

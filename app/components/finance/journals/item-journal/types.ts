// app/components/finance/journals/item-journal/types.ts

import type { ItemLookupRecord } from "../../../shared/modals/ItemLookupModal";

import type { StockAllocationRecord } from "../../../shared/modals/StockAllocationModal";

export type ItemJournalTransactionType = "Positive Entry" | "Negative Entry";

export type StockStatus = "allocated" | "partial" | "unallocated";

export type ApiResponse = {
  message?: string;
  error?: string;
  data?: unknown;
};

export type ItemJournalLineRow = {
  _stableKey: string;

  posting_date: string;
  transaction_type: ItemJournalTransactionType;

  item_id: string;
  item_no: string;
  item_description: string;

  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;

  location_id: string;
  location_name: string;

  quantity: number;
  uom: string;

  cost_per_unit: number;
  amount: number;

  balancing_account_id: string;
  balancing_display_name: string;

  allocations: StockAllocationRecord[];
  initialAllocations?: StockAllocationRecord[];

  stock_status: StockStatus;
  is_allocated: boolean;
};

export type WarehouseOption = {
  id: string;
  name: string;
  code?: string;
};

export type LocationOption = {
  id: string;
  name: string;
  warehouse_id: string;
};

export type JournalMetadata = {
  entry_no: string;
  entry_date: string;
};

export type ItemModalState = {
  index: number;
  type: "item";
  target: "item";
};

export type GLModalState = {
  index: number;
  type: "balancing_account";
  target: "gl";
};

export type ItemJournalFormProps = {
  slug?: string;
  journalId?: string;
  apiBase: string;
  redirectPath: string;
  readOnly?: boolean;
};

export type BuildItemLine = (
  item: ItemLookupRecord,
) => Promise<ItemJournalLineRow>;

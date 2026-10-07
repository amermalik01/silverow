// app/components/inventory/stock-transfer/transfer-stock/types.ts

import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

import type {
  StockAllocationRecord,
  StockSequenceRecord,
  AvailableStockRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

export type TransferStockFormMode = "create" | "edit" | "view";

export type TransferAllocationRecord = StockAllocationRecord;

export type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

export type LocationOption = {
  id: string;
  warehouse_id: string;
  name: string;
  title?: string;
  code?: string | null;
};

export type TransferStockLine = {
  _stableKey: string;

  id?: string;

  item_id: string;
  item_code: string;
  item_description: string;

  qty: number;
  uom: string;

  from_location_id: string;
  from_location_name: string;

  to_location_id: string;
  to_location_name: string;

  allocations: TransferAllocationRecord[];
  initialAllocations?: TransferAllocationRecord[];
};

export type TransferMetadata = {
  transfer_no: string;
  transfer_date?: string;

  warehouse_from_id: string;
  warehouse_to_id: string;

  in_transit_code: string;
  po_no: string;
  shipping_agent: string;
  shipping_charge: number;
};

export type DBTransferLine = {
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
};

export type DBTransferHeader = {
  id: string;
  transfer_no: string;

  transfer_date: string;

  warehouse_from_id: string;
  warehouse_to_id: string;

  in_transit_code?: string | null;
  po_no?: string | null;
  shipping_agent?: string | null;
  shipping_charge?: number | string | null;

  is_posted?: boolean | null;
};

export type TransferDocumentResponse = {
  transfer: DBTransferHeader;
  lines: DBTransferLine[];
};

export type TransferApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

export type TransferStockFormProps = {
  transferStockId?: string;
  mode?: TransferStockFormMode;
  redirectPath?: string;
  onSuccess?: () => void;
};

export type TransferItemModalState = {
  index: number;
  type: "item";
  target: "item";
};

export type TransferStockAllocationProps = {
  existingSequences?: StockSequenceRecord[];
  availableStock?: AvailableStockRecord[];
};

export type BuildTransferLine = (item: ItemLookupRecord) => TransferStockLine;

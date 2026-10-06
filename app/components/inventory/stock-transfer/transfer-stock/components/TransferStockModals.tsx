// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockModals.tsx

"use client";

import React from "react";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import StockAllocationModal, {
  AvailableStockRecord,
  StockAllocationRecord,
  StockSequenceRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

import type { TransferItemModalState, TransferStockLine } from "../types";

type Props = {
  itemModalOpen: boolean;

  itemModalState: TransferItemModalState | null;

  allocationModalOpen: boolean;

  activeAllocationLine: TransferStockLine | null;

  formDisabled: boolean;

  existingSequences?: StockSequenceRecord[];

  availableStock?: AvailableStockRecord[];

  warehouseFromId: string;

  warehouseFromName: string;

  onCloseItem: () => void;

  onItemSelect: (item: ItemLookupRecord) => void;

  onCloseAllocation: () => void;

  onSaveAllocation: (allocations: StockAllocationRecord[]) => void;
};

export default function TransferStockModals({
  itemModalOpen,
  allocationModalOpen,
  activeAllocationLine,
  formDisabled,
  existingSequences = [],
  availableStock = [],
  warehouseFromId,
  warehouseFromName,
  onCloseItem,
  onItemSelect,
  onCloseAllocation,
  onSaveAllocation,
}: Props) {
  return (
    <>
      {itemModalOpen && (
        <ItemLookupModal open onClose={onCloseItem} onSelect={onItemSelect} />
      )}

      {allocationModalOpen && activeAllocationLine && (
        <StockAllocationModal
          key={activeAllocationLine._stableKey}
          open={allocationModalOpen}
          isReadonly={formDisabled}
          onClose={onCloseAllocation}
          onSave={onSaveAllocation}
          targetQuantity={Number(activeAllocationLine.qty || 0)}
          itemId={activeAllocationLine.item_id || ""}
          itemCode={activeAllocationLine.item_code || ""}
          itemName={activeAllocationLine.item_description || ""}
          warehouseId={warehouseFromId || ""}
          warehouseName={warehouseFromName || ""}
          locationId={activeAllocationLine.from_location_id || ""}
          locationName={activeAllocationLine.from_location_name || ""}
          uomName={activeAllocationLine.uom || "Pcs"}
          mode="outbound"
          existingSequences={existingSequences}
          availableStock={availableStock}
          initialAllocations={activeAllocationLine.allocations ?? []}
        />
      )}
    </>
  );
}

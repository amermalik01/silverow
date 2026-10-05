// app/components/finance/journals/item-journal/components/ItemJournalModals.tsx

"use client";

import React from "react";

import type { ItemJournalLineRow } from "../types";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";


import StockAllocationModal, {
  AvailableStockRecord,
  StockAllocationRecord,
  StockSequenceRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

type Props = {
  itemModalOpen: boolean;
  glModalOpen: boolean;
  warehouseModalOpen: boolean;
  allocationModalOpen: boolean;

  activeAllocationLine: ItemJournalLineRow | null;

  formDisabled: boolean;

  // existingSequences: string[];

  existingSequences?: StockSequenceRecord[];
  availableStock?: AvailableStockRecord[];

  onCloseItem: () => void;
  onItemSelect: (item: ItemLookupRecord) => void;

  onCloseGL: () => void;
  onGLSelect: (record: GLAccountLookupRecord) => void;

  onCloseWarehouse: () => void;
  onWarehouseSelect: (warehouse: WarehouseLookupRecord) => void;

  onCloseAllocation: () => void;
  onSaveAllocation: (allocations: StockAllocationRecord[]) => void;
};

export default function ItemJournalModals({
  itemModalOpen,
  glModalOpen,
  warehouseModalOpen,
  allocationModalOpen,
  activeAllocationLine,
  formDisabled,
  existingSequences = [],
  availableStock = [],
  onCloseItem,
  onItemSelect,
  onCloseGL,
  onGLSelect,
  onCloseWarehouse,
  onWarehouseSelect,
  onCloseAllocation,
  onSaveAllocation,
}: Props) {
  return (
    <>
      {itemModalOpen && (
        <ItemLookupModal open onClose={onCloseItem} onSelect={onItemSelect} />
      )}

      {glModalOpen && (
        <GLAccountLookupModal open onClose={onCloseGL} onSelect={onGLSelect} />
      )}

      <WarehouseLookupModal
        open={warehouseModalOpen}
        onClose={onCloseWarehouse}
        onSelect={onWarehouseSelect}
      />

      {allocationModalOpen && activeAllocationLine && (
        <StockAllocationModal
          key={activeAllocationLine._stableKey}
          open={allocationModalOpen}
          isReadonly={formDisabled}
          onClose={onCloseAllocation}
          onSave={onSaveAllocation}
          targetQuantity={Number(activeAllocationLine.quantity || 0)}

          itemId={activeAllocationLine.item_id || ""}
          itemCode={activeAllocationLine.item_no || ""}
          itemName={activeAllocationLine.item_description || ""}

          warehouseId={activeAllocationLine.warehouse_id || ""}
          warehouseName={activeAllocationLine.warehouse_name || ""}
          locationId={activeAllocationLine.location_id || ""}
          locationName={activeAllocationLine.location_name || ""}

          uomName={activeAllocationLine.uom || ""}
          transactionType={activeAllocationLine.transaction_type}
          mode={
            activeAllocationLine.transaction_type === "Negative Entry"
              ? "outbound"
              : "inbound"
          }
          existingSequences={existingSequences}
          availableStock={availableStock}
          initialAllocations={activeAllocationLine.allocations ?? []}
          // initialAllocations={activeAllocationLine.initialAllocations ?? []}
          // onSave={handleSaveAllocations}
          
          // initialAllocations={(
          //   activeAllocationLine.allocations ||
          //   activeAllocationLine.initialAllocations ||
          //   []
          // ).map((allocation) => ({
          //   location_id: allocation.location_id || "",

          //   location_name: allocation.location_name || "",

          //   date_received: String(allocation.date_received || ""),

          //   prod_date: String(allocation.prod_date || ""),

          //   expiry_date: String(allocation.expiry_date || ""),

          //   batch_no: String(allocation.batch_no || ""),
          //   sequence_no: String(allocation.sequence_no || ""),

          //   serial_no: String(allocation.serial_no || ""),

          //   quantity: Number(allocation.quantity || 0),

          //   available_quantity:
          //     allocation.available_quantity === undefined
          //       ? undefined
          //       : Number(allocation.available_quantity || 0),
          // }))}
        />
      )}
    </>
  );
}

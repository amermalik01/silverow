// app/components/finance/journals/ItemJournalForm.tsx

"use client";

import React from "react";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import type { ItemJournalFormProps } from "./item-journal/types";

import { useItemJournal } from "./item-journal/hooks/useItemJournal";

import ItemJournalHeader from "./item-journal/components/ItemJournalHeader";
import ItemJournalToolbar from "./item-journal/components/ItemJournalToolbar";
import ItemJournalTable from "./item-journal/components/ItemJournalTable";
import ItemJournalFooter from "./item-journal/components/ItemJournalFooter";
import ItemJournalModals from "./item-journal/components/ItemJournalModals";

export default function ItemJournalForm(props: ItemJournalFormProps) {
  const { journalId, redirectPath, readOnly = false } = props;

  const journal = useItemJournal(props);

  const {
    loading,
    isPosted,
    errorMsg,
    isEditing,

    setIsEditing,

    metadata,
    lines,
    locationsByWarehouse,

    formDisabled,

    activeAllocationLine,

    isAllocationModalOpen,

    itemActiveModal,
    activeModal,

    warehouseIndex,

    setItemActiveModal,
    setActiveModal,
    setWarehouseIndex,
    setLocationIndex,

    setIsAllocationModalOpen,
    setActiveAllocationLineId,

    handleLineChange,
    addLineRow,
    removeLineRow,

    handleMultipleItemSelect,
    handleWarehouseSelect,
    handleLocationSelect,
    handleModalSelection,

    handleOpenAllocation,
    handleSaveAllocations,

    handleSaveOrPost,
  } = journal;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: "Item Journals",
            href: redirectPath,
          },
          {
            label: metadata.entry_no || "New Journal",
          },
        ]}
      />

      <ItemJournalHeader
        isPosted={isPosted}
        journalId={journalId}
        readOnly={readOnly}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
      />

      <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm px-4 py-6">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-800 rounded font-medium text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <ItemJournalToolbar
          entryNo={metadata.entry_no}
          formDisabled={formDisabled}
          onAddLine={addLineRow}
        />

        <ItemJournalTable
          lines={lines}
          // locations={locations}
          locationsByWarehouse={locationsByWarehouse}
          formDisabled={formDisabled}
          onLineChange={handleLineChange}
          onOpenItem={(index) =>
            setItemActiveModal({
              index,
              type: "item",
              target: "item",
            })
          }
          onOpenWarehouse={(index) => setWarehouseIndex(index)}
          onLocationChange={(index, location) => {
            handleLocationSelect(index, location);
          }}
          onLocationFocus={(index) => setLocationIndex(index)}
          onOpenGL={(index) =>
            setActiveModal({
              index,
              type: "balancing_account",
              target: "gl",
            })
          }
          onOpenAllocation={handleOpenAllocation}
          onRemove={removeLineRow}
        />

        <ItemJournalFooter
          formDisabled={formDisabled}
          loading={loading}
          onPost={() => void handleSaveOrPost(true)}
          onSave={() => void handleSaveOrPost(false)}
          onCancel={() => window.location.assign(redirectPath)}
        />
      </div>

      <ItemJournalModals
        itemModalOpen={itemActiveModal !== null}
        glModalOpen={activeModal !== null}
        warehouseModalOpen={warehouseIndex !== null}
        allocationModalOpen={isAllocationModalOpen}
        activeAllocationLine={activeAllocationLine}
        formDisabled={formDisabled}
        onCloseItem={() => setItemActiveModal(null)}
        onItemSelect={(item) => void handleMultipleItemSelect([item])}
        onCloseGL={() => setActiveModal(null)}
        onGLSelect={handleModalSelection}
        onCloseWarehouse={() => setWarehouseIndex(null)}
        onWarehouseSelect={handleWarehouseSelect}
        onCloseAllocation={() => {
          setIsAllocationModalOpen(false);

          setActiveAllocationLineId(null);
        }}
        onSaveAllocation={handleSaveAllocations}
      />
    </div>
  );
}

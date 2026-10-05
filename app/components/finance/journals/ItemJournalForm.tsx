// app/components/finance/journals/ItemJournalForm.tsx

"use client";

import React, { useState } from "react";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import type { ItemJournalFormProps } from "./item-journal/types";

import { useItemJournal } from "./item-journal/hooks/useItemJournal";

import ItemJournalHeader from "./item-journal/components/ItemJournalHeader";
import ItemJournalToolbar from "./item-journal/components/ItemJournalToolbar";
import ItemJournalTable from "./item-journal/components/ItemJournalTable";
import ItemJournalFooter from "./item-journal/components/ItemJournalFooter";
import ItemJournalModals from "./item-journal/components/ItemJournalModals";

import { PostedTransactionsModal } from "../posted-entries/PostedTransactionsModal";
import { GeneralConfirmModal } from "../../shared/modals/GeneralConfirmModal";

export default function ItemJournalForm(props: ItemJournalFormProps) {
  const { journalId, redirectPath, readOnly = false } = props;

  const [showNavigateModal, setShowNavigateModal] = useState(false);
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

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

    existingSequences,
    availableStock,

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

  const handlePostClick = () => {

    if (formDisabled || isPosting || loading) {
      return;
    }
    setShowPostConfirmModal(true);
  };

  const handlePostJournal = async () => {
    if (isPosting || loading || formDisabled) {
      return;
    }

    setIsPosting(true);

    try {
      const success = await handleSaveOrPost(true);

      if (success) {
        // Keep the user on this page.
        // The hook already sets:
        // isPosted = true
        // isEditing = false

        setShowPostConfirmModal(false);
      }
    } finally {
      setIsPosting(false);
    }
  };

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
          isPosted={isPosted}
          onPost={handlePostClick}
          // onPost={() => void handleSaveOrPost(true)}
          onSave={() => void handleSaveOrPost(false)}
          onCancel={() => window.location.assign(redirectPath)}
          onNavigate={() => setShowNavigateModal(true)}
        />
      </div>

      <ItemJournalModals
        itemModalOpen={itemActiveModal !== null}
        glModalOpen={activeModal !== null}
        warehouseModalOpen={warehouseIndex !== null}
        allocationModalOpen={isAllocationModalOpen}
        activeAllocationLine={activeAllocationLine}
        formDisabled={formDisabled}
        existingSequences={existingSequences}
        availableStock={availableStock}
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

      {isPosted && (
        <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          documentNo={metadata.entry_no}
          documentTitle="Journal"
          fetchEndpoint={`/api/finance/item-journal/${journalId}/posted-entries`}
        />
      )}

      <GeneralConfirmModal
        isOpen={showPostConfirmModal}
        title="Confirmation"
        message="Are you sure you want to post this Journal?"
        onConfirm={handlePostJournal}
        onCancel={() => {
          if (!isPosting) {
            setShowPostConfirmModal(false);
          }
        }}
        loading={isPosting || loading}
      />
    </div>
  );
}

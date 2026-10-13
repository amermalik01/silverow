// app/components/inventory/stock-transfer/TransferStockForm.tsx

"use client";

import React, { useState } from "react";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import { GeneralConfirmModal } from "@/app/components/shared/modals/GeneralConfirmModal";

import type { TransferStockFormProps } from "./transfer-stock/types";

import { useTransferStock } from "./transfer-stock/hooks/useTransferStock";

import TransferStockHeader from "./transfer-stock/components/TransferStockHeader";

import TransferStockToolbar from "./transfer-stock/components/TransferStockToolbar";

import TransferStockTable from "./transfer-stock/components/TransferStockTable";

import TransferStockFooter from "./transfer-stock/components/TransferStockFooter";

import TransferStockModals from "./transfer-stock/components/TransferStockModals";

export default function TransferStockForm(props: TransferStockFormProps) {
  const {
    transferStockId,
    mode = "create",
    redirectPath = "/inventory/transfer-stock",
  } = props;

  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const transfer = useTransferStock(props);

  const {
    loading,
    isPosted,
    errorMsg,

    isEditing,
    setIsEditing,

    currentTransferId,

    metadata,
    lines,

    warehouses,
    fromLocations,
    toLocations,

    formDisabled,
    validationErrors,

    activeAllocationLine,

    itemActiveModal,
    setItemActiveModal,

    isAllocationModalOpen,
    setIsAllocationModalOpen,

    setActiveAllocationLineId,

    // existingSequences,
    // availableStock,

    handleHeaderChange,

    handleFromWarehouseChange,
    handleToWarehouseChange,

    handleTransitMethodChange,

    handleLineChange,

    handleFromLocationChange,
    handleToLocationChange,

    handleItemSelect,

    addLine,
    removeLine,

    handleOpenAllocation,
    handleSaveAllocations,

    saveDraft,
    postTransfer,
  } = transfer;

  const sourceWarehouseName =
    warehouses.find((warehouse) => warehouse.id === metadata.warehouse_from_id)
      ?.name || "";

  const handlePostClick = () => {
    if (formDisabled || isPosting || loading) {
      return;
    }

    setShowPostConfirmModal(true);
  };

  const handlePostTransfer = async () => {
    if (isPosting || loading || formDisabled) {
      return;
    }

    setIsPosting(true);

    try {
      const success = await postTransfer();

      if (success) {
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
            label: "Stock Transfer Orders",
            href: redirectPath,
          },
          {
            label: metadata.transfer_no || "New Transfer",
          },
        ]}
      />

      <TransferStockHeader
        isPosted={isPosted}
        transferId={currentTransferId || transferStockId}
        readOnly={mode === "view"}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
      />

      <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm px-4 py-6">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-800 rounded font-medium text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <TransferStockToolbar
          metadata={metadata}
          warehouses={warehouses}
          formDisabled={formDisabled}
          validationErrors={validationErrors}
          onHeaderChange={handleHeaderChange}
          onFromWarehouseChange={handleFromWarehouseChange}
          onToWarehouseChange={handleToWarehouseChange}
          onTransitMethodChange={handleTransitMethodChange}
          onAddLine={addLine}
        />

        <TransferStockTable
          lines={lines}
          fromLocations={fromLocations}
          toLocations={toLocations}
          formDisabled={formDisabled}
          validationErrors={validationErrors}
          onLineChange={handleLineChange}
          onOpenItem={(index) =>
            setItemActiveModal({
              index,
              type: "item",
              target: "item",
            })
          }
          onFromLocationChange={handleFromLocationChange}
          onToLocationChange={handleToLocationChange}
          onOpenAllocation={handleOpenAllocation}
          onRemove={removeLine}
        />

        <TransferStockFooter
          formDisabled={formDisabled}
          loading={loading}
          isPosted={isPosted}
          onPost={handlePostClick}
          onSave={() => void saveDraft()}
          onCancel={() => window.location.assign(redirectPath)}
        />
      </div>

      <TransferStockModals
        itemModalOpen={itemActiveModal !== null}
        itemModalState={itemActiveModal}
        allocationModalOpen={isAllocationModalOpen}
        activeAllocationLine={activeAllocationLine}
        formDisabled={formDisabled}
        // existingSequences={existingSequences}
        // availableStock={availableStock}
        warehouseFromId={metadata.warehouse_from_id}
        warehouseFromName={sourceWarehouseName}
        onCloseItem={() => setItemActiveModal(null)}
        onItemSelect={handleItemSelect}
        onCloseAllocation={() => {
          setIsAllocationModalOpen(false);
          setActiveAllocationLineId(null);
        }}
        onSaveAllocation={handleSaveAllocations}
      />

      <GeneralConfirmModal
        isOpen={showPostConfirmModal}
        title="Confirmation"
        message="Are you sure you want to post this Stock Transfer?"
        onConfirm={handlePostTransfer}
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

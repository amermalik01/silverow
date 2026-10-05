// app/components/shared/modals/StockAllocationModal.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

export type StockAllocationRecord = {
  id?: string | null;

  source_allocation_id?: string | null;
  inbound_entry_id?: string | null;

  location_id: string;
  location_name: string;

  date_received?: string;
  prod_date?: string;
  expiry_date?: string;

  batch_no?: string;
  bin_code?: string;

  sequence_no?: string;
  serial_no?: string;

  quantity: number;
  available_quantity?: number;

  unit_cost?: number;
};

export type StockSequenceRecord = {
  location_id: string;
  location_name: string;

  batch_no: string;
  sequence_no: string;
  serial_no: string;

  date_received: string;
  prod_date: string;
  expiry_date: string;

  available_quantity: number;

  unit_cost?: number;
};

export type StockAllocationMode = "inbound" | "outbound";

export type RawAvailableStockRecord = {
  id?: string;
  source_allocation_id?: string | null;
  inbound_entry_id?: string | null;

  location_id?: string | null;
  location_name?: string | null;

  date_received?: string | null;
  prod_date?: string | null;
  expiry_date?: string | null;

  batch_no?: string | null;
  bin_code?: string | null;
  serial_no?: string | null;

  available_quantity?: number | string | null;
  available_qty?: number | string | null;

  unit_cost?: number | string | null;
};

export type AvailableStockRecord = {
  id: string;

  source_allocation_id: string;
  inbound_entry_id: string | null;

  location_id: string;
  location_name: string;

  date_received: string;
  prod_date: string;
  expiry_date: string;

  batch_no: string;
  bin_code: string;
  serial_no: string;

  available_quantity: number;
  unit_cost: number;
};

// export type StockAllocationRecord = {
//   location_id: string;
//   location_name: string;

//   date_received: string;
//   prod_date: string;
//   expiry_date: string;

//   batch_no: string;
//   sequence_no?: string;
//   serial_no: string;

//   quantity: number;
//   available_quantity?: number;
// };

// export type StockSequenceRecord = {
//   location_id: string;
//   location_name: string;

//   batch_no: string;
//   sequence_no: string;
//   serial_no: string;

//   date_received: string;
//   prod_date: string;
//   expiry_date: string;

//   available_quantity: number;
// };

type Props = {
  open: boolean;
  onClose: () => void;

  onSave: (allocations: StockAllocationRecord[]) => void;

  targetQuantity: number;

  itemId?: string;
  itemCode: string;
  itemName: string;

  warehouseId?: string;
  warehouseName: string;

  locationId?: string;
  locationName: string;

  uomName?: string;

  initialAllocations?: StockAllocationRecord[];

  isReadonly?: boolean;

  transactionType?: "Positive Entry" | "Negative Entry";

  existingSequences?: StockSequenceRecord[];
  mode?: StockAllocationMode;
  availableStock?: AvailableStockRecord[];
};

const normalizeNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const normalizeAllocation = (
  allocation: Partial<StockAllocationRecord>,
): StockAllocationRecord => ({
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

const getOutboundRemaining = (
  stock: AvailableStockRecord,
  allocations: StockAllocationRecord[],
): number => {
  const alreadySelected = allocations
    .filter(
      (allocation) =>
        allocation.source_allocation_id === stock.source_allocation_id,
    )
    .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);

  return Math.max(0, Number(stock.available_quantity || 0) - alreadySelected);
};

const getTotalAllocated = (allocations: StockAllocationRecord[]): number => {
  return allocations.reduce(
    (sum, allocation) => sum + normalizeNumber(allocation.quantity),
    0,
  );
};

/**
 * Returns how much of a particular stock sequence can still be allocated.
 *
 * Important:
 * Existing allocations are subtracted from the sequence's available
 * quantity so the same stock cannot accidentally be allocated twice.
 */
const getRemainingSequenceQuantity = (
  sequence: StockSequenceRecord,
  allocations: StockAllocationRecord[],
): number => {
  const sequenceNo = String(sequence.sequence_no || "");

  if (!sequenceNo) {
    return 0;
  }

  const alreadyAllocated = allocations
    .filter((allocation) => String(allocation.sequence_no || "") === sequenceNo)
    .reduce((sum, allocation) => sum + normalizeNumber(allocation.quantity), 0);

  return Math.max(
    0,
    normalizeNumber(sequence.available_quantity) - alreadyAllocated,
  );
};

const quantitiesEqual = (left: number, right: number): boolean => {
  return Math.abs(left - right) < 0.000001;
};

export default function StockAllocationModal({
  open,
  onClose,
  onSave,

  targetQuantity,

  itemId,
  itemCode,
  itemName,

  warehouseId,
  warehouseName,

  locationId,
  locationName,

  uomName,

  initialAllocations = [],

  transactionType,

  isReadonly = false,

  existingSequences = [],

  mode,
  availableStock,
}: Props) {
  const [allocations, setAllocations] = useState<StockAllocationRecord[]>(() =>
    initialAllocations.map(normalizeAllocation),
  );

  const [selectedSequence, setSelectedSequence] =
    useState<StockSequenceRecord | null>(null);

  const [inputQuantity, setInputQuantity] = useState("");

  /**
   * Reinitialize allocations whenever a different allocation line is opened.
   *
   * This is particularly important because the modal is sometimes kept
   * mounted while the active journal line changes.
   */
  // useEffect(() => {
  //   if (!open) {
  //     return;
  //   }

  //   setAllocations(initialAllocations.map(normalizeAllocation));
  //   setSelectedSequence(null);
  //   setInputQuantity("");
  // }, [open, initialAllocations]);

  const safeTargetQuantity = useMemo(
    () => Math.max(0, normalizeNumber(targetQuantity)),
    [targetQuantity],
  );

  const totalAllocated = useMemo(
    () => getTotalAllocated(allocations),
    [allocations],
  );

  const qtyToAllocate = useMemo(
    () => Math.max(0, safeTargetQuantity - totalAllocated),
    [safeTargetQuantity, totalAllocated],
  );

  const sequenceAvailableForAllocation = selectedSequence
    ? getRemainingSequenceQuantity(selectedSequence, allocations)
    : 0;

  const maxQty = Math.min(sequenceAvailableForAllocation, qtyToAllocate);

  const currentInputQty =
    inputQuantity === "" ? maxQty : Math.max(0, normalizeNumber(inputQuantity));

  const canSave = quantitiesEqual(totalAllocated, safeTargetQuantity);

  const noSequencesAvailable = existingSequences.length === 0;

  const selectedSequenceRemaining = selectedSequence
    ? getRemainingSequenceQuantity(selectedSequence, allocations)
    : 0;

  const updateInputQuantity = (value: string) => {
    if (isReadonly) {
      return;
    }

    if (value === "") {
      setInputQuantity("");
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    setInputQuantity(value);
  };

  const handleSelectSequence = (sequenceNo: string) => {
    if (isReadonly) {
      return;
    }

    const sequence =
      existingSequences.find(
        (item) => String(item.sequence_no) === String(sequenceNo),
      ) || null;

    setSelectedSequence(sequence);

    if (!sequence) {
      setInputQuantity("");
      return;
    }

    const remainingSequenceQty = getRemainingSequenceQuantity(
      sequence,
      allocations,
    );

    const suggestedQty = Math.min(remainingSequenceQty, qtyToAllocate);

    setInputQuantity(suggestedQty > 0 ? String(suggestedQty) : "");
  };

  const validateNewAllocation = (): string | null => {
    if (!selectedSequence) {
      return "Please select a stock sequence.";
    }

    if (!Number.isFinite(currentInputQty) || currentInputQty <= 0) {
      return "Quantity must be greater than zero.";
    }

    if (qtyToAllocate <= 0) {
      return "There is no remaining quantity to allocate.";
    }

    if (currentInputQty > qtyToAllocate) {
      return `Quantity cannot exceed the remaining allocation of ${qtyToAllocate}.`;
    }

    if (currentInputQty > sequenceAvailableForAllocation) {
      return `Quantity cannot exceed the remaining quantity of ${sequenceAvailableForAllocation} for sequence ${selectedSequence.sequence_no}.`;
    }

    return null;
  };

  const handleAddRow = () => {
    if (isReadonly) {
      return;
    }

    const validationError = validateNewAllocation();

    if (validationError) {
      return;
    }

    if (!selectedSequence) {
      return;
    }

    const allowedQty = Math.min(
      currentInputQty,
      qtyToAllocate,
      sequenceAvailableForAllocation,
    );

    if (allowedQty <= 0) {
      return;
    }

    const rowToAdd: StockAllocationRecord = {
      location_id: selectedSequence.location_id || locationId || "",

      location_name: selectedSequence.location_name || locationName || "",

      date_received: selectedSequence.date_received || "",

      prod_date: selectedSequence.prod_date || "",

      expiry_date: selectedSequence.expiry_date || "",

      batch_no: selectedSequence.batch_no || "",

      sequence_no: selectedSequence.sequence_no || "",

      serial_no: selectedSequence.serial_no || "",

      quantity: allowedQty,

      available_quantity: normalizeNumber(selectedSequence.available_quantity),
    };

    setAllocations((previous) => [...previous, rowToAdd]);

    setInputQuantity("");
  };

  const handleRemoveRow = (index: number) => {
    if (isReadonly) {
      return;
    }

    setAllocations((previous) =>
      previous.filter((_, allocationIndex) => allocationIndex !== index),
    );

    setInputQuantity("");
  };

  const handleCommitSave = () => {
    if (isReadonly) {
      return;
    }

    if (!canSave) {
      return;
    }

    const normalized = allocations
      .map(normalizeAllocation)
      .filter((allocation) => normalizeNumber(allocation.quantity) > 0);

    onSave(normalized);
  };

  const handleOutboundCommitSave = () => {
    if (isReadonly) {
      return;
    }

    const normalized = allocations
      .map(normalizeAllocation)
      .filter(
        (allocation) =>
          normalizeNumber(allocation.quantity) > 0 &&
          Boolean(allocation.source_allocation_id),
      );

    const total = getTotalAllocated(normalized);

    if (!quantitiesEqual(total, safeTargetQuantity)) {
      return;
    }

    onSave(normalized);
    onClose();
  };

  const getSelectedOutboundQuantity = (sourceAllocationId: string): number => {
    return allocations
      .filter(
        (allocation) => allocation.source_allocation_id === sourceAllocationId,
      )
      .reduce(
        (sum, allocation) => sum + normalizeNumber(allocation.quantity),
        0,
      );
  };

  const handleOutboundQuantityChange = (
    stock: AvailableStockRecord,
    value: string | number,
  ) => {
    if (isReadonly) {
      return;
    }

    const requested = normalizeNumber(value);

    const otherAllocated = allocations
      .filter(
        (allocation) =>
          allocation.source_allocation_id !== stock.source_allocation_id,
      )
      .reduce(
        (sum, allocation) => sum + normalizeNumber(allocation.quantity),
        0,
      );

    const remainingTarget = Math.max(0, safeTargetQuantity - otherAllocated);

    const safeQuantity = Math.min(
      Math.max(0, requested),
      Number(stock.available_quantity || 0),
      remainingTarget,
    );

    setAllocations((previous) => {
      const withoutSource = previous.filter(
        (allocation) =>
          allocation.source_allocation_id !== stock.source_allocation_id,
      );

      if (safeQuantity <= 0) {
        return withoutSource;
      }

      const allocation: StockAllocationRecord = {
        source_allocation_id: stock.source_allocation_id,

        inbound_entry_id: stock.inbound_entry_id,

        location_id: stock.location_id,

        location_name: stock.location_name,

        date_received: stock.date_received,

        prod_date: stock.prod_date,

        expiry_date: stock.expiry_date,

        batch_no: stock.batch_no,

        bin_code: stock.bin_code,

        serial_no: stock.serial_no,

        quantity: safeQuantity,

        available_quantity: stock.available_quantity,

        unit_cost: stock.unit_cost,
      };

      return [...withoutSource, allocation];
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-warehouse" className="text-xl" />

            <h2 className="text-lg font-semibold tracking-wide text-white">
              Stock Allocation
              {" - "}
              {itemCode || "-"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode || "-"}
              {itemName ? ` - ${itemName}` : ""}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName || "-"}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Location
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {locationName || "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 col-span-2 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target Qty.
              </div>

              <div className="text-lg font-bold">
                {safeTargetQuantity}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyToAllocate > 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  qtyToAllocate > 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                Qty. To Allocate
              </div>

              <div
                className={`text-lg font-bold ${
                  qtyToAllocate > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {qtyToAllocate}

                <span className="text-xs font-normal ml-1">{uomName}</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Allocated Total
              </div>

              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {totalAllocated}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {mode === "inbound" && (
          <div className="px-5 pt-5">
            {/* Stock Sequence Selector */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Stock Sequence
                  </label>

                  <select
                    value={selectedSequence?.sequence_no || ""}
                    disabled={
                      isReadonly || qtyToAllocate <= 0 || noSequencesAvailable
                    }
                    onChange={(event) =>
                      handleSelectSequence(event.target.value)
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="">
                      {noSequencesAvailable
                        ? "No stock sequences available"
                        : qtyToAllocate <= 0
                          ? "Allocation complete"
                          : "Select stock sequence..."}
                    </option>

                    {existingSequences.map((sequence, index) => {
                      const remaining = getRemainingSequenceQuantity(
                        sequence,
                        allocations,
                      );

                      return (
                        <option
                          key={`${sequence.sequence_no}-${sequence.serial_no}-${sequence.batch_no}-${index}`}
                          value={sequence.sequence_no}
                          disabled={remaining <= 0}
                        >
                          {sequence.sequence_no}
                          {" | Batch: "}
                          {sequence.batch_no || "-"}
                          {" | Serial: "}
                          {sequence.serial_no || "-"}
                          {" | Available: "}
                          {remaining}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Selected Sequence
                  </div>

                  <div className="font-semibold text-sm mt-1">
                    {selectedSequence?.sequence_no || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sequence Remaining
                  </div>

                  <div className="font-semibold text-sm mt-1">
                    {selectedSequence ? selectedSequenceRemaining : "-"}
                    {uomName ? ` ${uomName}` : ""}
                  </div>
                </div>
              </div>

              {selectedSequence && (
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-[10px] text-slate-500">Location</div>

                    <div className="text-xs font-semibold">
                      {selectedSequence.location_name || locationName || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">Batch</div>

                    <div className="font-mono text-xs font-semibold">
                      {selectedSequence.batch_no || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">Serial</div>

                    <div className="font-mono text-xs font-semibold">
                      {selectedSequence.serial_no || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">
                      Date Received
                    </div>

                    <div className="text-xs font-semibold">
                      {selectedSequence.date_received || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">Prod. Date</div>

                    <div className="text-xs font-semibold">
                      {selectedSequence.prod_date || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">Expiry</div>

                    <div className="text-xs font-semibold">
                      {selectedSequence.expiry_date || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">Available</div>

                    <div className="text-xs font-semibold text-green-600">
                      {selectedSequenceRemaining}
                    </div>
                  </div>
                </div>
              )}

              {noSequencesAvailable && !isReadonly && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
                  No stock sequences are available for this item and warehouse.
                </div>
              )}

              {transactionType === "Negative Entry" &&
                !noSequencesAvailable && (
                  <div className="mt-3 rounded border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 text-xs">
                    Negative Entry: allocation is limited to the available stock
                    quantity of each sequence.
                  </div>
                )}

              {transactionType === "Positive Entry" && (
                <div className="mt-3 rounded border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-xs">
                  Positive Entry: stock sequence information is used for the
                  allocation.
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "outbound" && (
          <div className="px-5 pt-5">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="text-sm font-semibold">
                  Available Source Stock
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select the existing inbound stock layer to consume.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="p-3 text-left">Date Received</th>

                      <th className="p-3 text-left">Batch</th>

                      <th className="p-3 text-left">Bin</th>

                      <th className="p-3 text-left">Serial</th>

                      <th className="p-3 text-left">Location</th>

                      <th className="p-3 text-right">Available</th>

                      <th className="p-3 text-right">Unit Cost</th>

                      <th className="p-3 text-right">Allocate</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {availableStock?.length ? (
                      availableStock.map((stock) => {
                        const selected = getSelectedOutboundQuantity(
                          stock.source_allocation_id,
                        );

                        const remainingForSource = Math.max(
                          0,
                          Number(stock.available_quantity || 0) - selected,
                        );

                        return (
                          <tr
                            key={stock.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          >
                            <td className="p-3">
                              {stock.date_received || "-"}
                            </td>

                            <td className="p-3 font-mono">
                              {stock.batch_no || "-"}
                            </td>

                            <td className="p-3 font-mono">
                              {stock.bin_code || "-"}
                            </td>

                            <td className="p-3 font-mono">
                              {stock.serial_no || "-"}
                            </td>

                            <td className="p-3">
                              {stock.location_name || "-"}
                            </td>

                            <td className="p-3 text-right font-semibold">
                              {stock.available_quantity}
                            </td>

                            <td className="p-3 text-right">
                              {stock.unit_cost}
                            </td>

                            <td className="p-3">
                              <NumericTextInput
                                value={selected ?? 0}
                                min={0}
                                max={Math.min(
                                  stock.available_quantity,
                                  safeTargetQuantity -
                                    totalAllocated +
                                    selected,
                                )}
                                disabled={
                                  isReadonly ||
                                  safeTargetQuantity -
                                    totalAllocated +
                                    selected <=
                                    0
                                }
                                onChange={(value) =>
                                  handleOutboundQuantityChange(stock, value)
                                }
                              />

                              <div className="text-[10px] text-slate-500 mt-1 text-right">
                                Remaining: {remainingForSource}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-6 text-center text-slate-500"
                        >
                          No available source stock found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Allocation Table */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-36">Date Received</th>

                <th className="p-3 w-36">Prod. Date</th>

                <th className="p-3 w-36">Use By Date</th>

                <th className="p-3">Batch No.</th>

                <th className="p-3">Sequence No.</th>

                <th className="p-3">Serial No.</th>

                <th className="p-3">Location</th>

                <th className="p-3 w-28 text-right">
                  Available Qty.
                  {uomName ? ` (${uomName})` : ""}
                </th>

                <th className="p-3 w-28 text-right">
                  Allocated Qty.
                  {uomName ? ` (${uomName})` : ""}
                </th>

                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.map((allocation, index) => (
                <tr
                  key={`${allocation.sequence_no}-${allocation.batch_no}-${allocation.serial_no}-${index}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{allocation.date_received || "-"}</td>

                  <td className="p-3">{allocation.prod_date || "-"}</td>

                  <td className="p-3">{allocation.expiry_date || "-"}</td>

                  <td className="p-3 font-mono">
                    {allocation.batch_no || "-"}
                  </td>

                  <td className="p-3 font-mono">
                    {allocation.sequence_no || "-"}
                  </td>

                  <td className="p-3 font-mono">
                    {allocation.serial_no || "-"}
                  </td>

                  <td className="p-3">{allocation.location_name || "-"}</td>

                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {allocation.available_quantity ?? "-"}
                  </td>

                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {allocation.quantity}
                  </td>

                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove allocation"
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}

              {/* New allocation row */}
              <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                <td className="p-2 text-slate-400" colSpan={8}>
                  {selectedSequence ? (
                    <div className="px-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {selectedSequence.sequence_no}
                      </span>
                      <span className="mx-2">→</span>
                      Enter quantity to allocate from this sequence.
                    </div>
                  ) : (
                    <div className="px-2 text-xs">
                      Select a stock sequence above.
                    </div>
                  )}
                </td>

                <td className="p-2">
                  <NumericTextInput
                    value={qtyToAllocate <= 0 ? 0 : currentInputQty}
                    allowDecimals={false}
                    min="0"
                    disabled={!selectedSequence || maxQty <= 0 || isReadonly}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                    onChange={(value) => updateInputQuantity(String(value))}
                    placeholder={maxQty > 0 ? String(maxQty) : "0"}
                  />
                </td>

                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={
                      !selectedSequence ||
                      currentInputQty <= 0 ||
                      qtyToAllocate <= 0 ||
                      sequenceAvailableForAllocation <= 0 ||
                      isReadonly
                    }
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-sm font-bold text-lg disabled:opacity-30 transition-opacity"
                    title="Add allocation"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Validation message */}
        {!canSave && !isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              Allocate the remaining <strong>{qtyToAllocate}</strong>{" "}
              {uomName || "units"} before saving the allocation.
            </div>
          </div>
        )}

        {canSave && !isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-xs">
              Allocation is complete. Total allocated quantity matches the
              journal quantity.
            </div>
          </div>
        )}

        {isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-slate-200 bg-slate-50 text-slate-600 px-3 py-2 text-xs">
              This allocation is read-only because the journal cannot currently
              be edited.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          {!isReadonly && (
            <Button
              type="button"
              // onClick={handleCommitSave}
              onClick={
                mode === "outbound"
                  ? handleOutboundCommitSave
                  : handleCommitSave
              }
              disabled={!canSave}
              variant="save"
            >
              Save Allocation
            </Button>
          )}

          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useMemo, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

export type StockAllocationRecord = {
  location_id: string;
  location_name: string;

  date_received: string;
  prod_date: string;
  expiry_date: string;

  batch_no: string;
  sequence_no?: string;
  serial_no: string;

  quantity: number;
  available_quantity?: number;
};

export type StockSequenceRecord = {
  location_id: string;
  location_name: string;

  batch_no: string;
  sequence_no: string;
  serial_no: string;

  date_received: string;
  prod_date: string;
  expiry_date: string;

  available_quantity: number;
};

type Props = {
  open: boolean;
  onClose: () => void;

  onSave: (allocations: StockAllocationRecord[]) => void;

  targetQuantity: number;

  itemId?: string;
  itemCode: string;
  itemName: string;

  warehouseId?: string;
  warehouseName: string;

  locationId?: string;
  locationName: string;

  uomName?: string;

  initialAllocations?: StockAllocationRecord[];
  isReadonly?: boolean;
  transactionType?: "Positive Entry" | "Negative Entry";
  existingSequences?: StockSequenceRecord[];
};

const today = () => {
  return new Date().toISOString().split("T")[0];
};

const normalizeAllocation = (
  allocation: Partial<StockAllocationRecord>,
): StockAllocationRecord => ({
  location_id: allocation.location_id || "",
  location_name: allocation.location_name || "",

  date_received: allocation.date_received || "",
  prod_date: allocation.prod_date || "",
  expiry_date: allocation.expiry_date || "",

  batch_no: allocation.batch_no || "",
  sequence_no: allocation.sequence_no || "",
  serial_no: allocation.serial_no || "",

  quantity: Number(allocation.quantity || 0),
  available_quantity:
    allocation.available_quantity === undefined
      ? undefined
      : Number(allocation.available_quantity || 0),
});

const getTotalAllocated = (allocations: StockAllocationRecord[]): number => {
  return allocations.reduce(
    (sum, allocation) => sum + Number(allocation.quantity || 0),
    0,
  );
};

const getRemainingSequenceQuantity = (
  sequence: StockSequenceRecord,
  allocations: StockAllocationRecord[],
): number => {
  const alreadyAllocated = allocations
    .filter((allocation) => allocation.sequence_no === sequence.sequence_no)
    .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);

  return Math.max(
    0,
    Number(sequence.available_quantity || 0) - alreadyAllocated,
  );
};

export default function StockAllocationModal({
  open,
  onClose,
  onSave,

  targetQuantity,

  itemId,
  itemCode,
  itemName,

  warehouseId,
  warehouseName,

  locationId,
  locationName,

  uomName,

  initialAllocations = [],

  transactionType,

  isReadonly = false,

  existingSequences = [],
}: Props) {
  const [allocations, setAllocations] = useState<StockAllocationRecord[]>(() =>
    initialAllocations.map(normalizeAllocation),
  );

  const [selectedSequence, setSelectedSequence] =
    useState<StockSequenceRecord | null>(null);

  const [inputQuantity, setInputQuantity] = useState("");

  const totalAllocated = useMemo(
    () => getTotalAllocated(allocations),
    [allocations],
  );

  const safeTargetQuantity = Math.max(0, Number(targetQuantity || 0));

  const qtyToAllocate = Math.max(0, safeTargetQuantity - totalAllocated);

  const sequenceAvailableForAllocation = selectedSequence
    ? getRemainingSequenceQuantity(selectedSequence, allocations)
    : 0;

  const maxQty = Math.min(sequenceAvailableForAllocation, qtyToAllocate);

  const currentInputQty =
    inputQuantity === "" ? maxQty : Number(inputQuantity || 0);

  const canSave = Math.abs(totalAllocated - safeTargetQuantity) < 0.000001;

  const updateInputQuantity = (value: string) => {
    if (isReadonly) return;

    setInputQuantity(value);
  };

  const handleSelectSequence = (sequenceNo: string) => {
    if (isReadonly) return;

    const sequence =
      existingSequences.find((item) => item.sequence_no === sequenceNo) || null;

    setSelectedSequence(sequence);

    if (!sequence) {
      setInputQuantity("");
      return;
    }

    const remainingSequenceQty = getRemainingSequenceQuantity(
      sequence,
      allocations,
    );

    const suggestedQty = Math.min(remainingSequenceQty, qtyToAllocate);

    setInputQuantity(suggestedQty > 0 ? String(suggestedQty) : "");
  };

  const validateNewAllocation = (): string | null => {
    if (!selectedSequence) {
      return "Please select a stock sequence.";
    }

    if (!Number.isFinite(currentInputQty) || currentInputQty <= 0) {
      return "Quantity must be greater than zero.";
    }

    if (qtyToAllocate <= 0) {
      return "There is no remaining quantity to allocate.";
    }

    if (currentInputQty > qtyToAllocate) {
      return `Quantity cannot exceed the remaining allocation of ${qtyToAllocate}.`;
    }

    if (currentInputQty > sequenceAvailableForAllocation) {
      return `Quantity cannot exceed the remaining quantity of ${sequenceAvailableForAllocation} for sequence ${selectedSequence.sequence_no}.`;
    }

    return null;
  };

  const handleAddRow = () => {
    if (isReadonly) return;

    const validationError = validateNewAllocation();

    if (validationError) {
      return;
    }

    if (!selectedSequence) {
      return;
    }

    const allowedQty = Math.min(
      currentInputQty,
      qtyToAllocate,
      sequenceAvailableForAllocation,
    );

    if (allowedQty <= 0) {
      return;
    }

    const rowToAdd: StockAllocationRecord = {
      location_id: selectedSequence.location_id || locationId || "",

      location_name: selectedSequence.location_name || locationName || "",

      date_received: selectedSequence.date_received || "",

      prod_date: selectedSequence.prod_date || "",

      expiry_date: selectedSequence.expiry_date || "",

      batch_no: selectedSequence.batch_no || "",

      sequence_no: selectedSequence.sequence_no || "",

      serial_no: selectedSequence.serial_no || "",

      quantity: allowedQty,

      available_quantity: Number(selectedSequence.available_quantity || 0),
    };

    setAllocations((previous) => [...previous, rowToAdd]);

    setInputQuantity("");
  };

  const handleRemoveRow = (index: number) => {
    if (isReadonly) return;

    setAllocations((previous) =>
      previous.filter((_, allocationIndex) => allocationIndex !== index),
    );
  };

  const handleCommitSave = () => {
    if (isReadonly) return;

    if (!canSave) {
      return;
    }

    onSave(allocations.map(normalizeAllocation));
  };

  if (!open) {
    return null;
  }

  const noSequencesAvailable = existingSequences.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-warehouse" className="text-xl" />

            <h2 className="text-lg font-semibold tracking-wide text-white">
              Stock Allocation
              {" - "}
              {itemCode}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode || "-"}
              {itemName ? ` - ${itemName}` : ""}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName || "-"}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Location
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {locationName || "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 col-span-2 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target Qty.
              </div>

              <div className="text-lg font-bold">
                {safeTargetQuantity}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyToAllocate > 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  qtyToAllocate > 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                Qty. To Allocate
              </div>

              <div
                className={`text-lg font-bold ${
                  qtyToAllocate > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {qtyToAllocate}

                <span className="text-xs font-normal ml-1">{uomName}</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Allocated Total
              </div>

              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {totalAllocated}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>


        <div className="px-5 pt-5">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Stock Sequence
                </label>

                <select
                  value={selectedSequence?.sequence_no || ""}
                  disabled={
                    isReadonly || qtyToAllocate <= 0 || noSequencesAvailable
                  }
                  onChange={(event) => handleSelectSequence(event.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                >
                  <option value="">
                    {noSequencesAvailable
                      ? "No stock sequences available"
                      : qtyToAllocate <= 0
                        ? "Allocation complete"
                        : "Select stock sequence..."}
                  </option>

                  {existingSequences.map((sequence) => {
                    const remaining = getRemainingSequenceQuantity(
                      sequence,
                      allocations,
                    );

                    return (
                      <option
                        key={`${sequence.sequence_no}-${sequence.serial_no}-${sequence.batch_no}`}
                        value={sequence.sequence_no}
                        disabled={remaining <= 0}
                      >
                        {sequence.sequence_no}
                        {" | Batch: "}
                        {sequence.batch_no || "-"}
                        {" | Serial: "}
                        {sequence.serial_no || "-"}
                        {" | Available: "}
                        {remaining}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Selected Sequence
                </div>

                <div className="font-semibold text-sm mt-1">
                  {selectedSequence?.sequence_no || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Sequence Remaining
                </div>

                <div className="font-semibold text-sm mt-1">
                  {selectedSequence ? sequenceAvailableForAllocation : "-"}
                  {uomName ? ` ${uomName}` : ""}
                </div>
              </div>
            </div>

            {selectedSequence && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-[10px] text-slate-500">Batch</div>

                  <div className="font-mono text-xs font-semibold">
                    {selectedSequence.batch_no || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Serial</div>

                  <div className="font-mono text-xs font-semibold">
                    {selectedSequence.serial_no || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">
                    Date Received
                  </div>

                  <div className="text-xs font-semibold">
                    {selectedSequence.date_received || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Prod. Date</div>

                  <div className="text-xs font-semibold">
                    {selectedSequence.prod_date || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Expiry</div>

                  <div className="text-xs font-semibold">
                    {selectedSequence.expiry_date || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Available</div>

                  <div className="text-xs font-semibold text-green-600">
                    {sequenceAvailableForAllocation}
                  </div>
                </div>
              </div>
            )}

            {noSequencesAvailable && !isReadonly && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
                No stock sequences were provided for this allocation. Make sure
                the journal hook loads and passes the available stock sequences.
              </div>
            )}
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>

                <th className="p-3">Batch No.</th>
                <th className="p-3">Sequence No.</th>
                <th className="p-3">Serial No.</th>

                <th className="p-3 w-28 text-right">
                  Available Qty.
                  {uomName ? ` (${uomName})` : ""}
                </th>

                <th className="p-3 w-28 text-right">
                  Allocated Qty.
                  {uomName ? ` (${uomName})` : ""}
                </th>

                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.map((allocation, index) => (
                <tr
                  key={`${allocation.sequence_no}-${allocation.batch_no}-${allocation.serial_no}-${index}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{allocation.date_received || "-"}</td>

                  <td className="p-3">{allocation.prod_date || "-"}</td>

                  <td className="p-3">{allocation.expiry_date || "-"}</td>

                  <td className="p-3 font-mono">
                    {allocation.batch_no || "-"}
                  </td>

                  <td className="p-3 font-mono">
                    {allocation.sequence_no || "-"}
                  </td>

                  <td className="p-3 font-mono">
                    {allocation.serial_no || "-"}
                  </td>

                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {allocation.available_quantity ?? "-"}
                  </td>

                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {allocation.quantity}
                  </td>

                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove allocation"
                    >
                      
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}


              <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                <td className="p-2 text-slate-400" colSpan={7}>
                  {selectedSequence ? (
                    <div className="px-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {selectedSequence.sequence_no}
                      </span>
                      <span className="mx-2">→</span>
                      Enter quantity to allocate from this sequence.
                    </div>
                  ) : (
                    <div className="px-2 text-xs">
                      Select a stock sequence above.
                    </div>
                  )}
                </td>

                <td className="p-2">
                  <NumericTextInput
                    value={qtyToAllocate <= 0 ? 0 : currentInputQty}
                    allowDecimals={false}
                    min="0"
                    disabled={!selectedSequence || maxQty <= 0 || isReadonly}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                    onChange={(value) => updateInputQuantity(String(value))}
                    placeholder={maxQty > 0 ? String(maxQty) : "0"}
                  />
                </td>

                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={
                      !selectedSequence ||
                      currentInputQty <= 0 ||
                      qtyToAllocate <= 0 ||
                      sequenceAvailableForAllocation <= 0 ||
                      isReadonly
                    }
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-sm font-bold text-lg disabled:opacity-30 transition-opacity"
                    title="Add allocation"
                  >
                    +
                  </button>
                </td>
              </tr>

              
            </tbody>
          </table>
        </div>

        {!canSave && !isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              Allocate the remaining <strong>{qtyToAllocate}</strong>{" "}
              {uomName || "units"} before saving the allocation.
            </div>
          </div>
        )}

        {canSave && !isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-xs">
              Allocation is complete. Total allocated quantity matches the
              journal quantity.
            </div>
          </div>
        )}

   
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={!canSave || isReadonly}
            variant="save"
          >
            Save Allocation
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} */
{
  /*  <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.date_received
                        ? new Date(newRowInput.date_received)
                        : undefined
                    }
                    disabled={isReadonly}
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "date_received",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    disabled={isReadonly}
                    maxDate={
                      newRowInput.date_received
                        ? new Date(newRowInput.date_received)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "prod_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.expiry_date
                        ? new Date(newRowInput.expiry_date)
                        : undefined
                    }
                    disabled={isReadonly}
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "expiry_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Batch No."
                    value={newRowInput.batch_no}
                    disabled={isReadonly}
                    onChange={(event) =>
                      updateNewRowInput("batch_no", event.target.value)
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </td>

                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Serial No."
                    value={newRowInput.serial_no}
                    disabled={isReadonly}
                    onChange={(event) =>
                      updateNewRowInput("serial_no", event.target.value)
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </td>

                <td className="p-2">
                  <NumericTextInput
                    value={qtyToAllocate <= 0 ? 0 : currentInputQty}
                    allowDecimals={false}
                    min="0"
                    disabled={qtyToAllocate <= 0 || isReadonly}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                    onChange={(value) =>
                      updateNewRowInput("quantity", String(value))
                    }
                    placeholder={
                      qtyToAllocate > 0 ? String(qtyToAllocate) : "0"
                    }
                  />
                </td>

                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={
                      currentInputQty <= 0 || qtyToAllocate <= 0 || isReadonly
                    }
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-sm font-bold text-lg disabled:opacity-30 transition-opacity"
                    title="Add allocation"
                  >
                    +
                  </button>
                </td>
              </tr> */
}
// const [newRowInput, setNewRowInput] = useState({
//   date_received: today(),
//   prod_date: "",
//   expiry_date: "",
//   batch_no: "",
//   serial_no: "",
//   quantity: "",
// });

// const totalAllocated = useMemo(
//   () => getTotalAllocated(allocations),
//   [allocations],
// );

// const safeTargetQuantity = Math.max(0, Number(targetQuantity || 0));

// const qtyToAllocate = Math.max(0, safeTargetQuantity - totalAllocated);

// const isNegativeEntry = transactionType === "Negative Entry";

// const currentInputQty =
//   newRowInput.quantity === ""
//     ? qtyToAllocate
//     : Number(newRowInput.quantity || 0);

// const canSave = Math.abs(totalAllocated - safeTargetQuantity) < 0.000001;

// const updateNewRowInput = (
//   field: keyof typeof newRowInput,
//   value: string,
// ) => {
//   if (isReadonly) return;

//   setNewRowInput((previous) => ({
//     ...previous,
//     [field]: value,
//   }));
// };

// const validateNewAllocation = () => {
//   if (!selectedSequence) {
//     return "Please select a stock sequence.";
//   }

//   if (currentInputQty <= 0) {
//     return "Quantity must be greater than zero.";
//   }

//   const availableQty = Number(selectedSequence.available_quantity || 0);

//   if (currentInputQty > qtyToAllocate) {
//     return `Quantity cannot exceed the remaining allocation of ${qtyToAllocate}.`;
//   }

//   if (selectedSequence && currentInputQty > availableQty) {
//     return `Quantity cannot exceed the available quantity of ${selectedSequence.available_quantity}.`;
//   }

//   if (
//     newRowInput.prod_date &&
//     newRowInput.date_received &&
//     newRowInput.prod_date > newRowInput.date_received
//   ) {
//     return "Production date cannot be after the date received.";
//   }

//   if (
//     newRowInput.expiry_date &&
//     newRowInput.prod_date &&
//     newRowInput.expiry_date < newRowInput.prod_date
//   ) {
//     return "Expiry date cannot be before the production date.";
//   }

//   return null;
// };

// const getRemainingSequenceQuantity = (
//   sequence: StockSequenceRecord,
//   allocations: StockAllocationRecord[],
// ) => {
//   const alreadyAllocated = allocations
//     .filter((allocation) => allocation.sequence_no === sequence.sequence_no)
//     .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);

//   return Math.max(
//     0,
//     Number(sequence.available_quantity || 0) - alreadyAllocated,
//   );
// };

// const sequenceAvailableForAllocation = selectedSequence
//   ? getRemainingSequenceQuantity(selectedSequence, allocations)
//   : 0;

// const maxQty = Math.min(sequenceAvailableForAllocation, qtyToAllocate);

// const handleAddRow = () => {
//   if (isReadonly) return;

//   const validationError = validateNewAllocation();

//   if (validationError) {
//     return;
//   }

//   const allowedQty = Math.min(currentInputQty, qtyToAllocate);

//   const rowToAdd: StockAllocationRecord = {
//     location_id: locationId || "",
//     location_name: locationName || "",

//     date_received: newRowInput.date_received,
//     prod_date: newRowInput.prod_date,
//     expiry_date: newRowInput.expiry_date,

//     batch_no: newRowInput.batch_no.trim(),
//     serial_no: newRowInput.serial_no.trim(),
//     quantity: Number(allowedQty),
//   };

//   setAllocations((previous) => [...previous, rowToAdd]);

//   const nextRemaining = Math.max(0, qtyToAllocate - allowedQty);

//   setNewRowInput({
//     date_received: today(),
//     prod_date: "",
//     expiry_date: "",
//     batch_no: "",
//     serial_no: "",
//     quantity: nextRemaining > 0 ? String(nextRemaining) : "",
//   });
// };

// const handleRemoveRow = (index: number) => {
//   if (isReadonly) return;

//   setAllocations((previous) =>
//     previous.filter((_, allocationIndex) => allocationIndex !== index),
//   );
// };

// app/components/shared/modals/SO_StockAllocationModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

export type SO_StockAllocationRecord = {
  location_id: string;
  location_name: string;
  date_received?: string;
  prod_date?: string;
  expiry_date?: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  available_qty?: number; // Tracks available balance of the selected batch
};

type AvailableStockBatch = {
  location_id: string;
  location_name: string;
  date_received?: string;
  prod_date?: string;
  expiry_date?: string;
  batch_no?: string;
  serial_no?: string;
  available_qty: number;
};

type Props = {
  open: boolean;
  isReadonly?: boolean;
  onClose: () => void;
  onSave: (allocations: SO_StockAllocationRecord[]) => void;
  targetQuantity: number;
  itemId?: string;
  itemCode: string;
  itemName: string;
  warehouseId?: string;
  warehouseName: string;
  uomName?: string;
  initialAllocations?: SO_StockAllocationRecord[];
};

export default function SO_StockAllocationModal({
  open,
  isReadonly = false,
  onClose,
  onSave,
  targetQuantity,
  itemId,
  itemCode,
  itemName,
  warehouseId,
  warehouseName,
  uomName,
  initialAllocations = [],
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<
    AvailableStockBatch[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allocations, setAllocations] =
    useState<SO_StockAllocationRecord[]>(initialAllocations);

  const [selectedBatchIdx, setSelectedBatchIdx] = useState<string>("");
  const [inputQty, setInputQty] = useState<string>("");

  const totalAllocated = allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  // Fetch available on-hand stock batches for the selected item and warehouse
  useEffect(() => {
    if (!open || !itemId || !warehouseId) return;

    const fetchStockBatches = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/inventory/available-batches?item_id=${itemId}&warehouse_id=${warehouseId}`,
        );
        if (!res.ok) return;

        const payload = await res.json();
        setAvailableBatches(payload.data ?? []);
      } catch (err) {
        console.error("Failed to load available stock batches", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockBatches();
  }, [open, itemId, warehouseId]);

  // Sync initial state when modal opens
  useEffect(() => {
    if (open) {
      setAllocations(initialAllocations);
      setSelectedBatchIdx("");
      setInputQty("");
    }
  }, [open, initialAllocations]);

  const selectedBatch =
    selectedBatchIdx !== "" ? availableBatches[Number(selectedBatchIdx)] : null;

  // Calculate actual remaining available quantity for selected batch (taking current allocations into account)
  const currentlyAllocatedFromBatch = selectedBatch
    ? allocations
        .filter(
          (a) =>
            a.location_id === selectedBatch.location_id &&
            a.batch_no === selectedBatch.batch_no &&
            a.serial_no === selectedBatch.serial_no,
        )
        .reduce((sum, a) => sum + a.quantity, 0)
    : 0;

  const maxSelectableQty = selectedBatch
    ? Math.max(0, selectedBatch.available_qty - currentlyAllocatedFromBatch)
    : 0;

  const currentInputQty =
    inputQty === ""
      ? Math.min(Math.max(0, qtyToAllocate), maxSelectableQty)
      : parseFloat(inputQty) || 0;

  const handleAddRow = () => {
    if (!selectedBatch || currentInputQty <= 0 || qtyToAllocate <= 0) return;

    const allowedQty = Math.min(
      currentInputQty,
      qtyToAllocate,
      maxSelectableQty,
    );
    if (allowedQty <= 0) return;

    const rowToAdd: SO_StockAllocationRecord = {
      location_id: selectedBatch.location_id,
      location_name: selectedBatch.location_name,
      date_received: selectedBatch.date_received,
      prod_date: selectedBatch.prod_date,
      expiry_date: selectedBatch.expiry_date,
      batch_no: selectedBatch.batch_no,
      serial_no: selectedBatch.serial_no,
      quantity: allowedQty,
      available_qty: selectedBatch.available_qty,
    };

    setAllocations((prev) => [...prev, rowToAdd]);
    setSelectedBatchIdx("");
    setInputQty("");
  };

  const handleRemoveRow = (index: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommitSave = () => {
    onSave(allocations);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:truck-delivery" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Stock Allocation - Sales Dispatch Pipeline ({itemCode})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* Top Information Bar */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode} - {itemName}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName}
            </div>
          </div>

          <div className="grid grid-cols-3 col-span-3 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Target Qty.
              </div>
              <div className="text-lg font-bold">
                {targetQuantity}{" "}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyToAllocate !== 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div className="text-xs text-red-500 dark:text-red-400 capitalize font-medium">
                Qty. To Allocate
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {qtyToAllocate}{" "}
                <span className="text-xs text-red-400 dark:text-red-500/70 font-normal">
                  {uomName}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-green-600 dark:text-green-400 capitalize font-medium">
                Allocated Total
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {totalAllocated}{" "}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation Table */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-36">Date Received</th>
                <th className="p-3 w-36">Prod. Date</th>
                <th className="p-3 w-36">Use By Date</th>
                <th className="p-3 w-48">Storage Location</th>
                <th className="p-3">Batch No.</th>
                <th className="p-3">Serial No.</th>
                <th className="p-3 w-28 text-right">Qty. ({uomName})</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{item.date_received || "-"}</td>
                  <td className="p-3">{item.prod_date || "-"}</td>
                  <td className="p-3">{item.expiry_date || "-"}</td>
                  <td className="p-3">{item.location_name}</td>
                  <td className="p-3 font-mono">{item.batch_no || "-"}</td>
                  <td className="p-3 font-mono">{item.serial_no || "-"}</td>
                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {item.quantity}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={isReadonly}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors disabled:opacity-30"
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add New Allocation Row */}
              {!isReadonly && (
                <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                  <td className="p-3 text-slate-500">
                    {selectedBatch?.date_received || "-"}
                  </td>
                  <td className="p-3 text-slate-500">
                    {selectedBatch?.prod_date || "-"}
                  </td>
                  <td className="p-3 text-slate-500">
                    {selectedBatch?.expiry_date || "-"}
                  </td>
                  <td className="p-2 col-span-3" colSpan={3}>
                    <select
                      value={selectedBatchIdx}
                      disabled={isLoading || qtyToAllocate <= 0 || isReadonly}
                      onChange={(e) => {
                        setSelectedBatchIdx(e.target.value);
                        setInputQty("");
                      }}
                      className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    >
                      <option value="">
                        {isLoading
                          ? "Loading Stock Batches..."
                          : "-- Select Available Batch / Location --"}
                      </option>
                      {availableBatches.map((batch, idx) => {
                        const assigned = allocations
                          .filter(
                            (a) =>
                              a.location_id === batch.location_id &&
                              a.batch_no === batch.batch_no &&
                              a.serial_no === batch.serial_no,
                          )
                          .reduce((sum, a) => sum + a.quantity, 0);
                        const rem = batch.available_qty - assigned;

                        return (
                          <option key={idx} value={idx} disabled={rem <= 0}>
                            {batch.location_name} | Batch:{" "}
                            {batch.batch_no || "N/A"}{" "}
                            {batch.serial_no ? `| S/N: ${batch.serial_no}` : ""}{" "}
                            (Avail: {rem})
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="p-2">
                    <NumericTextInput
                      value={
                        qtyToAllocate <= 0 || !selectedBatch
                          ? 0
                          : Number(inputQty || currentInputQty)
                      }
                      allowDecimals={false}
                      min="0"
                      disabled={
                        qtyToAllocate <= 0 ||
                        !selectedBatch ||
                        maxSelectableQty <= 0 ||
                        isReadonly
                      }
                      className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                      onChange={(val) => setInputQty(String(val))}
                      placeholder={
                        maxSelectableQty > 0 ? maxSelectableQty.toString() : "0"
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      disabled={
                        !selectedBatch ||
                        currentInputQty <= 0 ||
                        qtyToAllocate <= 0 ||
                        maxSelectableQty <= 0 ||
                        isReadonly
                      }
                      className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-xs font-bold text-lg disabled:opacity-30 transition-opacity"
                    >
                      +
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={qtyToAllocate !== 0 || isReadonly}
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
}

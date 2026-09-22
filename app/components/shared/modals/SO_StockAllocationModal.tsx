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
  bin_code?: string;
  serial_no?: string;
  quantity: number;
  available_qty?: number;
};

type RawStockBatch = {
  id?: string;
  location_id: string;
  location_name: string;
  date_received?: string;
  prod_date?: string;
  expiry_date?: string;
  batch_no?: string;
  bin_code?: string;
  serial_no?: string;
  available_qty?: number;
  available_quantity?: number;
  [key: string]: unknown;
};

type AvailableStockBatch = {
  id: string;
  source_allocation_id?: string;
  location_id: string;
  location_name: string;
  date_received?: string;
  prod_date?: string;
  expiry_date?: string;
  batch_no?: string;
  bin_code?: string;
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
  uomName = "Pcs",
  initialAllocations = [],
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<AvailableStockBatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Track allocations in state keyed by batch.id
  const [allocationsMap, setAllocationsMap] = useState<Record<string, number>>({});

  // Unique key generator using batch.id
  const getBatchKey = (batch: AvailableStockBatch, index: number) =>
    batch.id || `${batch.location_id}_${batch.batch_no || ""}_${batch.bin_code || ""}_${index}`;

  // Fetch stock batches and normalize response fields
  useEffect(() => {
    if (!open || !itemId || !warehouseId) return;

    const fetchStockBatches = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/sales/sales-orders/available-batches?item_id=${itemId}&warehouse_id=${warehouseId}`
        );
        if (!res.ok) return;

        const payload = await res.json();
        const rawBatches: RawStockBatch[] = payload.data ?? [];

        // Normalize available_quantity -> available_qty & guarantee unique ID
        const mappedBatches: AvailableStockBatch[] = rawBatches.map((b, idx) => ({
          id: b.id || `batch_${b.location_id}_${b.batch_no || ""}_${b.bin_code || ""}_${idx}`,
          location_id: b.location_id,
          location_name: b.location_name,
          date_received: b.date_received,
          prod_date: b.prod_date,
          expiry_date: b.expiry_date,
          batch_no: b.batch_no,
          bin_code: b.bin_code,
          serial_no: b.serial_no,
          available_qty: Number(b.available_qty ?? b.available_quantity ?? 0),
        }));

        setAvailableBatches(mappedBatches);
      } catch (err) {
        console.error("Failed to load available stock batches", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockBatches();
  }, [open, itemId, warehouseId]);

  // Synchronize initial allocations into map representation
  useEffect(() => {
    if (open && availableBatches.length > 0) {
      const initialMap: Record<string, number> = {};

      initialAllocations.forEach((alloc) => {
        // Match initial allocation record with unique loaded batch
        const matchingBatch = availableBatches.find(
          (b) =>
            b.location_id === alloc.location_id &&
            (b.batch_no || "") === (alloc.batch_no || "") &&
            (b.bin_code || "") === (alloc.bin_code || "")
        );

        if (matchingBatch) {
          initialMap[matchingBatch.id] = alloc.quantity;
        }
      });

      setAllocationsMap(initialMap);
    }
  }, [open, initialAllocations, availableBatches]);

  const totalAllocated = Object.values(allocationsMap).reduce(
    (sum, qty) => sum + (qty || 0),
    0
  );

  const qtyToAllocate = Math.max(0, targetQuantity - totalAllocated);

  const handleQtyInputChange = (batch: AvailableStockBatch, rawVal: number) => {
    const key = batch.id;
    const currentAllocated = allocationsMap[key] || 0;

    // Strict ceiling limit calculation
    const maxAllowedForThisRow = Math.min(
      batch.available_qty,
      qtyToAllocate + currentAllocated
    );

    // Hard clamp typed values
    const safeValue = Math.max(0, Math.min(rawVal || 0, maxAllowedForThisRow));

    setAllocationsMap((prev) => {
      const next = { ...prev };
      if (safeValue <= 0) {
        delete next[key];
      } else {
        next[key] = safeValue;
      }
      return next;
    });
  };

  const handleCommitSave = () => {
    const records: SO_StockAllocationRecord[] = [];

    availableBatches.forEach((batch) => {
      const key = batch.id;
      const allocatedQty = allocationsMap[key] || 0;

      if (allocatedQty > 0) {
        records.push({
          location_id: batch.location_id,
          location_name: batch.location_name,
          date_received: batch.date_received,
          prod_date: batch.prod_date,
          expiry_date: batch.expiry_date,
          batch_no: batch.batch_no,
          bin_code: batch.bin_code,
          serial_no: batch.serial_no,
          quantity: allocatedQty,
          available_qty: batch.available_qty,
        });
      }
    });

    onSave(records);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2.5">
            <Icon icon="tabler:boxes" className="text-xl text-emerald-400 dark:text-slate-300" />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Stock Batch Allocation Pipeline &mdash; {itemCode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-lg" />
          </button>
        </div>

        {/* Summary Header Bar */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-0.5">
            <div className="text-slate-500 dark:text-slate-400 font-medium">Item Details</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {itemCode} - {itemName}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-500 dark:text-slate-400 font-medium">Warehouse</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {warehouseName}
            </div>
          </div>

          <div className="grid grid-cols-3 col-span-3 gap-3 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2 shadow-xs">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">
                Target Qty
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {targetQuantity} <span className="text-xs font-normal text-slate-400">{uomName}</span>
              </div>
            </div>

            <div
              className={`border rounded p-2 shadow-xs transition-colors ${
                qtyToAllocate > 0
                  ? "border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20"
                  : "border-emerald-300 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20"
              }`}
            >
              <div
                className={`text-[11px] uppercase font-medium ${
                  qtyToAllocate > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                To Allocate
              </div>
              <div
                className={`text-base font-bold ${
                  qtyToAllocate > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {qtyToAllocate} <span className="text-xs font-normal opacity-80">{uomName}</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2 shadow-xs">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-medium">
                Allocated Total
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {totalAllocated} <span className="text-xs font-normal text-slate-400">{uomName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5">Storage Location</th>
                  <th className="p-2.5">Batch No.</th>
                  <th className="p-2.5">Bin Code / Serial</th>
                  <th className="p-2.5">Rec. Date</th>
                  <th className="p-2.5">Expiry Date</th>
                  <th className="p-2.5 text-right">Available Qty</th>
                  <th className="p-2.5 text-right w-40">Allocated Stock Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {availableBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      {isLoading
                        ? "Loading stock data..."
                        : "No available stock batches found for this item in selected warehouse."}
                    </td>
                  </tr>
                ) : (
                  availableBatches.map((batch, idx) => {
                    const rowKey = getBatchKey(batch, idx);
                    const currentAllocated = allocationsMap[batch.id] || 0;
                    const isAllocated = currentAllocated > 0;

                    const maxAllowedForThisRow = Math.min(
                      batch.available_qty,
                      qtyToAllocate + currentAllocated
                    );

                    return (
                      <tr
                        key={rowKey}
                        className={`transition-colors ${
                          isAllocated
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {batch.location_name}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                          {batch.batch_no || "-"}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                          {batch.bin_code || batch.serial_no || "-"}
                        </td>
                        <td className="p-2.5 text-slate-500">{batch.date_received || "-"}</td>
                        <td className="p-2.5 text-slate-500">{batch.expiry_date || "-"}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {batch.available_qty}
                        </td>
                        <td className="p-2 text-right">
                          <NumericTextInput
                            value={currentAllocated}
                            allowDecimals={false}
                            min="0"
                            max={String(maxAllowedForThisRow)}
                            disabled={isReadonly || (qtyToAllocate === 0 && !isAllocated)}
                            className={`border rounded px-2 py-1 w-full text-right font-semibold text-xs focus:outline-hidden focus:ring-1 ${
                              isAllocated
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            }`}
                            onChange={(val) => handleQtyInputChange(batch, Number(val))}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {qtyToAllocate > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Remaining quantity of {qtyToAllocate} {uomName} must be allocated before saving.
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Icon icon="tabler:circle-check-filled" /> Target allocation quantity fully satisfied.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-4 py-2 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCommitSave}
              disabled={qtyToAllocate !== 0 || isReadonly}
              className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-xs disabled:opacity-40"
            >
              Save Allocation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* "use client";

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
  bin_code?: string;
  serial_no?: string;
  quantity: number;
  available_qty?: number;
};

type AvailableStockBatch = {
  location_id: string;
  location_name: string;
  date_received?: string;
  prod_date?: string;
  expiry_date?: string;
  batch_no?: string;
  bin_code?: string;
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
  uomName = "Pcs",
  initialAllocations = [],
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<
    AvailableStockBatch[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allocations, setAllocations] =
    useState<SO_StockAllocationRecord[]>(initialAllocations);

  // Per-row input quantities keyed by batch index
  const [rowInputs, setRowInputs] = useState<Record<number, string>>({});

  const totalAllocated = allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const qtyToAllocate = Math.max(0, targetQuantity - totalAllocated);

  // Fetch available on-hand stock batches for the selected item and warehouse
  useEffect(() => {
    if (!open || !itemId || !warehouseId) return;

    const fetchStockBatches = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/sales/sales-orders/available-batches?item_id=${itemId}&warehouse_id=${warehouseId}`,
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
      setRowInputs({});
    }
  }, [open, initialAllocations]);

  // Helper to calculate how much quantity is already allocated from a specific batch
  const getBatchAllocatedQty = (batch: AvailableStockBatch) => {

    console.log('batch ==== ',batch);
    console.log('allocations ==== ',allocations);
    return allocations
      .filter(
        (a) =>
          a.location_id === batch.location_id &&
          a.batch_no === batch.batch_no &&
          a.bin_code === batch.bin_code,
      )
      .reduce((sum, a) => sum + a.quantity, 0);
  };

  const handleAllocateRow = (batch: AvailableStockBatch, index: number) => {
    const allocatedFromBatch = getBatchAllocatedQty(batch);
    const maxSelectableQty = Math.max(
      0,
      batch.available_qty - allocatedFromBatch,
    );

    const inputVal = rowInputs[index];
    const requestedQty =
      inputVal !== undefined && inputVal !== ""
        ? parseFloat(inputVal)
        : Math.min(qtyToAllocate, maxSelectableQty);

    if (isNaN(requestedQty) || requestedQty <= 0 || qtyToAllocate <= 0) return;

    const allowedQty = Math.min(requestedQty, qtyToAllocate, maxSelectableQty);
    if (allowedQty <= 0) return;

    const rowToAdd: SO_StockAllocationRecord = {
      location_id: batch.location_id,
      location_name: batch.location_name,
      date_received: batch.date_received,
      prod_date: batch.prod_date,
      expiry_date: batch.expiry_date,
      batch_no: batch.batch_no,
      bin_code: batch.bin_code,
      serial_no: batch.serial_no,
      quantity: allowedQty,
      available_qty: batch.available_qty,
    };

    setAllocations((prev) => [...prev, rowToAdd]);
    setRowInputs((prev) => ({ ...prev, [index]: "" }));
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommitSave = () => {
    onSave(allocations);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">

        <div className="flex justify-between items-center px-6 py-3.5 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2.5">
            <Icon
              icon="tabler:boxes"
              className="text-xl text-emerald-400 dark:text-slate-300"
            />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Stock Batch Allocation Pipeline &mdash; {itemCode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-lg" />
          </button>
        </div>


        <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-0.5">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item Details
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {itemCode} - {itemName}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {warehouseName}
            </div>
          </div>

          <div className="grid grid-cols-3 col-span-3 gap-3 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2 shadow-xs">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">
                Target Qty
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {targetQuantity}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 shadow-xs transition-colors ${
                qtyToAllocate > 0
                  ? "border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20"
                  : "border-emerald-300 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20"
              }`}
            >
              <div
                className={`text-[11px] uppercase font-medium ${
                  qtyToAllocate > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                To Allocate
              </div>
              <div
                className={`text-base font-bold ${
                  qtyToAllocate > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {qtyToAllocate}{" "}
                <span className="text-xs font-normal opacity-80">
                  {uomName}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2 shadow-xs">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-medium">
                Allocated Total
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {totalAllocated}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>


        <div className="p-5 overflow-y-auto space-y-6 flex-1">
    
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Icon
                  icon="tabler:list-check"
                  className="text-base text-slate-500"
                />
                Available Stock Batches
              </h3>
              {isLoading && (
                <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1">
                  <Icon icon="tabler:loader" className="animate-spin" />{" "}
                  Fetching batches...
                </span>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2.5">Storage Location</th>
                    <th className="p-2.5">Batch No.</th>
                    <th className="p-2.5">Serial No.</th>
                    <th className="p-2.5">Rec. Date</th>
                    <th className="p-2.5">Expiry Date</th>
                    <th className="p-2.5 text-right">Available Qty</th>
                    <th className="p-2.5 text-right w-36">Allocate Qty</th>
                    <th className="p-2.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {availableBatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        {isLoading
                          ? "Loading stock data..."
                          : "No available stock batches found for this item in selected warehouse."}
                      </td>
                    </tr>
                  ) : (
                    availableBatches.map((batch, idx) => {
                      const allocatedQty = getBatchAllocatedQty(batch) | 0;
                      const remAvailable = Math.max(
                        0,
                        batch.available_qty - allocatedQty,
                      );
                      const isFullyAllocated = remAvailable <= 0;

                      console.log('availableBatches ==== ',availableBatches);
                      console.log('allocatedQty ==== ',allocatedQty);
                      console.log('remAvailable ==== ',remAvailable);

                      const defaultInputVal =
                        rowInputs[idx] !== undefined
                          ? rowInputs[idx]
                          : remAvailable > 0 && qtyToAllocate > 0
                            ? Math.min(qtyToAllocate, remAvailable).toString()
                            : "0";

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            isFullyAllocated
                              ? "opacity-50 bg-slate-50/40 dark:bg-slate-900/40"
                              : ""
                          }`}
                        >
                          <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {batch.location_name}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                            {batch.batch_no || "-"}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                            {batch.bin_code || batch.serial_no || "-"}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {batch.date_received || "-"}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {batch.expiry_date || "-"}
                          </td>
                          <td className="p-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {remAvailable}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">
                              / {batch.available_qty}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <NumericTextInput
                              value={Number(defaultInputVal)}
                              allowDecimals={false}
                              min="0"
                              disabled={
                                isFullyAllocated ||
                                qtyToAllocate <= 0 ||
                                isReadonly
                              }
                              className="border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-slate-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-xs"
                              onChange={(val) =>
                                setRowInputs((prev) => ({
                                  ...prev,
                                  [idx]: String(val),
                                }))
                              }
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                isFullyAllocated ||
                                qtyToAllocate <= 0 ||
                                isReadonly ||
                                Number(defaultInputVal) <= 0
                              }
                              onClick={() => handleAllocateRow(batch, idx)}
                              className="h-7 px-2.5 text-xs bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors"
                            >
                              <Icon
                                icon="tabler:plus"
                                className="mr-1 text-sm"
                              />{" "}
                              Allocate
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

 
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Icon
                icon="tabler:circle-check"
                className="text-base text-emerald-600 dark:text-emerald-400"
              />
              Allocated Stock Rows ({allocations.length})
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2.5">Storage Location</th>
                    <th className="p-2.5">Batch No.</th>
                    <th className="p-2.5">Serial No.</th>
                    <th className="p-2.5">Expiry Date</th>
                    <th className="p-2.5 text-right">Allocated Qty</th>
                    <th className="p-2.5 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allocations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        No allocations selected yet. Use the available stock
                        table above to assign quantities.
                      </td>
                    </tr>
                  ) : (
                    allocations.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {item.location_name}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                          {item.batch_no || "-"}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                          {item.bin_code || item.serial_no || "-"}
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {item.expiry_date || "-"}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {item.quantity} {uomName}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveAllocation(index)}
                            disabled={isReadonly}
                            className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-30"
                            title="Remove allocation"
                          >
                            <Icon icon="tabler:trash" className="text-base" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {qtyToAllocate > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Remaining quantity of {qtyToAllocate} {uomName} must be
                allocated before saving.
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Icon icon="tabler:circle-check-filled" /> Target allocation
                quantity fully satisfied.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-4 py-2 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCommitSave}
              disabled={qtyToAllocate !== 0 || isReadonly}
              className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-xs disabled:opacity-40"
            >
              Save Allocation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
 */

// app/components/shared/modals/ST_StockAllocationModal.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";
import { format, isValid, parseISO } from "date-fns";

export type ST_StockAllocationRecord = {
  id?: string | null;
  source_allocation_id?: string | null;
  inbound_entry_id?: string | null | undefined;

  location_id: string;
  location_name: string;

  expiry_date?: string | null;
  date_received?: string | null;
  prod_date?: string | null;

  batch_no?: string | null;
  bin_code?: string | null;
  serial_no?: string | null;

  quantity: number;
  available_qty?: number;
  available_quantity?: number;
  unit_cost?: number | undefined;
};

type RawStockBatch = {
  id?: string;
  source_allocation_id?: string | null;
  inbound_entry_id?: string | null;

  location_id: string;
  location_name?: string | null;

  expiry_date?: string | null;
  date_received?: string | null;
  prod_date?: string | null;

  batch_no?: string | null;
  bin_code?: string | null;
  serial_no?: string | null;

  available_qty?: number | string | null;
  available_quantity?: number | string | null;
  availablequantity?: number | string | null;

  unit_cost?: number | string | null;
};

export type AvailableStockBatch = {
  id: string;
  source_allocation_id?: string | null;
  inbound_entry_id: string;

  location_id: string;
  location_name: string;

  expiry_date?: string | null;
  date_received?: string | null;
  prod_date?: string | null;

  batch_no?: string | null;
  bin_code?: string | null;
  serial_no?: string | null;

  available_qty: number;
  unit_cost: number;
};

type Props = {
  open: boolean;
  isReadonly?: boolean;
  onClose: () => void;
  onSave: (allocations: ST_StockAllocationRecord[]) => void;

  targetQuantity: number;
  itemId?: string;
  itemCode: string;
  itemName: string;

  warehouseId?: string;
  warehouseName: string;
  locationId?: string;
  locationName: string;

  uomName?: string;
  mode?: string;
  initialAllocations?: ST_StockAllocationRecord[];
  transferId?: string;
};

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : value;
}

export default function ST_StockAllocationModal({
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
  locationId,
  locationName,
  uomName = "Pcs",
  mode,
  initialAllocations = [],
  transferId,
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<
    AvailableStockBatch[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [allocationsMap, setAllocationsMap] = useState<Record<string, number>>(
    {},
  );

  const getBatchKey = (batch: AvailableStockBatch, index: number) =>
    batch.id ||
    `${batch.location_id}_${batch.batch_no || ""}_${batch.bin_code || ""}_${index}`;

  // const getBatchKey = useCallback((batch: AvailableStockBatch, index: number) => batch.id || `${batch.inbound_entry_id}_${batch.location_id}_${batch.batch_no ?? ""}_${batch.bin_code ?? ""}_${index}`, [],);

  useEffect(() => {
    if (!open || !itemId || !warehouseId) {
      setAvailableBatches([]);
      setAllocationsMap({});
      setLoadError("");
      return;
    }

    const controller = new AbortController();

    async function fetchStockBatches() {
      setIsLoading(true);
      setLoadError("");

      try {
        if (!itemId || !warehouseId) return;
        const params = new URLSearchParams({
          item_id: itemId,
          warehouse_id: warehouseId,
        });

        if (transferId) {
          params.set("transfer_id", transferId);
        }

        const response = await fetch(
          `/api/inventory/transfer-stock/available-batches?${params.toString()}`,
          //   { signal: controller.signal },
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to load available transfer stock.",
          );
        }

        const rawBatches: RawStockBatch[] = payload.data ?? [];

        const mapped: AvailableStockBatch[] = rawBatches
          .map((batch, index) => ({
            id:
              batch.id ||
              batch.inbound_entry_id ||
              `stock_${batch.location_id}_${batch.batch_no ?? ""}_${batch.bin_code ?? ""}_${index}`,

            source_allocation_id: batch.source_allocation_id ?? null,
            inbound_entry_id: batch.inbound_entry_id ?? "",

            location_id: batch.location_id,
            location_name: batch.location_name || "Unspecified location",

            expiry_date: batch.expiry_date ?? null,
            date_received: batch.date_received ?? null,
            prod_date: batch.prod_date ?? null,

            batch_no: batch.batch_no ?? null,
            bin_code: batch.bin_code ?? null,
            serial_no: batch.serial_no ?? null,

            available_qty: Number(
              batch.available_quantity ??
                batch.available_qty ??
                batch.availablequantity ??
                0,
            ),
            unit_cost: Number(batch.unit_cost ?? 0),
          }))
          .filter(
            (batch) =>
              batch.inbound_entry_id &&
              Number.isFinite(batch.available_qty) &&
              batch.available_qty > 0,
          );

        setAvailableBatches(mapped);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        console.error("Failed to load transfer stock batches", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load available stock.",
        );
        setAvailableBatches([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void fetchStockBatches();

    return () => controller.abort();
  }, [open, itemId, warehouseId, transferId]);

  useEffect(() => {
    if (!open || availableBatches.length === 0) return;

    const next: Record<string, number> = {};
    let remaining = Math.max(0, targetQuantity);

    for (const allocation of initialAllocations) {
      if (remaining <= 0) break;

      const batch = availableBatches.find(
        (candidate) =>
          Boolean(allocation.inbound_entry_id) &&
          candidate.inbound_entry_id === allocation.inbound_entry_id,
      );

      if (!batch) continue;

      const alreadyAllocated = next[batch.id] || 0;
      const availableForBatch = Math.max(
        0,
        batch.available_qty - alreadyAllocated,
      );

      const quantity = Math.min(
        Math.max(0, Number(allocation.quantity) || 0),
        availableForBatch,
        remaining,
      );

      if (quantity > 0) {
        next[batch.id] = alreadyAllocated + quantity;
        remaining -= quantity;
      }
    }

    setAllocationsMap(next);
  }, [open, availableBatches, initialAllocations, targetQuantity]);

  //   useEffect(() => {
  //     if (!open || availableBatches.length === 0) return;

  //     const initialMap: Record<string, number> = {};

  //     for (const allocation of initialAllocations) {
  //       const matchingBatch = availableBatches.find(
  //         (batch) =>
  //           (allocation.inbound_entry_id &&
  //             batch.inbound_entry_id === allocation.inbound_entry_id) ||
  //           (allocation.source_allocation_id &&
  //             batch.source_allocation_id === allocation.source_allocation_id),
  //       );

  //       if (matchingBatch) {
  //         initialMap[matchingBatch.id] =
  //           (initialMap[matchingBatch.id] || 0) + allocation.quantity;
  //       }
  //     }

  //     setAllocationsMap(initialMap);
  //   }, [open, availableBatches, initialAllocations]);

  const totalAllocated = useMemo(
    () =>
      Object.values(allocationsMap).reduce(
        (total, quantity) => total + (quantity || 0),
        0,
      ),
    [allocationsMap],
  );

  const qtyToAllocate = Math.max(0, targetQuantity - totalAllocated);

  const handleQtyInputChange = (
    batch: AvailableStockBatch,
    rawValue: number,
  ) => {
    const currentAllocated = allocationsMap[batch.id] || 0;
    const maxAllowed = Math.min(
      batch.available_qty,
      qtyToAllocate + currentAllocated,
    );

    const safeValue = Math.max(
      0,
      Math.min(Number.isFinite(rawValue) ? rawValue : 0, maxAllowed),
    );

    setAllocationsMap((previous) => {
      const next = { ...previous };

      if (safeValue === 0) {
        delete next[batch.id];
      } else {
        next[batch.id] = safeValue;
      }

      return next;
    });
  };

  const handleCheckboxToggle = (batch: AvailableStockBatch) => {
    const currentAllocated = allocationsMap[batch.id] || 0;

    if (currentAllocated > 0) {
      setAllocationsMap((previous) => {
        const next = { ...previous };
        delete next[batch.id];
        return next;
      });
      return;
    }

    if (qtyToAllocate <= 0) return;

    const quantity = Math.min(batch.available_qty, qtyToAllocate);

    if (quantity > 0) {
      setAllocationsMap((previous) => ({ ...previous, [batch.id]: quantity }));
    }
  };

  const allocateFromBatches = (batches: AvailableStockBatch[]) => {
    let remaining = targetQuantity;
    const next: Record<string, number> = {};

    for (const batch of batches) {
      if (remaining <= 0) break;

      const quantity = Math.min(batch.available_qty, remaining);

      if (quantity > 0) {
        next[batch.id] = quantity;
        remaining -= quantity;
      }
    }

    setAllocationsMap(next);
  };

  const handleAutoAllocateDescending = () => {
    allocateFromBatches(
      [...availableBatches].sort((a, b) => b.available_qty - a.available_qty),
    );
  };

  const handleClearAllocations = () => setAllocationsMap({});

  const allBatchesSelected =
    availableBatches.length > 0 &&
    availableBatches.every((batch) => (allocationsMap[batch.id] || 0) > 0);

  const handleSelectAllToggle = () => {
    if (allBatchesSelected) {
      handleClearAllocations();
    } else {
      allocateFromBatches(availableBatches);
    }
  };

  const handleCommitSave = () => {
    if (isReadonly || qtyToAllocate !== 0) return;

    const records: ST_StockAllocationRecord[] = [];

    for (const batch of availableBatches) {
      const quantity = allocationsMap[batch.id] || 0;

      if (quantity <= 0) continue;

      if (!batch.inbound_entry_id) {
        setLoadError(
          "A selected stock batch is missing its inbound ledger entry ID.",
        );
        return;
      }

      records.push({
        source_allocation_id: batch.source_allocation_id,
        inbound_entry_id: batch.inbound_entry_id,

        location_id: batch.location_id,
        location_name: batch.location_name,

        expiry_date: batch.expiry_date,
        date_received: batch.date_received,
        prod_date: batch.prod_date,

        batch_no: batch.batch_no,
        bin_code: batch.bin_code,
        serial_no: batch.serial_no,

        quantity,
        available_qty: batch.available_qty,
        unit_cost: batch.unit_cost,
      });
    }

    onSave(records);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      {" "}
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {" "}
        <div className="flex items-center justify-between bg-[#103701] px-6 py-3.5 text-white dark:bg-[#262F3C]">
          {" "}
          <div className="flex items-center gap-2.5">
            {" "}
            <Icon
              icon="tabler:transfer"
              className="text-xl text-emerald-400"
            />{" "}
            <h2 className="text-sm font-semibold capitalize tracking-wide">
              {" "}
              Transfer Stock Allocation — {itemCode}{" "}
            </h2>{" "}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close stock allocation"
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {" "}
            <Icon icon="tabler:x" className="text-lg" />{" "}
          </button>{" "}
        </div>
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40 lg:grid-cols-5">
          {" "}
          <div className="space-y-0.5">
            {" "}
            <div className="font-medium text-slate-500 dark:text-slate-400">
              {" "}
              Item Details{" "}
            </div>{" "}
            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
              {" "}
              {itemCode} - {itemName}{" "}
            </div>{" "}
          </div>
          <div className="space-y-0.5">
            {" "}
            <div className="font-medium text-slate-500 dark:text-slate-400">
              {" "}
              Source Warehouse{" "}
            </div>{" "}
            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
              {" "}
              {warehouseName}{" "}
            </div>{" "}
          </div>
          <div className="col-span-3 grid grid-cols-3 gap-3 text-center">
            {" "}
            <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              {" "}
              <div className="text-[11px] font-medium capitalize text-slate-500">
                {" "}
                Target Qty{" "}
              </div>{" "}
              <div className="text-base font-bold">
                {" "}
                {targetQuantity}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {" "}
                  {uomName}{" "}
                </span>{" "}
              </div>{" "}
            </div>
            <div
              className={`rounded border p-2 ${qtyToAllocate > 0 ? "border-amber-300 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20" : "border-emerald-300 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20"}`}
            >
              <div className="text-[11px] font-medium capitalize">
                {" "}
                To Allocate{" "}
              </div>{" "}
              <div className="text-base font-bold">
                {" "}
                {qtyToAllocate}{" "}
                <span className="text-xs font-normal">{uomName}</span>{" "}
              </div>{" "}
            </div>
            <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              {" "}
              <div className="text-[11px] font-medium capitalize text-emerald-600">
                {" "}
                Allocated Total{" "}
              </div>{" "}
              <div className="text-base font-bold text-emerald-600">
                {" "}
                {totalAllocated}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {" "}
                  {uomName}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
        {!isReadonly && availableBatches.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
            {" "}
            <div className="flex flex-wrap items-center gap-2">
              {" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {" "}
                Auto Allocate:{" "}
              </span>
              <Button
                type="button"
                onClick={handleAutoAllocateDescending}
                variant="outline"
                className="h-7 gap-1.5 border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {" "}
                <Icon icon="tabler:sort-descending-numbers" /> High Quantity
                First{" "}
              </Button>
              <Button
                type="button"
                onClick={handleSelectAllToggle}
                variant="outline"
                className="h-7 px-3 text-xs"
              >
                {" "}
                {allBatchesSelected
                  ? "Clear All"
                  : "Allocate in List Order"}{" "}
              </Button>{" "}
            </div>
            {totalAllocated > 0 && (
              <Button
                type="button"
                onClick={handleClearAllocations}
                variant="ghost"
                className="h-7 gap-1 text-xs text-rose-600"
              >
                {" "}
                <Icon icon="tabler:rotate-ccw" /> Clear Selection{" "}
              </Button>
            )}{" "}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">
          {" "}
          {loadError && (
            <div
              role="alert"
              className="mb-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {" "}
              {loadError}{" "}
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {" "}
            <table className="w-full border-collapse text-left text-xs">
              {" "}
              <thead>
                {" "}
                <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                  {" "}
                  <th className="w-10 p-2.5 text-center">
                    {" "}
                    <input
                      type="checkbox"
                      checked={allBatchesSelected}
                      disabled={
                        isReadonly ||
                        availableBatches.length === 0 ||
                        targetQuantity <= 0
                      }
                      onChange={handleSelectAllToggle}
                      aria-label="Allocate stock in list order"
                    />{" "}
                  </th>{" "}
                  <th className="p-2.5">Storage Location</th>{" "}
                  <th className="p-2.5">Batch No.</th>{" "}
                  <th className="p-2.5">Bin / Serial</th>{" "}
                  <th className="p-2.5">Received</th>{" "}
                  <th className="p-2.5">Expiry</th>{" "}
                  <th className="p-2.5 text-right">Available</th>{" "}
                  <th className="p-2.5 text-right">Unit Cost</th>{" "}
                  <th className="w-40 p-2.5 text-right">Allocated Qty</th>{" "}
                </tr>{" "}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {" "}
                {availableBatches.length === 0 ? (
                  <tr>
                    {" "}
                    <td
                      colSpan={9}
                      className="p-6 text-center italic text-slate-400"
                    >
                      {" "}
                      {isLoading
                        ? "Loading source warehouse stock..."
                        : loadError
                          ? "Stock could not be loaded."
                          : "No available stock batches found in the source warehouse."}{" "}
                    </td>{" "}
                  </tr>
                ) : (
                  availableBatches.map((batch, index) => {
                    const allocated = allocationsMap[batch.id] || 0;
                    const selected = allocated > 0;
                    const maxAllowed = Math.min(
                      batch.available_qty,
                      qtyToAllocate + allocated,
                    );

                    return (
                      <tr
                        key={getBatchKey(batch, index)}
                        className={
                          selected
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }
                      >
                        {" "}
                        <td className="p-2.5 text-center">
                          {" "}
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={
                              isReadonly || (qtyToAllocate === 0 && !selected)
                            }
                            onChange={() => handleCheckboxToggle(batch)}
                            aria-label={`Allocate batch ${batch.batch_no || batch.id}`}
                          />{" "}
                        </td>{" "}
                        <td className="p-2.5 font-medium">
                          {" "}
                          {batch.location_name}{" "}
                        </td>{" "}
                        <td className="p-2.5 font-mono">
                          {" "}
                          {batch.batch_no || "-"}{" "}
                        </td>{" "}
                        <td className="p-2.5 font-mono">
                          {" "}
                          {batch.bin_code || batch.serial_no || "-"}{" "}
                        </td>{" "}
                        <td className="p-2.5 text-slate-500">
                          {" "}
                          {formatDate(batch.date_received)}{" "}
                        </td>{" "}
                        <td className="p-2.5 text-slate-500">
                          {" "}
                          {formatDate(batch.expiry_date)}{" "}
                        </td>{" "}
                        <td className="p-2.5 text-right font-semibold">
                          {" "}
                          {batch.available_qty}{" "}
                        </td>{" "}
                        <td className="p-2.5 text-right">
                          {" "}
                          {batch.unit_cost.toFixed(4)}{" "}
                        </td>{" "}
                        <td className="p-2 text-right">
                          {" "}
                          <NumericTextInput
                            value={allocated}
                            allowDecimals={false}
                            min="0"
                            max={String(maxAllowed)}
                            disabled={
                              isReadonly || (qtyToAllocate === 0 && !selected)
                            }
                            className={`w-full rounded border px-2 py-1 text-right text-xs font-semibold ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
                            onChange={(value) =>
                              handleQtyInputChange(batch, Number(value))
                            }
                          />{" "}
                        </td>{" "}
                      </tr>
                    );
                  })
                )}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          {" "}
          <div className="text-xs">
            {" "}
            {qtyToAllocate > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {" "}
                Allocate the remaining {qtyToAllocate} {uomName} before
                saving.{" "}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                {" "}
                <Icon icon="tabler:circle-check-filled" /> Target allocation
                quantity satisfied.{" "}
              </span>
            )}{" "}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {" "}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-4 py-2 text-xs"
            >
              {" "}
              Cancel{" "}
            </Button>
            <Button
              type="button"
              onClick={handleCommitSave}
              disabled={
                isReadonly ||
                isLoading ||
                Boolean(loadError) ||
                qtyToAllocate !== 0 ||
                targetQuantity <= 0
              }
              className="bg-emerald-600 px-5 py-2 text-xs text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {" "}
              Save Allocation{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

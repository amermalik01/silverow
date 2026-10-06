// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockRow.tsx

"use client";

import React from "react";

import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type { LocationOption, TransferStockLine } from "../types";

import { getAllocationTotal, getStockStatus } from "../utils";

type Props = {
  line: TransferStockLine;
  index: number;

  fromLocations: LocationOption[];
  toLocations: LocationOption[];

  formDisabled: boolean;
  totalLines: number;

  onLineChange: (
    index: number,
    field: keyof TransferStockLine,
    value: string | number,
  ) => void;

  onOpenItem: (index: number) => void;

  onFromLocationChange: (index: number, locationId: string) => void;

  onToLocationChange: (index: number, locationId: string) => void;

  onOpenAllocation: (line: TransferStockLine) => void;

  onRemove: (index: number) => void;
};

export default function TransferStockRow({
  line,
  index,
  fromLocations,
  toLocations,
  formDisabled,
  totalLines,
  onLineChange,
  onOpenItem,
  onFromLocationChange,
  onToLocationChange,
  onOpenAllocation,
  onRemove,
}: Props) {
  const qty = Number(line.qty || 0);

  const allocatedQty = getAllocationTotal(line.allocations);

  const allocationStatus = getStockStatus(qty, line.allocations);

  const statusClass =
    allocationStatus === "allocated"
      ? "text-emerald-600 hover:bg-emerald-50"
      : allocationStatus === "partial"
        ? "text-amber-500 hover:bg-amber-50"
        : "text-red-500 hover:bg-red-50";

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Item */}
      <td className="p-2 align-top">
        <div className="flex gap-1">
          <input
            type="text"
            readOnly
            value={line.item_code}
            placeholder="Select Item..."
            className="w-full border p-1 rounded bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-zinc-200 font-mono text-xs outline-none truncate"
          />

          <Button
            type="button"
            disabled={formDisabled}
            onClick={() => onOpenItem(index)}
            className="px-2 h-7 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
          >
            <Icon icon="tabler:external-link" className="w-4 h-4" />
          </Button>
        </div>
      </td>

      {/* Description */}
      <td className="p-2 align-top">
        <input
          type="text"
          value={line.item_description}
          disabled={formDisabled}
          onChange={(event) =>
            onLineChange(index, "item_description", event.target.value)
          }
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1.5 text-xs outline-none bg-white dark:bg-slate-800"
        />
      </td>

      {/* From Location */}
      <td className="p-2 align-top">
        <select
          disabled={formDisabled || !fromLocations.length}
          value={line.from_location_id}
          onChange={(event) => onFromLocationChange(index, event.target.value)}
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1.5 text-xs bg-white dark:bg-slate-800 disabled:opacity-60"
        >
          <option value="">Select Source Location</option>

          {fromLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.title || location.name}
            </option>
          ))}
        </select>
      </td>

      {/* To Location */}
      <td className="p-2 align-top">
        <select
          disabled={formDisabled || !toLocations.length}
          value={line.to_location_id}
          onChange={(event) => onToLocationChange(index, event.target.value)}
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1.5 text-xs bg-white dark:bg-slate-800 disabled:opacity-60"
        >
          <option value="">Select Destination Location</option>

          {toLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.title || location.name}
            </option>
          ))}
        </select>
      </td>

      {/* Quantity */}
      <td className="p-2 align-top">
        <NumericTextInput
          value={qty}
          min="1"
          allowDecimals={false}
          disabled={formDisabled}
          onChange={(value) => onLineChange(index, "qty", Number(value))}
          className="w-full border p-1 rounded text-right font-mono bg-white dark:bg-slate-800"
        />
      </td>

      {/* UOM */}
      <td className="p-2 align-top">
        <input
          type="text"
          value={line.uom}
          disabled={formDisabled}
          onChange={(event) => onLineChange(index, "uom", event.target.value)}
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs text-center bg-white dark:bg-slate-800"
        />
      </td>

      {/* Allocation / Remove */}
      <td className="p-2 text-center align-top">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={formDisabled || !line.item_id || qty <= 0}
            onClick={() => onOpenAllocation(line)}
            title={
              allocationStatus === "allocated"
                ? `Allocated (${allocatedQty}/${qty})`
                : allocationStatus === "partial"
                  ? `Partially allocated (${allocatedQty}/${qty})`
                  : "Not allocated"
            }
            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${statusClass}`}
          >
            <Icon icon="tabler:box-seam" className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={formDisabled || totalLines <= 1}
            onClick={() => onRemove(index)}
            title="Remove line"
            className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-30"
          >
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[9px] text-slate-400 mt-1">
          {allocatedQty}/{qty}
        </div>
      </td>
    </tr>
  );
}

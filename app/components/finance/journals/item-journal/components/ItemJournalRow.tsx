// app/components/finance/journals/item-journal/components/ItemJournalRow.tsx

"use client";

import React from "react";

import { Icon } from "@iconify/react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type {
  ItemJournalLineRow,
  ItemJournalTransactionType,
  LocationOption,
} from "../types";

import { getAllocationTotal, getStockStatus } from "../utils";

type Props = {
  line: ItemJournalLineRow;
  index: number;

  locations: LocationOption[];

  formDisabled: boolean;
  totalLines: number;

  onLineChange: (
    index: number,
    field: keyof ItemJournalLineRow,
    value: string | number,
  ) => void;

  onOpenItem: (index: number) => void;
  onOpenWarehouse: (index: number) => void;
  onLocationChange: (index: number, location: LocationOption) => void;
  onLocationFocus: (index: number) => void;
  onOpenGL: (index: number) => void;
  onOpenAllocation: (line: ItemJournalLineRow) => void;
  onRemove: (index: number) => void;
};

export default function ItemJournalRow({
  line,
  index,
  locations,
  formDisabled,
  totalLines,
  onLineChange,
  onOpenItem,
  onOpenWarehouse,
  onLocationChange,
  onLocationFocus,
  onOpenGL,
  onOpenAllocation,
  onRemove,
}: Props) {
  const displayQty = Number(line.quantity || 0);

  const displayUnitCost = Number(line.cost_per_unit || 0);

  const displayAmount = Number(line.amount || 0);

  const allocatedQty = getAllocationTotal(line.allocations);

  const allocationStatus = getStockStatus(displayQty, line.allocations);

  const lineLocations = locations.filter(
    (location) =>
      !line.warehouse_id || location.warehouse_id === line.warehouse_id,
  );

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Posting Date */}
      <td className="p-2 align-top">
        <DatePicker
          disabled={formDisabled}
          value={line.posting_date ? new Date(line.posting_date) : undefined}
          onChange={(date) =>
            onLineChange(
              index,
              "posting_date",
              date ? date.toISOString().split("T")[0] : "",
            )
          }
        />
      </td>

      {/* Transaction Type */}
      <td className="p-2 align-top">
        <select
          disabled={formDisabled}
          value={line.transaction_type}
          onChange={(event) =>
            onLineChange(
              index,
              "transaction_type",
              event.target.value as ItemJournalTransactionType,
            )
          }
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs outline-none bg-white dark:bg-slate-800"
        >
          <option value="Positive Entry">Positive Entry</option>

          <option value="Negative Entry">Negative Entry</option>
        </select>
      </td>

      {/* Item */}
      <td className="p-2 align-top">
        <div className="flex gap-1">
          <input
            type="text"
            readOnly
            placeholder="Select Item..."
            value={line.item_no}
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
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs outline-none bg-white dark:bg-slate-800"
        />
      </td>

      {/* Warehouse */}
      <td className="p-2 align-top">
        <button
          type="button"
          disabled={formDisabled}
          title={
            line.warehouse_name
              ? `${line.warehouse_code || ""} - ${line.warehouse_name}`
              : "Select warehouse"
          }
          onClick={() => onOpenWarehouse(index)}
          className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-[10px] bg-white dark:bg-slate-800 flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {!line.warehouse_id ? (
            <span>Warehouse required</span>
          ) : (
            <span className="truncate text-left">
              {line.warehouse_code ? `${line.warehouse_code} - ` : ""}
              {line.warehouse_name}
            </span>
          )}

          <Icon icon="tabler:search" className="w-4 h-4 shrink-0" />
        </button>
      </td>

      {/* Location */}
      <td className="p-2 align-top">
        <select
          disabled={formDisabled || !line.warehouse_id}
          value={line.location_id}
          onChange={(event) => {
            const selected = lineLocations.find(
              (location) => location.id === event.target.value,
            );

            if (selected) {
              onLocationChange(index, selected);
            }
          }}
          onFocus={() => onLocationFocus(index)}
          className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1.5 text-xs outline-none bg-white dark:bg-slate-800 disabled:opacity-60"
        >
          <option value="">
            {line.warehouse_id ? "Select Location" : "Select Warehouse"}
          </option>

          {lineLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.title}
            </option>
          ))}
        </select>
      </td>

      {/* Quantity */}
      <td className="p-2 align-top">
        <NumericTextInput
          value={displayQty}
          allowDecimals={false}
          disabled={formDisabled}
          onChange={(value) => onLineChange(index, "quantity", String(value))}
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

      {/* Cost */}
      <td className="p-2 align-top">
        <NumericTextInput
          value={displayUnitCost}
          allowDecimals
          decimalScale={2}
          disabled={formDisabled}
          onChange={(value) =>
            onLineChange(index, "cost_per_unit", String(value))
          }
          className="w-full border p-1 rounded text-right font-mono bg-white dark:bg-slate-800"
        />
      </td>

      {/* Amount */}
      <td className="p-2 align-top">
        <NumericTextInput
          value={displayAmount}
          allowDecimals
          decimalScale={2}
          disabled
          onChange={() => {}}
          className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-right text-[11px] disabled:opacity-60"
        />
      </td>

      {/* Balancing GL */}
      <td className="p-2 align-top">
        <div className="flex gap-1">
          <input
            type="text"
            readOnly
            placeholder="Select G/L..."
            value={line.balancing_display_name || ""}
            className="w-full border p-1 rounded bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-zinc-200 font-mono text-[11px] outline-none truncate"
          />

          <Button
            type="button"
            disabled={formDisabled}
            onClick={() => onOpenGL(index)}
            className="px-2 h-7 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
          >
            <Icon icon="tabler:external-link" className="w-4 h-4" />
          </Button>
        </div>
      </td>

      <td className="p-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <div>
            <button
              type="button"
              // disabled={formDisabled}
              onClick={() => onOpenAllocation(line)}
              // className={`inline-flex items-center justify-center p-1.5 rounded transition-colors ${
              //   allocationStatus === "allocated"
              //     ? "text-emerald-600 hover:bg-emerald-50"
              //     : allocationStatus === "partial"
              //       ? "text-amber-500 hover:bg-amber-50"
              //       : "text-red-500 hover:bg-red-50"
              // } disabled:opacity-40 disabled:cursor-not-allowed`}

              className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                allocationStatus === "allocated"
                  ? "text-emerald-600 hover:bg-emerald-50"
                  : allocationStatus === "partial"
                    ? "text-amber-500 hover:bg-amber-50"
                    : "text-red-500 hover:bg-red-50"
              }`}
              title={
                formDisabled
                  ? "View stock allocation"
                  : allocationStatus === "allocated"
                    ? `Allocated (${allocatedQty}/${displayQty})`
                    : allocationStatus === "partial"
                      ? `Partially allocated (${allocatedQty}/${displayQty})`
                      : "Not allocated"
              }
            >
              <Icon icon="tabler:box-seam" className="w-4 h-4" />
            </button>

            {/* <div className="text-[9px] text-slate-400 mt-0.5">
              {allocatedQty}/{displayQty}
            </div> */}
          </div>

          <button
            type="button"
            disabled={formDisabled || totalLines <= 1}
            onClick={() => onRemove(index)}
            // className="text-red-600 hover:text-red-800 p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove line"
            className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100  dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
          >
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

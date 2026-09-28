// app/components/finance/journals/item-journal/components/ItemJournalTable.tsx

"use client";

import React from "react";

import type { ItemJournalLineRow, LocationOption } from "../types";

import ItemJournalRow from "./ItemJournalRow";

type Props = {
  lines: ItemJournalLineRow[];
  locations: LocationOption[];
  formDisabled: boolean;

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

export default function ItemJournalTable({
  lines,
  locations,
  formDisabled,
  onLineChange,
  onOpenItem,
  onOpenWarehouse,
  onLocationChange,
  onLocationFocus,
  onOpenGL,
  onOpenAllocation,
  onRemove,
}: Props) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1550px]">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[130px]" />
          <col className="w-[120px]" />
          <col className="w-[180px]" />
          <col className="w-[160px]" />
          <col className="w-[160px]" />
          <col className="w-[90px]" />
          <col className="w-[80px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[190px]" />
          <col className="w-[100px]" />
        </colgroup>

        <thead>
          <tr className="bg-zinc-50 dark:bg-slate-800 border-b border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-zinc-300 font-semibold">
            <th className="p-2">Posting Date</th>
            <th className="p-2">Transaction Type</th>
            <th className="p-2">Item No.</th>
            <th className="p-2">Item Description</th>
            <th className="p-2">Warehouse</th>
            <th className="p-2">Location</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2">UOM</th>
            <th className="p-2 text-right">Unit Price</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Balancing G/L</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
          {lines.length === 0 && (
            <tr>
              <td colSpan={13} className="text-center p-8 text-gray-500">
                No lines added
              </td>
            </tr>
          )}

          {lines.map((line, index) => (
            <ItemJournalRow
              key={line._stableKey}
              line={line}
              index={index}
              locations={locations}
              formDisabled={formDisabled}
              totalLines={lines.length}
              onLineChange={onLineChange}
              onOpenItem={onOpenItem}
              onOpenWarehouse={onOpenWarehouse}
              onLocationChange={onLocationChange}
              onLocationFocus={onLocationFocus}
              onOpenGL={onOpenGL}
              onOpenAllocation={onOpenAllocation}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

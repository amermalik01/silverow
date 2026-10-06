// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockTable.tsx

"use client";

import React from "react";

import type { LocationOption, TransferStockLine } from "../types";

import TransferStockRow from "./TransferStockRow";

type Props = {
  lines: TransferStockLine[];

  fromLocations: LocationOption[];
  toLocations: LocationOption[];

  formDisabled: boolean;

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

export default function TransferStockTable({
  lines,
  fromLocations,
  toLocations,
  formDisabled,
  onLineChange,
  onOpenItem,
  onFromLocationChange,
  onToLocationChange,
  onOpenAllocation,
  onRemove,
}: Props) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1050px]">
        <colgroup>
          <col className="w-[180px]" />
          <col className="w-[220px]" />
          <col className="w-[190px]" />
          <col className="w-[190px]" />
          <col className="w-[90px]" />
          <col className="w-[80px]" />
          <col className="w-[90px]" />
        </colgroup>

        <thead>
          <tr className="bg-zinc-50 dark:bg-slate-800 border-b border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-zinc-300 font-semibold">
            <th className="p-2">Item No.</th>
            <th className="p-2">Item Description</th>
            <th className="p-2">From Location</th>
            <th className="p-2">To Location</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-center">UOM</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
          {lines.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center p-8 text-gray-500">
                No transfer lines added
              </td>
            </tr>
          )}

          {lines.map((line, index) => (
            <TransferStockRow
              key={line._stableKey}
              line={line}
              index={index}
              fromLocations={fromLocations}
              toLocations={toLocations}
              formDisabled={formDisabled}
              totalLines={lines.length}
              onLineChange={onLineChange}
              onOpenItem={onOpenItem}
              onFromLocationChange={onFromLocationChange}
              onToLocationChange={onToLocationChange}
              onOpenAllocation={onOpenAllocation}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

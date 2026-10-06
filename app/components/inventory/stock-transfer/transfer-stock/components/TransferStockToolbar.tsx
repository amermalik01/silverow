// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockToolbar.tsx

"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type { TransferMetadata, WarehouseOption } from "../types";

type Props = {
  metadata: TransferMetadata;

  warehouses: WarehouseOption[];

  formDisabled: boolean;

  onHeaderChange: <K extends keyof TransferMetadata>(
    field: K,
    value: TransferMetadata[K],
  ) => void;

  onFromWarehouseChange: (warehouseId: string) => void | Promise<void>;

  onToWarehouseChange: (warehouseId: string) => void | Promise<void>;

  onAddLine: () => void;
};

export default function TransferStockToolbar({
  metadata,
  warehouses,
  formDisabled,
  onHeaderChange,
  onFromWarehouseChange,
  onToWarehouseChange,
  onAddLine,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-3 bg-zinc-50 dark:bg-slate-800 p-3 rounded border border-zinc-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            Transfer No.
          </span>

          <input
            type="text"
            readOnly
            value={metadata.transfer_no || "Draft"}
            className="border bg-zinc-100 dark:bg-slate-700 p-1 px-2 rounded w-40 font-bold outline-none text-zinc-700 dark:text-zinc-100 text-sm"
          />
        </div>

        {!formDisabled && (
          <Button
            type="button"
            onClick={onAddLine}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            + Add Line
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Transfer Date
          </label>

          <input
            type="date"
            value={metadata.transfer_date}
            disabled={formDisabled}
            onChange={(event) =>
              onHeaderChange("transfer_date", event.target.value)
            }
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Source Warehouse
          </label>

          <select
            value={metadata.warehouse_from_id}
            disabled={formDisabled}
            onChange={(event) => void onFromWarehouseChange(event.target.value)}
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          >
            <option value="">Select Source Warehouse</option>

            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} - {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Destination Warehouse
          </label>

          <select
            value={metadata.warehouse_to_id}
            disabled={formDisabled}
            onChange={(event) => void onToWarehouseChange(event.target.value)}
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          >
            <option value="">Select Destination Warehouse</option>

            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} - {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Transit Method Code
          </label>

          <input
            type="text"
            value={metadata.in_transit_code}
            disabled={formDisabled}
            onChange={(event) =>
              onHeaderChange("in_transit_code", event.target.value)
            }
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            P.O. No.
          </label>

          <input
            type="text"
            value={metadata.po_no}
            disabled={formDisabled}
            onChange={(event) => onHeaderChange("po_no", event.target.value)}
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Shipping Agent
          </label>

          <input
            type="text"
            value={metadata.shipping_agent}
            disabled={formDisabled}
            onChange={(event) =>
              onHeaderChange("shipping_agent", event.target.value)
            }
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
            Freight / Shipping Cost
          </label>

          <NumericTextInput
            min="0"
            allowDecimals
            decimalScale={2}
            value={metadata.shipping_charge}
            disabled={formDisabled}
            onChange={(value) =>
              onHeaderChange("shipping_charge", Number(value))
            }
            className="w-full border border-zinc-300 dark:border-slate-700 rounded p-2 text-xs bg-white dark:bg-slate-900"
          />
        </div>
      </div>
    </div>
  );
}

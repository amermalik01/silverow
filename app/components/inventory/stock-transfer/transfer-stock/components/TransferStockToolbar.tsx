// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockToolbar.tsx

"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type { TransferMetadata, WarehouseOption } from "../types";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Icon } from "@iconify/react";

import {
  PurchaseOrderLookupItem,
  PurchaseOrderMultiLookupModal,
} from "@/app/components/shared/modals/PurchaseOrderMultiLookupModal";

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
  const getInputClass = (
    errorKey: string,
    disabled: boolean = formDisabled,
  ) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses =
      "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const inputDateStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  const [POModalOpen, setPOModalOpen] = useState(false);

  const handlePurchaseOrderSelection = () => {
    setPOModalOpen(true);
  };

  /* <input
                type="text"
                value={metadata.po_no}
                disabled={formDisabled}
                onChange={(event) =>
                  onHeaderChange("po_no", event.target.value)
                }
                className={getInputClass("metadata.po_no")}
              /> */

  const handleSelectPurchaseOrders = (
    selectedOrders: PurchaseOrderLookupItem[],
  ) => {
    const codes = selectedOrders.map((o) => o.order_no).join(", ");
    // onHeaderChange((prev) => ({
    //   ...prev,
    //   po_no: codes,
    // }));
    setPOModalOpen(false);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Transfer Date
            </label>
            <div className="col-span-2">
              <DatePicker
                value={
                  metadata.transfer_date
                    ? new Date(metadata.transfer_date)
                    : undefined
                }
                disabled={formDisabled}
                containerClassName="col-span-8"
                onChange={(date) =>
                  onHeaderChange(
                    "transfer_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={getInputClass("metadata.transfer_date")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Source Warehouse
            </label>
            <div className="col-span-2">
              <select
                value={metadata.warehouse_from_id}
                disabled={formDisabled}
                onChange={(event) =>
                  void onFromWarehouseChange(event.target.value)
                }
                className={getInputClass("metadata.warehouse_from_id")}
              >
                <option value="">Select Source Warehouse</option>

                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Destination Warehouse
            </label>
            <div className="col-span-2">
              <select
                value={metadata.warehouse_to_id}
                disabled={formDisabled}
                onChange={(event) =>
                  void onToWarehouseChange(event.target.value)
                }
                className={getInputClass("metadata.warehouse_to_id")}
              >
                <option value="">Select Source Warehouse</option>

                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Transit Method Code
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={metadata.in_transit_code}
                disabled={formDisabled}
                onChange={(event) =>
                  onHeaderChange("in_transit_code", event.target.value)
                }
                className={getInputClass("metadata.in_transit_code")}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5  col-span-4">
              P.O. No.
            </label>

            <div className="col-span-8 flex gap-1">
              <div
                className={`flex-1 flex flex-wrap items-center gap-1 min-h-[30px] p-1 border rounded dark:bg-slate-800 dark:border-slate-700 ${inputStyle}`}
              >
                {metadata.po_no ? (
                  metadata.po_no.split(",").map((poCode) => {
                    const trimmedCode = poCode.trim();
                    if (!trimmedCode) return null;
                    return (
                      <span
                        key={trimmedCode}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border dark:border-slate-600 font-medium"
                      >
                        <span>{trimmedCode}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-400 text-xs px-1"></span>
                )}
              </div>
              <button
                type="button"
                disabled={formDisabled}
                onClick={handlePurchaseOrderSelection}
                className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                title="Select Linked Purchase Orders"
              >
                <Icon icon="tabler:external-link" className="w-4 h-4" />
              </button>
            </div>
            {/* <div className="col-span-2">
              <input
                type="text"
                value={metadata.po_no}
                disabled={formDisabled}
                onChange={(event) =>
                  onHeaderChange("po_no", event.target.value)
                }
                className={getInputClass("metadata.po_no")}
              />
            </div> */}
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Shipping Agent
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={metadata.shipping_agent}
                disabled={formDisabled}
                onChange={(event) =>
                  onHeaderChange("shipping_agent", event.target.value)
                }
                className={getInputClass("metadata.shipping_agent")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Freight / Shipping Cost
            </label>
            <div className="col-span-2">
              <NumericTextInput
                min="0"
                allowDecimals
                decimalScale={2}
                value={metadata.shipping_charge}
                disabled={formDisabled}
                onChange={(value) =>
                  onHeaderChange("shipping_charge", Number(value))
                }
                className={getInputClass("metadata.shipping_agent")}
              />
            </div>
          </div>
        </div>
      </div>

      {POModalOpen && (
        <PurchaseOrderMultiLookupModal
          isOpen={POModalOpen}
          onClose={() => setPOModalOpen(false)}
          onSelectOrders={handleSelectPurchaseOrders}
          selectedOrderNos={
            metadata.po_no ? metadata.po_no.split(",").map((s) => s.trim()) : []
          }
        />
      )}
    </div>
  );
}

// app/components/shared/modals/SalesReturn_StockAllocationModal.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import {
  SalesReturn,
  SalesReturnAllocation,
  SalesReturnLineUI,
} from "@/types/sales-return";

type ReturnAllocationRecord = SalesReturnAllocation;

// export type ReturnAllocationRecord = {
//   id?: string;
//   batch_no?: string;
//   serial_no?: string;
//   expiry_date?: string;
//   prod_date?: string;
//   warehouse_id?: string;
//   warehouse_code?: string;
//   warehouse_name?: string;
//   location_id?: string;
//   location_name?: string;
//   quantity: number;
//   max_invoice_qty?: number;
// };

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  open: boolean;
  isReadonly?: boolean;
  onClose: () => void;
  targetQuantity: number;
  maxAllowedQuantity: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  uomName?: string;

  originalInvoiceAllocations?: ReturnAllocationRecord[];
  initialAllocations?: ReturnAllocationRecord[];
  onSave: (allocations: ReturnAllocationRecord[]) => void;
};

export default function SalesReturn_StockAllocationModal({
  open,
  isReadonly = false,
  onClose,
  targetQuantity,
  maxAllowedQuantity,
  itemId,
  itemCode,
  itemName,
  warehouseId,
  warehouseName,
  uomName,
  originalInvoiceAllocations = [],
  initialAllocations = [],
  onSave,
}: Props) {
  // Helper to derive initial allocation rows without triggering synchronous re-renders
  const computeInitialAllocations =
    useCallback((): ReturnAllocationRecord[] => {
      if (initialAllocations && initialAllocations.length > 0) {
        return initialAllocations.map((a) => ({
          ...a,
          warehouse_id: a.warehouse_id || warehouseId,
          warehouse_name: a.warehouse_name || warehouseName,
        }));
      }

      if (originalInvoiceAllocations && originalInvoiceAllocations.length > 0) {
        return originalInvoiceAllocations
          .filter(
            (invAlloc) =>
              Number(invAlloc.remaining_quantity ?? invAlloc.quantity ?? 0) > 0,
          )
          .map((invAlloc) => {
            const remainingQuantity = Number(
              invAlloc.remaining_quantity ?? invAlloc.quantity ?? 0,
            );

            return {
              ...invAlloc,

              warehouse_id: invAlloc.warehouse_id || warehouseId,

              warehouse_name: invAlloc.warehouse_name || warehouseName,

              max_invoice_qty: remainingQuantity,

              max_returnable_qty: remainingQuantity,

              quantity: remainingQuantity,
            };
          });
      }

      return [
        {
          batch_no: "",
          serial_no: "",
          warehouse_id: warehouseId,
          warehouse_name: warehouseName,
          quantity: targetQuantity,
        },
      ];
    }, [
      initialAllocations,
      originalInvoiceAllocations,
      targetQuantity,
      warehouseId,
      warehouseName,
    ]);

  const [allocations, setAllocations] = useState<ReturnAllocationRecord[]>(
    computeInitialAllocations,
  );
  const [prevOpen, setPrevOpen] = useState<boolean>(open);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAllocations(computeInitialAllocations());
      setErrorMsg(null);
    }
  }

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchWarehouses = async () => {
      try {
        const res = await fetch("/api/inventory/warehouses");
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setWarehouses(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch warehouses", err);
      }
    };

    fetchWarehouses();

    return () => {
      isMounted = false;
    };
  }, [open]);

  if (!open) return null;

  const totalAllocated = allocations.reduce(
    (sum, a) => sum + Number(a.quantity || 0),
    0,
  );

  const handleAddRow = () => {
    setAllocations((prev) => [
      ...prev,
      {
        batch_no: "",
        serial_no: "",
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        quantity: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setAllocations((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Typed value parameter replacing `any`
  const handleUpdateRow = <K extends keyof ReturnAllocationRecord>(
    index: number,
    field: K,
    value: ReturnAllocationRecord[K],
  ) => {
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const updated = { ...row, [field]: value };

        if (field === "warehouse_id" && typeof value === "string") {
          const selectedWh = warehouses.find((w) => w.id === value);
          updated.warehouse_code = selectedWh?.code || "";
          updated.warehouse_name = selectedWh?.name || "";
        }

        return updated;
      }),
    );
  };

  const handleSave = () => {
    if (totalAllocated > targetQuantity) {
      setErrorMsg(
        `Total allocated quantity (${totalAllocated}) cannot exceed return quantity (${targetQuantity}).`,
      );
      return;
    }

    if (targetQuantity > maxAllowedQuantity) {
      setErrorMsg(
        `Return quantity (${targetQuantity}) exceeds max invoiced quantity (${maxAllowedQuantity}).`,
      );
      return;
    }

    for (const row of allocations) {
      // if (row.max_invoice_qty && row.quantity > row.max_invoice_qty) {
      //   setErrorMsg(
      //     `Allocated quantity (${row.quantity}) for batch/serial "${row.batch_no || row.serial_no}" exceeds original invoice quantity (${row.max_invoice_qty}).`,
      //   );
      //   return;
      // }

      if (
        row.max_returnable_qty !== undefined &&
        row.quantity > row.max_returnable_qty
      ) {
        setErrorMsg(
          `Allocated quantity (${row.quantity}) exceeds the remaining returnable quantity (${row.max_returnable_qty}).`,
        );
        return;
      }
    }

    onSave(allocations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900 border dark:border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Return Stock Allocation
            </h2>
            <p className="text-xs text-slate-500">
              Item:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {itemCode} - {itemName}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>

        {/* Assigned Reference Table from Sales Invoice */}
        {originalInvoiceAllocations.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Invoiced Tracking Reference (Max Available: {maxAllowedQuantity}{" "}
              {uomName})
            </h4>
            <div className="flex flex-wrap gap-2">
              {/* {originalInvoiceAllocations.map((inv, idx) => (
                <div
                  key={idx}
                  className="text-[11px] bg-white dark:bg-slate-800 border px-2 py-1 rounded shadow-sm"
                >
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {inv.batch_no
                      ? `Batch: ${inv.batch_no}`
                      : inv.serial_no
                        ? `Serial: ${inv.serial_no}`
                        : "Unbatched"}
                  </span>
                  :{" "}
                  <span className="font-medium">
                    {inv.quantity} {uomName}
                  </span>
                </div>
              ))} */}

              {originalInvoiceAllocations.map((inv, idx) => {
                const originalQty = Number(inv.quantity || 0);

                const returnedQty = Number(inv.returned_quantity || 0);

                const remainingQty = Number(
                  inv.remaining_quantity ?? originalQty - returnedQty,
                );

                return (
                  <div
                    key={inv.id || idx}
                    className="text-[11px] bg-white dark:bg-slate-800 border px-2 py-1 rounded shadow-sm"
                  >
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {inv.batch_no
                        ? `Batch: ${inv.batch_no}`
                        : inv.serial_no
                          ? `Serial: ${inv.serial_no}`
                          : "Unbatched"}
                    </span>

                    <span className="ml-1">
                      Original: {originalQty} {uomName}
                    </span>

                    <span className="ml-2 text-red-600">
                      Returned: {returnedQty} {uomName}
                    </span>

                    <span className="ml-2 font-semibold text-emerald-600">
                      Available: {remainingQty} {uomName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-2.5 rounded text-xs border border-red-200 flex items-center gap-2">
            <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Allocations Table */}
        <div className="overflow-x-auto border rounded-md dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b dark:border-slate-700">
              <tr>
                <th className="p-2 w-[160px]">Batch No</th>
                <th className="p-2 w-[160px]">Serial / Bin No</th>
                <th className="p-2 w-[220px]">Return Warehouse</th>
                <th className="p-2 w-[110px]">Expiry Date</th>
                <th className="p-2 w-[100px] text-right">Qty</th>
                {!isReadonly && (
                  <th className="p-2 w-[50px] text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {allocations.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="p-2">
                    <input
                      type="text"
                      disabled={isReadonly}
                      value={row.batch_no || ""}
                      placeholder="Batch No"
                      onChange={(e) =>
                        handleUpdateRow(idx, "batch_no", e.target.value)
                      }
                      className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      disabled={isReadonly}
                      value={row.serial_no || ""}
                      placeholder="Serial / Bin No"
                      onChange={(e) =>
                        handleUpdateRow(idx, "serial_no", e.target.value)
                      }
                      className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      disabled={isReadonly}
                      value={row.warehouse_id || ""}
                      onChange={(e) =>
                        handleUpdateRow(idx, "warehouse_id", e.target.value)
                      }
                      className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-xs"
                    >
                      {warehouses.length > 0 ? (
                        warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.code} - {wh.name}
                          </option>
                        ))
                      ) : (
                        <option value={warehouseId}>{warehouseName}</option>
                      )}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      disabled={isReadonly}
                      value={row.expiry_date || ""}
                      onChange={(e) =>
                        handleUpdateRow(idx, "expiry_date", e.target.value)
                      }
                      className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <NumericTextInput
                      value={row.quantity}
                      disabled={isReadonly}
                      allowDecimals={true}
                      decimalScale={2}
                      onChange={(val) => handleUpdateRow(idx, "quantity", val)}
                      className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-right text-xs"
                    />
                  </td>
                  {!isReadonly && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info & Controls */}
        <div className="flex items-center justify-between pt-2">
          {!isReadonly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="gap-1 text-xs"
            >
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
              Add Split Row
            </Button>
          )}

          <div className="text-right text-xs space-y-1 ml-auto">
            <div className="text-slate-600 dark:text-slate-400">
              Total Allocated:{" "}
              <span
                className={`font-semibold ${
                  totalAllocated === targetQuantity
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {totalAllocated} / {targetQuantity} {uomName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {!isReadonly && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Allocations
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

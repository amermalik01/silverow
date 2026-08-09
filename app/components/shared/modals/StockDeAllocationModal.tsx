// app/components/shared/modals/StockDeAllocationModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

export interface StockDeAllocationRecord {
  id: string; // inventory_allocations.id
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;
  batch_no?: string;
  bin_code?: string;
  expiry_date?: string;
  location_id?: string;
  location_name?: string;
  allocated_quantity: number; // Original quantity allocated on PI
  return_quantity: number; // De-allocated / returned quantity for this debit note
  unit_cost: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseInvoiceLineId?: string;
  debitNoteLineId?: string;
  itemCode?: string;
  itemName?: string;
  warehouseName?: string;
  initialAllocations?: StockDeAllocationRecord[];
  onSave: (deAllocations: StockDeAllocationRecord[]) => void;
}

interface DBAllocationRecord {
  id: string;
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;
  batch_no?: string;
  bin_code?: string;
  expiry_date?: string;
  location_id?: string;
  location_name?: string;
  allocated_quantity?: string | number;
  unit_cost?: string | number;
}

export default function StockDeAllocationModal({
  open,
  onClose,
  purchaseInvoiceLineId,
  debitNoteLineId,
  itemCode = "",
  itemName = "",
  warehouseName = "",
  initialAllocations = [],
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);

  const { show, hide } = useLoader();
  const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>([]);

  // Track the previous initialAllocations prop to synchronize state during render without useEffect
  const [prevInitialAllocations, setPrevInitialAllocations] =
    useState<StockDeAllocationRecord[]>(initialAllocations);

  // Synchronize state during render (React-recommended pattern to avoid sync setState in useEffect)
  if (initialAllocations !== prevInitialAllocations) {
    setPrevInitialAllocations(initialAllocations);
    if (initialAllocations && initialAllocations.length > 0) {
      setAllocations(initialAllocations);
    }
  }

  useEffect(() => {
    if (!open) return;

    // Skip API request if we already have initial local allocations
    if (initialAllocations && initialAllocations.length > 0) return;
    if (!purchaseInvoiceLineId && !debitNoteLineId) return;

    let isMounted = true;
    // setLoading(true);

    const queryParams = new URLSearchParams();
    if (debitNoteLineId) queryParams.set("debit_note_line_id", debitNoteLineId);
    if (purchaseInvoiceLineId)
      queryParams.set("purchase_invoice_line_id", purchaseInvoiceLineId);

    show("Fetching Record...");

    fetch(`/api/debit-notes/inventory-allocations?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;

        if (data.success && Array.isArray(data.data)) {
          const mapped: StockDeAllocationRecord[] = data.data.map(
            (item: DBAllocationRecord) => {
              const origQty = Number(item.allocated_quantity || 0);
              return {
                id: item.id,
                purchase_invoice_line_id: item.purchase_invoice_line_id,
                debit_note_line_id: item.debit_note_line_id,
                batch_no: item.batch_no || "",
                bin_code: item.bin_code || "",
                expiry_date: item.expiry_date
                  ? String(item.expiry_date).split("T")[0]
                  : "",
                location_id: item.location_id || "",
                location_name: item.location_name || "",
                allocated_quantity: origQty,
                return_quantity: origQty,
                unit_cost: Number(item.unit_cost || 0),
              };
            },
          );
          setAllocations(mapped);
        } else {
          setAllocations([]);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load allocations for de-allocation:", err);
        toast.error("Could not fetch batch allocations.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
        hide();
      });

    return () => {
      isMounted = false;
    };
  }, [open, purchaseInvoiceLineId, debitNoteLineId, initialAllocations]);

  if (!open) return null;

  const handleQuantityChange = (index: number, val: string) => {
    const numericVal = parseFloat(val) || 0;
    const updated = [...allocations];
    const maxAllowed = updated[index].allocated_quantity;

    if (numericVal > maxAllowed) {
      toast.error(
        `Cannot de-allocate more than original allocated quantity (${maxAllowed})`,
      );
      return;
    }

    updated[index].return_quantity = numericVal;
    setAllocations(updated);
  };

  const handleSave = () => {
    const validDeAllocations = allocations.filter((a) => a.return_quantity > 0);
    onSave(validDeAllocations);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3 bg-red-700 dark:bg-slate-800 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-wide text-white">
              Batch De-Allocation (Return to Supplier)
            </h3>
            <p className="text-[10px] text-red-100 dark:text-slate-400">
              Item: {itemCode} - {itemName}{" "}
              {warehouseName ? `| Warehouse: ${warehouseName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-red-600 dark:hover:bg-slate-700 rounded transition"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading original batch allocations...
            </div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No active batch allocations found for this purchase invoice line.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-2 border border-slate-200 dark:border-slate-700">
                    Batch No.
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700">
                    Location
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700">
                    Expiry Date
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right">
                    Orig. Allocated
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right">
                    Unit Cost
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right w-[140px]">
                    Return Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-200 dark:border-slate-800"
                  >
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono font-semibold">
                      {row.batch_no || "N/A"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {row.location_name || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {row.expiry_date || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {row.allocated_quantity}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {row.unit_cost.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={row.allocated_quantity}
                        step="any"
                        value={row.return_quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, e.target.value)
                        }
                        className="w-full text-right px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 focus:border-red-600 outline-none font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={allocations.length === 0}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 transition"
          >
            Confirm De-Allocation
          </button>
        </div>
      </div>
    </div>
  );
}
/* return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="p-3 bg-red-700 dark:bg-slate-800 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-wide text-white">
              Batch De-Allocation (Return to Supplier)
            </h3>
            <p className="text-[10px] text-red-100 dark:text-slate-400">
              Item: {itemCode} - {itemName}{" "}
              {warehouseName ? `| Warehouse: ${warehouseName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-red-600 dark:hover:bg-slate-700 rounded transition"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>


        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading original batch allocations...
            </div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No active batch allocations found for this purchase invoice line.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-2 border border-slate-200 dark:border-slate-700">
                    Batch No.
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700">
                    Expiry Date
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right">
                    Orig. Allocated
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right">
                    Unit Cost
                  </th>
                  <th className="p-2 border border-slate-200 dark:border-slate-700 text-right w-[140px]">
                    Return Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-200 dark:border-slate-800"
                  >
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono font-semibold">
                      {row.batch_no || "N/A"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {row.expiry_date || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {row.allocated_quantity}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {row.unit_cost.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={row.allocated_quantity}
                        step="any"
                        value={row.return_quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, e.target.value)
                        }
                        className="w-full text-right px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 focus:border-red-600 outline-none font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>


        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={allocations.length === 0}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 transition"
          >
            Confirm De-Allocation
          </button>
        </div>
      </div>
    </div>
  ); */

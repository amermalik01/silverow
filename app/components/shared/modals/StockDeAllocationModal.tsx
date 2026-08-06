// app/components/shared/modals/StockDeAllocationModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

export interface StockDeAllocationRecord {
  id: string; // inventory_allocations.id
  purchase_invoice_line_id?: string;
  batch_no?: string;
  expiry_date?: string;
  allocated_quantity: number; // Original quantity allocated by the PI
  return_quantity: number; // Quantity being returned / de-allocated via this debit note
  unit_cost: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseInvoiceLineId?: string;
  itemCode?: string;
  itemName?: string;
  warehouseName?: string;
  onSave: (deAllocations: StockDeAllocationRecord[]) => void;
}

interface DBAllocationRecord {
  id: string;
  purchase_invoice_line_id?: string;
  batch_no?: string;
  expiry_date?: string;
  allocated_quantity?: string | number;
  unit_cost?: string | number;
}

export default function StockDeAllocationModal({
  open,
  onClose,
  purchaseInvoiceLineId,
  itemCode = "",
  itemName = "",
  warehouseName = "",
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>([]);

  useEffect(() => {
    if (!open || !purchaseInvoiceLineId) return;

    // setLoading(true);
    fetch(
      `/api/debit-notes/inventory-allocations?purchase_invoice_line_id=${purchaseInvoiceLineId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          // Map database records into UI state, defaulting return_quantity to 0 or full allocated qty
          const mapped: StockDeAllocationRecord[] = data.data.map((item: DBAllocationRecord) => ({
            id: item.id,
            purchase_invoice_line_id: item.purchase_invoice_line_id,
            batch_no: item.batch_no || "",
            expiry_date: item.expiry_date ? item.expiry_date.split("T")[0] : "",
            allocated_quantity: Number(item.allocated_quantity || 0),
            return_quantity: Number(item.allocated_quantity || 0), // Default to returning all, user can adjust
            unit_cost: Number(item.unit_cost || 0),
          }));
          setAllocations(mapped);
        } else {
          setAllocations([]);
        }
      })
      .catch((err) => {
        console.error(
          "Failed to load existing allocations for de-allocation:",
          err,
        );
        toast.error("Could not fetch batch allocations.");
      })
      .finally(() => setLoading(false));
  }, [open, purchaseInvoiceLineId]);

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
    // Filter out rows where return quantity is 0 or negative
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
            <h3 className="text-xs font-bold tracking-wide">
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

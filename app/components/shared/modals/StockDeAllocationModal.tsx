// app/components/shared/modals/StockDeAllocationModal.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

export interface StockDeAllocationRecord {
  id: string;

  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;

  batch_no?: string;
  bin_code?: string;
  expiry_date?: string;

  location_id?: string;
  location_name?: string;

  allocated_quantity: number;
  return_quantity: number;

  unit_cost: number;
}

interface Props {
  open: boolean;
  onClose: () => void;

  requiredQuantity?: number;

  purchaseOrderLineId?: string;
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

  purchase_order_line_id?: string;
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

const formatQty = (value: number | string | undefined): number => {
  return Number(value || 0);
};

export default function StockDeAllocationModal({
  open,
  onClose,

  requiredQuantity = 0,

  purchaseOrderLineId,
  purchaseInvoiceLineId,
  debitNoteLineId,

  itemCode = "",
  itemName = "",
  warehouseName = "",

  initialAllocations,

  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);

  const { show, hide } = useLoader();

  const cleanRequiredQty = formatQty(requiredQuantity);

  const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>(
    () => {
      if (initialAllocations !== undefined && initialAllocations.length > 0) {
        return initialAllocations.map((allocation) => ({
          ...allocation,
          allocated_quantity: formatQty(allocation.allocated_quantity),
          return_quantity: formatQty(allocation.return_quantity),
        }));
      }

      return [];
    },
  );

  const completedFetchKeyRef = useRef<string | null>(null);
  const activeFetchKeyRef = useRef<string | null>(null);

  const allocationRequestKey = [
    debitNoteLineId ?? "",
    purchaseOrderLineId ?? "",
    purchaseInvoiceLineId ?? "",
    cleanRequiredQty,
  ].join("|");

  useEffect(() => {
    if (!open) {
      activeFetchKeyRef.current = null;
      completedFetchKeyRef.current = null;

      return;
    }

    if (initialAllocations && initialAllocations.length > 0) {
      console.log(
        "[StockDeAllocationModal] Using initial allocations:",
        initialAllocations,
      );

      return;
    }

    if (!debitNoteLineId && !purchaseOrderLineId && !purchaseInvoiceLineId) {
      console.warn(
        "[StockDeAllocationModal] No allocation reference ID supplied.",
      );

      return;
    }

    if (completedFetchKeyRef.current === allocationRequestKey) {
      console.log(
        "[StockDeAllocationModal] Fetch already completed:",
        allocationRequestKey,
      );

      return;
    }

    if (activeFetchKeyRef.current === allocationRequestKey) {
      console.log(
        "[StockDeAllocationModal] Fetch already active:",
        allocationRequestKey,
      );

      return;
    }

    activeFetchKeyRef.current = allocationRequestKey;

    const controller = new AbortController();

    let cancelled = false;

    const loadAllocations = async () => {
      try {
        setLoading(true);

        show("Fetching Stock Allocations...");

        const queryParams = new URLSearchParams();

        if (debitNoteLineId) {
          queryParams.set("debit_note_line_id", debitNoteLineId);
        }

        if (purchaseOrderLineId) {
          queryParams.set("purchase_order_line_id", purchaseOrderLineId);
        }

        if (purchaseInvoiceLineId) {
          queryParams.set("purchase_invoice_line_id", purchaseInvoiceLineId);
        }

        const requestUrl = `/api/debit-notes/inventory-allocations?${queryParams.toString()}`;

        console.log("[StockDeAllocationModal] Fetching:", requestUrl);

        const response = await fetch(requestUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        console.log(
          "[StockDeAllocationModal] Response status:",
          response.status,
        );

        if (!response.ok) {
          throw new Error(
            `Allocation API failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        console.log("[StockDeAllocationModal] API response:", data);

        if (cancelled || controller.signal.aborted) {
          console.log(
            "[StockDeAllocationModal] Request cancelled:",
            allocationRequestKey,
          );

          return;
        }

        if (data?.success && Array.isArray(data?.data)) {
          let remainingToReturn = cleanRequiredQty;

          const mapped: StockDeAllocationRecord[] = data.data.map(
            (item: DBAllocationRecord) => {
              const originalQty = formatQty(item.allocated_quantity);

              let initialReturnQty = 0;

              if (remainingToReturn > 0) {
                initialReturnQty = Math.min(originalQty, remainingToReturn);

                remainingToReturn -= initialReturnQty;
              }

              return {
                id: item.id,
                purchase_order_line_id: item.purchase_order_line_id,
                purchase_invoice_line_id: item.purchase_invoice_line_id,
                debit_note_line_id: item.debit_note_line_id,
                batch_no: item.batch_no || "",
                bin_code: item.bin_code || "",
                expiry_date: item.expiry_date
                  ? String(item.expiry_date).split("T")[0]
                  : "",
                location_id: item.location_id || "",
                location_name: item.location_name || "",
                allocated_quantity: originalQty,
                return_quantity: initialReturnQty,
                unit_cost: Number(item.unit_cost || 0),
              };
            },
          );

          console.log("[StockDeAllocationModal] Mapped allocations:", mapped);
          setAllocations(mapped);
          completedFetchKeyRef.current = allocationRequestKey;
        } else {
          console.warn("[StockDeAllocationModal] Invalid API response:", data);
          setAllocations([]);
          completedFetchKeyRef.current = allocationRequestKey;
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log(
            "[StockDeAllocationModal] Fetch aborted:",
            allocationRequestKey,
          );
          return;
        }

        if (error instanceof Error && error.name === "AbortError") {
          console.log(
            "[StockDeAllocationModal] Fetch aborted:",
            allocationRequestKey,
          );
          return;
        }

        if (cancelled) {
          return;
        }

        console.error(
          "[StockDeAllocationModal] Failed to load allocations:",
          error,
        );

        toast.error("Could not fetch batch allocations.");

        completedFetchKeyRef.current = null;
      } finally {
        if (activeFetchKeyRef.current === allocationRequestKey) {
          activeFetchKeyRef.current = null;
        }

        if (!cancelled) {
          setLoading(false);
          hide();
        }
      }
    };

    loadAllocations();

    return () => {
      cancelled = true;

      if (activeFetchKeyRef.current === allocationRequestKey) {
        activeFetchKeyRef.current = null;
      }
      controller.abort();
      hide();
    };
  }, [
    open,
    allocationRequestKey,
    initialAllocations,
    debitNoteLineId,
    purchaseOrderLineId,
    purchaseInvoiceLineId,
    cleanRequiredQty,
    hide,
    show,
  ]);

  const currentTotalReturn = allocations.reduce(
    (sum, row) => sum + formatQty(row.return_quantity),
    0,
  );

  const qtyRemainingToReturn = cleanRequiredQty - currentTotalReturn;
  const variance = currentTotalReturn - cleanRequiredQty;
  const isValidAllocation = Math.abs(variance) < 0.0001;

  const handleQuantityChange = (index: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const updated = [...allocations];
    const row = updated[index];
    if (!row) {
      return;
    }

    const maxAllowed = formatQty(row.allocated_quantity);
    if (numericValue < 0) {
      toast.error("Return quantity cannot be negative.");
      return;
    }

    if (numericValue > maxAllowed) {
      toast.error(
        `Cannot de-allocate more than original allocated quantity (${maxAllowed}).`,
      );
      return;
    }

    updated[index] = {
      ...row,
      return_quantity: numericValue,
    };

    setAllocations(updated);
  };

  const handleResetRow = (index: number) => {
    const updated = [...allocations];

    if (!updated[index]) {
      return;
    }

    updated[index] = {
      ...updated[index],
      return_quantity: 0,
    };

    setAllocations(updated);
  };

  const handleCommitSave = () => {
    if (!isValidAllocation) {
      if (currentTotalReturn < cleanRequiredQty) {
        toast.error(
          `De-allocation incomplete. ${Math.abs(
            qtyRemainingToReturn,
          )} more item(s) need to be returned.`,
        );
      } else {
        toast.error(
          `Over-allocated by ${Math.abs(qtyRemainingToReturn)} item(s).`,
        );
      }

      return;
    }

    const validDeAllocations = allocations.filter(
      (allocation) => formatQty(allocation.return_quantity) > 0,
    );

    onSave(validDeAllocations);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl w-full max-w-7xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Stock De-Allocation - Return to Supplier ({itemCode})
            </h2>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select the quantity to return from the existing stock allocations.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode || "-"}
              {itemName ? ` - ${itemName}` : ""}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName || "-"}
            </div>
          </div>

          <div className="grid grid-cols-3 col-span-3 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Required Return Qty.
              </div>

              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {cleanRequiredQty}
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyRemainingToReturn !== 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div
                className={`text-xs capitalize font-medium ${
                  qtyRemainingToReturn !== 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                Qty. Remaining
              </div>

              <div
                className={`text-lg font-bold ${
                  qtyRemainingToReturn !== 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {Math.max(0, qtyRemainingToReturn)}
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                isValidAllocation
                  ? "border-green-300 dark:border-green-900"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="text-xs text-green-600 dark:text-green-400 capitalize font-medium">
                Returning Total
              </div>

              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {currentTotalReturn}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-5 pt-4">
            <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
              Loading existing stock allocations...
            </div>
          </div>
        )}

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-48">Storage Location</th>
                <th className="p-3 w-48">Batch / Lot No.</th>
                <th className="p-3 w-36">Bin</th>
                <th className="p-3 w-40">Use By Date</th>
                <th className="p-3 w-32 text-right">Original Qty.</th>
                <th className="p-3 w-32 text-right">Return Qty.</th>
                <th className="p-3 text-center w-20">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {loading
                      ? "Loading allocated batches..."
                      : "No allocated stock found."}
                  </td>
                </tr>
              ) : (
                allocations.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {row.location_name || "-"}
                      </div>
                      {row.location_id && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          {row.location_id}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono">{row.batch_no || "-"}</td>
                    <td className="p-3 font-mono">{row.bin_code || "-"}</td>
                    <td className="p-3">{row.expiry_date || "-"}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {row.allocated_quantity}
                    </td>

                    <td className="p-2">
                      {/* <input
                        type="number"
                        min="0"
                        max={row.allocated_quantity}
                        step="any"
                        value={row.return_quantity}
                        disabled={loading}
                        onChange={(event) =>
                          handleQuantityChange(index, event.target.value)
                        }
                        className={`border rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 ${
                          row.return_quantity > 0
                            ? "border-red-300 dark:border-red-800 focus:ring-red-600"
                            : "border-slate-200 dark:border-slate-700 focus:ring-green-600"
                        } disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400`}
                      /> */}

                      <NumericTextInput
                        value={row.return_quantity}
                        allowDecimals={false}
                        min="0"
                        max={row.allocated_quantity}
                        disabled={loading}
                        onChange={(val) =>
                          handleQuantityChange(index, String(val))
                        }
                        className={`border rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 ${
                          row.return_quantity > 0
                            ? "border-red-300 dark:border-red-800 focus:ring-red-600"
                            : "border-slate-200 dark:border-slate-700 focus:ring-green-600"
                        } disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400`}
                      />
                    </td>

                    <td className="p-3 text-center">
                      {row.return_quantity > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleResetRow(index)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors disabled:opacity-40"
                          title="Reset return quantity"
                        >
                          &#x2715;
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {allocations.length > 0 && (
          <div className="px-5 pb-4">
            {isValidAllocation ? (
              <div className="flex items-center gap-2 rounded border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                <Icon icon="lucide:circle-check" className="w-4 h-4" />

                <span>Return quantity is fully allocated. Ready to save.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                <Icon icon="lucide:triangle-alert" className="w-4 h-4" />

                <span>
                  {currentTotalReturn < cleanRequiredQty
                    ? `Select ${Math.abs(
                        qtyRemainingToReturn,
                      )} more item(s) to complete the return.`
                    : `Remove ${Math.abs(
                        qtyRemainingToReturn,
                      )} item(s) from the return quantity.`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={loading || allocations.length === 0 || !isValidAllocation}
            className={`px-5 py-2 rounded text-xs font-medium transition-opacity text-white ${
              isValidAllocation
                ? "bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700"
                : "bg-slate-400 dark:bg-slate-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Return Stock
          </Button>
        </div>
      </div>
    </div>
  );
}

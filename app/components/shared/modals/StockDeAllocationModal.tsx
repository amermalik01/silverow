// app/components/shared/modals/StockDeAllocationModal.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

export interface StockDeAllocationRecord {
  id: string;

  source_allocation_id?: string;

  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;

  inbound_entry_id?: string;

  itemId?: string;
  warehouseId?: string;

  batch_no?: string;
  bin_code?: string;
  serial_no?: string | null;
  expiry_date?: string;

  location_id?: string;
  location_name?: string;

  allocated_quantity: number;
  returned_quantity: number;

  return_quantity: number;
  available_quantity: number;

  unit_cost: number;

  available_quantity_for_edit?: number | string;

  original_quantity?: number | string;
  already_returned_before_this_dn?: number | string;

  date_received?: string;
  received_at?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;

  requiredQuantity?: number;

  itemId?: string;
  warehouseId?: string;

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

  source_allocation_id?: string;

  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;

  inbound_entry_id?: string;

  // itemId?: string;
  // warehouseId?: string;

  batch_no?: string;
  bin_code?: string;
  serial_no?: string;
  expiry_date?: string;

  location_id?: string;
  location_name?: string;

  allocated_quantity?: string | number;

  // allocated_quantity: number;
  returned_quantity: number;

  return_quantity: number;
  available_quantity: number;

  unit_cost?: string | number;
}

const toNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const normalizeAllocation = (
  allocation: Partial<StockDeAllocationRecord>,
): StockDeAllocationRecord => ({
  id: allocation.id || crypto.randomUUID(),

  source_allocation_id: allocation.source_allocation_id || allocation.id,

  purchase_order_line_id: allocation.purchase_order_line_id,
  purchase_invoice_line_id: allocation.purchase_invoice_line_id,
  debit_note_line_id: allocation.debit_note_line_id,

  inbound_entry_id: allocation.inbound_entry_id,

  batch_no: allocation.batch_no || "",
  bin_code: allocation.bin_code || "",

  expiry_date: allocation.expiry_date
    ? String(allocation.expiry_date).split("T")[0]
    : "",

  location_id: allocation.location_id || "",
  location_name: allocation.location_name || "",

  allocated_quantity: toNumber(allocation.allocated_quantity),
  returned_quantity: toNumber(allocation.returned_quantity),

  available_quantity: toNumber(allocation.available_quantity),
  return_quantity: toNumber(allocation.return_quantity),

  unit_cost: toNumber(allocation.unit_cost),
});

export default function StockDeAllocationModal({
  open,
  onClose,

  requiredQuantity = 0,

  purchaseOrderLineId,
  purchaseInvoiceLineId,
  debitNoteLineId,

  itemId,
  warehouseId,

  itemCode = "",
  itemName = "",
  warehouseName = "",

  initialAllocations,

  onSave,
}: Props) {
  const { show, hide } = useLoader();

  const cleanRequiredQty = useMemo(
    () => toNumber(requiredQuantity),
    [requiredQuantity],
  );

  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>([]);

  const loadedRequestKeyRef = useRef<string | null>(null);
  const activeRequestKeyRef = useRef<string | null>(null);

  const allocationRequestKey = useMemo(() => {
    return [
      debitNoteLineId || "",
      purchaseInvoiceLineId || "",
      purchaseOrderLineId || "",
      cleanRequiredQty,
    ].join("|");
  }, [
    debitNoteLineId,
    purchaseInvoiceLineId,
    purchaseOrderLineId,
    cleanRequiredQty,
  ]);

  const allocationReference = useMemo(() => {
    if (debitNoteLineId) {
      return {
        type: "debit_note_line_id",
        id: debitNoteLineId,
      };
    }

    if (purchaseInvoiceLineId) {
      return {
        type: "purchase_invoice_line_id",
        id: purchaseInvoiceLineId,
      };
    }

    if (purchaseOrderLineId) {
      return {
        type: "purchase_order_line_id",
        id: purchaseOrderLineId,
      };
    }

    return null;
  }, [debitNoteLineId, purchaseInvoiceLineId, purchaseOrderLineId]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      activeRequestKeyRef.current = null;
      loadedRequestKeyRef.current = null;
      return;
    }

    if (initialAllocations && initialAllocations.length > 0) {
      console.log(
        "[StockDeAllocationModal] Initial allocations supplied:",
        initialAllocations,
      );

      setAllocations(initialAllocations.map(normalizeAllocation));
      loadedRequestKeyRef.current = allocationRequestKey;
      return;
    }

    if (initialAllocations !== undefined) {
      setAllocations([]);
    }

    if (!allocationReference) {
      console.warn(
        "[StockDeAllocationModal] Cannot load allocations. No line reference supplied.",
        {
          debitNoteLineId,
          purchaseInvoiceLineId,
          purchaseOrderLineId,
        },
      );

      return;
    }

    if (loadedRequestKeyRef.current === allocationRequestKey) {
      return;
    }

    if (activeRequestKeyRef.current === allocationRequestKey) {
      return;
    }

    activeRequestKeyRef.current = allocationRequestKey;

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

        if (itemId) {
          queryParams.set("item_id", itemId);
        }

        if (warehouseId) {
          queryParams.set("warehouse_id", warehouseId);
        }

        if (purchaseInvoiceLineId) {
          queryParams.set("purchase_invoice_line_id", purchaseInvoiceLineId);
        }

        if (purchaseOrderLineId) {
          queryParams.set("purchase_order_line_id", purchaseOrderLineId);
        }

        const requestUrl = `/api/debit-notes/inventory-allocations?${queryParams.toString()}`;

        console.log("[StockDeAllocationModal] Loading allocations:", {
          requestUrl,
          allocationReference,
          requiredQuantity: cleanRequiredQty,
        });

        const response = await fetch(requestUrl);

        if (!response.ok) {
          throw new Error(
            `Allocation API failed with status ${response.status}`,
          );
        }

        const payload = await response.json();

        console.log(
          "[StockDeAllocationModal] Allocation API response:",
          payload,
        );

        if (cancelled || controller.signal.aborted) {
          return;
        }

        if (!payload?.success || !Array.isArray(payload?.data)) {
          console.warn(
            "[StockDeAllocationModal] Invalid allocation API response:",
            payload,
          );

          setAllocations([]);
          loadedRequestKeyRef.current = allocationRequestKey;
          return;
        }

        // const mappedAllocations: StockDeAllocationRecord[] = payload.data.map(
        //   (item: DBAllocationRecord) =>
        //     normalizeAllocation({
        //       id: item.id,

        //       purchase_order_line_id: item.purchase_order_line_id,
        //       purchase_invoice_line_id: item.purchase_invoice_line_id,
        //       debit_note_line_id: item.debit_note_line_id,

        //       batch_no: item.batch_no,
        //       bin_code: item.bin_code,
        //       expiry_date: item.expiry_date,
        //       location_id: item.location_id,
        //       location_name: item.location_name,

        //       allocated_quantity: Number(item.allocated_quantity),
        //       return_quantity: 0,

        //       unit_cost: Number(item.unit_cost),
        //     }),
        // );

        const mappedAllocations: StockDeAllocationRecord[] = payload.data.map(
          (item: DBAllocationRecord) =>
            normalizeAllocation({
              id: item.id,

              source_allocation_id: item.source_allocation_id || item.id,
              inbound_entry_id: item.inbound_entry_id,
              purchase_order_line_id: item.purchase_order_line_id,
              purchase_invoice_line_id: item.purchase_invoice_line_id,

              // item_id: item.item_id,
              // warehouse_id: item.warehouse_id,

              batch_no: item.batch_no,
              bin_code: item.bin_code,

              expiry_date: item.expiry_date,

              location_id: item.location_id,
              location_name: item.location_name,

              allocated_quantity: Number(item.allocated_quantity || 0),
              returned_quantity: Number(item.returned_quantity || 0),

              available_quantity: Number(item.available_quantity || 0),
              return_quantity: Number(item.return_quantity || 0),

              unit_cost: Number(item.unit_cost || 0),
            }),
        );

        console.log(
          "[StockDeAllocationModal] Normalized allocations:",
          mappedAllocations,
        );

        setAllocations(mappedAllocations);

        loadedRequestKeyRef.current = allocationRequestKey;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        if (cancelled) {
          return;
        }

        console.error(
          "[StockDeAllocationModal] Failed to load allocations:",
          error,
        );

        toast.error("Could not fetch stock allocations.");

        loadedRequestKeyRef.current = null;
      } finally {
        if (activeRequestKeyRef.current === allocationRequestKey) {
          activeRequestKeyRef.current = null;
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
      controller.abort();

      if (activeRequestKeyRef.current === allocationRequestKey) {
        activeRequestKeyRef.current = null;
      }

      hide();
    };
  }, [
    open,
    allocationRequestKey,
    allocationReference,
    initialAllocations,
    debitNoteLineId,
    purchaseInvoiceLineId,
    purchaseOrderLineId,
    cleanRequiredQty,
    show,
    hide,
  ]);



  const currentTotalReturn = allocations.reduce(
    (sum, row) => sum + toNumber(row.return_quantity),
    0,
  );

  const variance = currentTotalReturn - cleanRequiredQty;

  const isValidAllocation = cleanRequiredQty > 0 && Math.abs(variance) < 0.0001;

  const qtyRemainingToReturn = cleanRequiredQty - currentTotalReturn;

  const handleQuantityChange = (index: number, value: string | number) => {
    const numericValue = toNumber(value);

    setAllocations((previous) => {
      const updated = [...previous];

      const row = updated[index];

      if (!row) {
        return previous;
      }

      const maxAllowed = toNumber(row.available_quantity);

      if (numericValue < 0) {
        toast.error("Return quantity cannot be negative.");

        return previous;
      }

      if (numericValue > maxAllowed) {
        toast.error(
          `Cannot return more than the available quantity (${maxAllowed}).`,
        );

        return previous;
      }

      const otherRowsTotal = updated.reduce(
        (sum, allocation, allocationIndex) => {
          if (allocationIndex === index) {
            return sum;
          }

          return sum + toNumber(allocation.return_quantity);
        },
        0,
      );

      if (otherRowsTotal + numericValue > cleanRequiredQty) {

        const allowed = Math.max(0, cleanRequiredQty - otherRowsTotal);

        toast.error(`Only ${allowed} item(s) can be returned on this line.`);
        return previous;
      }

      updated[index] = {
        ...row,
        return_quantity: numericValue,
      };

      return updated;
    });
  };

  const handleResetRow = (index: number) => {
    setAllocations((previous) => {
      const updated = [...previous];

      if (!updated[index]) {
        return previous;
      }

      updated[index] = {
        ...updated[index],
        return_quantity: 0,
      };

      return updated;
    });
  };

  const handleCommitSave = () => {
    if (cleanRequiredQty <= 0) {
      toast.error("Return quantity must be greater than zero.");

      return;
    }

    if (allocations.length === 0) {
      toast.error("No existing stock allocations were found.");

      return;
    }

    if (!isValidAllocation) {
      if (currentTotalReturn < cleanRequiredQty) {
        toast.error(
          `De-allocation incomplete. ${qtyRemainingToReturn} more item(s) need to be returned.`,
        );
      } else {
        toast.error(
          `Return quantity exceeds the required quantity by ${Math.abs(
            qtyRemainingToReturn,
          )} item(s).`,
        );
      }

      return;
    }

    const validDeAllocations = allocations
      .filter((allocation) => toNumber(allocation.return_quantity) > 0)
      .map((allocation) => ({
        ...allocation,

        id: allocation.source_allocation_id || allocation.id,

        return_quantity: toNumber(allocation.return_quantity),

        allocated_quantity: toNumber(allocation.allocated_quantity),

        returned_quantity: toNumber(allocation.returned_quantity),

        available_quantity: toNumber(allocation.available_quantity),

        unit_cost: toNumber(allocation.unit_cost),
      }));

    console.log(
      "[StockDeAllocationModal] Saving de-allocations:",
      validDeAllocations,
    );

    onSave(validDeAllocations);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* HEADER */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Stock De-Allocation
              {itemCode ? ` - ${itemCode}` : ""}
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

        {/* SUMMARY */}
        <div className="shrink-0 p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
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
              <div className="text-xs text-slate-500 dark:text-slate-400">
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
                className={`text-xs font-medium ${
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
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Returning Total
              </div>

              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {currentTotalReturn}
              </div>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="shrink-0 px-5 pt-4">
            <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
              Loading existing stock allocations...
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="flex-1 min-h-0 p-5 overflow-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3">Storage Location</th>
                <th className="p-3">Batch / Lot</th>
                <th className="p-3">Bin</th>
                <th className="p-3">Use By</th>
                <th className="p-3 text-right">Original</th>
                <th className="p-3 text-right">Already Returned</th>
                <th className="p-3 text-right">Available</th>
                <th className="p-3 text-right">Return</th>
                <th className="p-3 text-center">Action</th>
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
                      : "No allocated stock found for this invoice line."}
                  </td>
                </tr>
              ) : (
                allocations.map((row, index) => (
                  <tr
                    key={row.id || `allocation-${index}`}
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

                    <td className="p-3 text-right font-semibold">
                      {row.allocated_quantity}
                    </td>

                    <td className="p-3 text-right text-amber-600">
                      {row.returned_quantity}
                    </td>

                    <td className="p-3 text-right text-emerald-600 font-semibold">
                      {row.available_quantity}
                    </td>

                    <td className="p-2">
                      <NumericTextInput
                        value={row.return_quantity}
                        allowDecimals={false}
                        min="0"
                        // max={row.allocated_quantity}
                        max={row.available_quantity}
                        disabled={loading}
                        onChange={(value) => handleQuantityChange(index, value)}
                        className={`border rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold focus:outline-hidden focus:ring-1 ${
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

        {/* VALIDATION */}
        {allocations.length > 0 && (
          <div className="shrink-0 px-5 pb-4">
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
                    ? `Select ${qtyRemainingToReturn} more item(s) to complete the return.`
                    : `Remove ${Math.abs(
                        qtyRemainingToReturn,
                      )} item(s) from the return quantity.`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={loading || allocations.length === 0 || !isValidAllocation}
            className={`px-5 py-2 rounded text-xs font-medium text-white ${
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

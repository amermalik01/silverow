// app/components/shared/modals/StockDeAllocationModal.tsx
// app/components/shared/modals/StockDeAllocationModal.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

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
    /**
     * Modal must be open.
     */
    if (!open) {
      /**
       * Reset request tracking when modal closes.
       *
       * This allows the same allocation to be fetched again
       * when the modal is opened later.
       */
      activeFetchKeyRef.current = null;
      completedFetchKeyRef.current = null;

      return;
    }

    /**
     * If parent explicitly supplied allocations,
     * do not fetch from API.
     *
     * IMPORTANT:
     * If your parent passes [] intentionally and expects
     * the modal to fetch, change this condition.
     */

    if (initialAllocations && initialAllocations.length > 0) {
      console.log(
        "[StockDeAllocationModal] Using initial allocations:",
        initialAllocations,
      );

      return;
    }

    /**
     * We need at least one valid reference ID.
     */
    if (!debitNoteLineId && !purchaseOrderLineId && !purchaseInvoiceLineId) {
      console.warn(
        "[StockDeAllocationModal] No allocation reference ID supplied.",
      );

      return;
    }

    /**
     * If this exact request already completed successfully,
     * don't fetch it again.
     */
    if (completedFetchKeyRef.current === allocationRequestKey) {
      console.log(
        "[StockDeAllocationModal] Fetch already completed:",
        allocationRequestKey,
      );

      return;
    }

    /**
     * If this exact request is currently running,
     * don't create another request.
     */
    if (activeFetchKeyRef.current === allocationRequestKey) {
      console.log(
        "[StockDeAllocationModal] Fetch already active:",
        allocationRequestKey,
      );

      return;
    }

    /**
     * Mark request as ACTIVE only.
     *
     * Do NOT mark it as completed here.
     */
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

        /**
         * Request was cancelled during unmount / cleanup.
         */
        if (cancelled || controller.signal.aborted) {
          console.log(
            "[StockDeAllocationModal] Request cancelled:",
            allocationRequestKey,
          );

          return;
        }

        /**
         * Validate API response.
         */
        if (data?.success && Array.isArray(data?.data)) {
          let remainingToReturn = cleanRequiredQty;

          const mapped: StockDeAllocationRecord[] = data.data.map(
            (item: DBAllocationRecord) => {
              const originalQty = formatQty(item.allocated_quantity);

              let initialReturnQty = 0;

              /**
               * Automatically distribute the
               * required return quantity across
               * existing allocation rows.
               */
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

          /**
           * IMPORTANT:
           *
           * Only mark the key as COMPLETED
           * after the API successfully returned
           * and the data was processed.
           */
          completedFetchKeyRef.current = allocationRequestKey;
        } else {
          console.warn("[StockDeAllocationModal] Invalid API response:", data);

          setAllocations([]);

          /**
           * The API call itself completed successfully,
           * even though there were no valid records.
           *
           * Therefore we can mark this request completed.
           */
          completedFetchKeyRef.current = allocationRequestKey;
        }
      } catch (error: unknown) {
        /**
         * Abort is expected during React cleanup
         * or modal unmount.
         */
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

        /**
         * Do NOT mark as completed.
         *
         * This allows a future effect run to retry.
         */
        completedFetchKeyRef.current = null;
      } finally {
        /**
         * Only clear loading if this request
         * is still the active request.
         */
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

    /**
     * Cleanup.
     */
    return () => {
      cancelled = true;

      /**
       * Only abort this request if it is
       * still the active request.
       */
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

  /**
   * Total quantity currently selected for return.
   */
  const currentTotalReturn = allocations.reduce(
    (sum, row) => sum + formatQty(row.return_quantity),
    0,
  );

  /**
   * Remaining quantity that still needs to be returned.
   *
   * Example:
   *
   * Required = 10
   * Returning = 7
   *
   * Remaining = 3
   */
  const qtyRemainingToReturn = cleanRequiredQty - currentTotalReturn;

  /**
   * Small floating point tolerance.
   */
  const variance = currentTotalReturn - cleanRequiredQty;

  const isValidAllocation = Math.abs(variance) < 0.0001;

  /**
   * Change return quantity.
   */
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

  /**
   * Reset one allocation row.
   */
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

  /**
   * Save de-allocation.
   */
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
        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

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

        {/* ========================================================= */}
        {/* SUMMARY */}
        {/* ========================================================= */}

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          {/* ITEM */}

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode || "-"}
              {itemName ? ` - ${itemName}` : ""}
            </div>
          </div>

          {/* WAREHOUSE */}

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName || "-"}
            </div>
          </div>

          {/* QUANTITY CARDS */}

          <div className="grid grid-cols-3 col-span-3 gap-2 text-center">
            {/* REQUIRED */}

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Required Return Qty.
              </div>

              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {cleanRequiredQty}
              </div>
            </div>

            {/* REMAINING */}

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

            {/* RETURNING TOTAL */}

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

        {/* ========================================================= */}
        {/* LOADING */}
        {/* ========================================================= */}

        {loading && (
          <div className="px-5 pt-4">
            <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
              Loading existing stock allocations...
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLE */}
        {/* ========================================================= */}

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
                    {/* LOCATION */}

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

                    {/* BATCH */}

                    <td className="p-3 font-mono">{row.batch_no || "-"}</td>

                    {/* BIN */}

                    <td className="p-3 font-mono">{row.bin_code || "-"}</td>

                    {/* EXPIRY */}

                    <td className="p-3">{row.expiry_date || "-"}</td>

                    {/* ORIGINAL */}

                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {row.allocated_quantity}
                    </td>

                    {/* RETURN */}

                    <td className="p-2">
                      <input
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
                      />
                    </td>

                    {/* ACTION */}

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

        {/* ========================================================= */}
        {/* VALIDATION MESSAGE */}
        {/* ========================================================= */}

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

        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>

          <button
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
          </button>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

export interface StockDeAllocationRecord {
  id: string; // inventory_allocations.id
  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
  debit_note_line_id?: string;
  batch_no?: string;
  bin_code?: string;
  expiry_date?: string;
  location_id?: string;
  location_name?: string;

  allocated_quantity: number; // Original quantity allocated on PI
  return_quantity: number; // De-allocated / returned quantity
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

  const lastFetchedKeyRef = useRef<string | null>(null);

  const allocationRequestKey = [
    debitNoteLineId ?? "",
    purchaseOrderLineId ?? "",
    purchaseInvoiceLineId ?? "",
    cleanRequiredQty,
  ].join("|");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialAllocations !== undefined) {
      return;
    }

    if (!debitNoteLineId && !purchaseOrderLineId && !purchaseInvoiceLineId) {
      return;
    }

    if (lastFetchedKeyRef.current === allocationRequestKey) {
      return;
    }

    lastFetchedKeyRef.current = allocationRequestKey;
    const controller = new AbortController();

    let cancelled = false;

    const loadAllocations = async () => {
      try {
        setLoading(true);
        show("Fetching Record...");
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

        const response = await fetch(
          `/api/debit-notes/inventory-allocations?${queryParams.toString()}`,
        );

        if (!response.ok) {
          throw new Error(
            `Allocation API failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        console.log("data ==== ", data);
        console.log("data.success ==== ", data.success);
        console.log("Array.isArray(data.data) ==== ", Array.isArray(data.data));

        if (cancelled) {
          return;
        }

        if (data.success && Array.isArray(data.data)) {
          let remainingToAllocate = cleanRequiredQty;

          console.log("remainingToAllocate ", remainingToAllocate);

          const mapped: StockDeAllocationRecord[] = data.data.map(
            (item: DBAllocationRecord) => {
              const originalQty = formatQty(item.allocated_quantity);

              let initialReturnQty = 0;

              if (remainingToAllocate > 0) {
                initialReturnQty = Math.min(originalQty, remainingToAllocate);

                remainingToAllocate -= initialReturnQty;
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

          setAllocations(mapped);
        } else {
          setAllocations([]);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (cancelled) {
          return;
        }

        console.error("Failed to load allocations for de-allocation:", error);

        toast.error("Could not fetch batch allocations.");
        lastFetchedKeyRef.current = null;
      } finally {
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

  const variance = currentTotalReturn - cleanRequiredQty;

  const isValidAllocation = Math.abs(variance) < 0.0001;

  const handleQuantityChange = (index: number, value: string) => {
    const numericValue = parseFloat(value) || 0;

    const updated = [...allocations];

    const maxAllowed = updated[index].allocated_quantity;

    if (numericValue > maxAllowed) {
      toast.error(
        `Cannot de-allocate more than original allocated quantity (${maxAllowed})`,
      );

      return;
    }

    if (numericValue < 0) {
      toast.error("Return quantity cannot be negative.");

      return;
    }

    updated[index] = {
      ...updated[index],
      return_quantity: numericValue,
    };

    setAllocations(updated);
  };

  const handleSave = () => {
    if (!isValidAllocation) {
      if (currentTotalReturn < cleanRequiredQty) {
        toast.error(
          `De-allocation incomplete. You need to allocate ${
            cleanRequiredQty - currentTotalReturn
          } more items across batches.`,
        );
      } else {
        toast.error(
          `Over-allocated. You have selected ${
            currentTotalReturn - cleanRequiredQty
          } more items than the required ${cleanRequiredQty}.`,
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
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Item:
              </span>{" "}
              {itemCode} {itemName ? `- ${itemName}` : ""}
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Warehouse:
              </span>{" "}
              {warehouseName || "-"}
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Required Return Qty:
              </span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {cleanRequiredQty}
              </span>
            </div>
          </div>

          {loading && (
            <div className="text-center text-xs text-slate-500 py-2">
              Loading allocated batches...
            </div>
          )}

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="p-2">Batch No</th>
                <th className="p-2">Bin</th>
                <th className="p-2">Expiry</th>
                <th className="p-2 text-right">Original Qty</th>
                <th className="p-2 text-right w-[120px]">Return Qty</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-slate-500">
                    {loading
                      ? "Loading allocated batches..."
                      : "No allocated batches found."}
                  </td>
                </tr>
              ) : (
                allocations.map((row, index) => (
                  <tr key={row.id || index}>
                    <td className="p-2">{row.batch_no || "-"}</td>
                    <td className="p-2">{row.bin_code || "-"}</td>
                    <td className="p-2">{row.expiry_date || "-"}</td>
                    <td className="p-2 text-right font-mono">
                      {row.allocated_quantity}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={row.allocated_quantity}
                        step="any"
                        value={row.return_quantity}
                        disabled={loading}
                        onChange={(event) =>
                          handleQuantityChange(index, event.target.value)
                        }
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded p-1 text-right font-mono"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs">
            Total Returning:{" "}
            <span
              className={`font-bold font-mono ${
                isValidAllocation
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {currentTotalReturn} / {cleanRequiredQty}
            </span>
          </div>


          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading || allocations.length === 0}
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Allocation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} */

/* "use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

export interface StockDeAllocationRecord {
  id: string; // inventory_allocations.id
  purchase_order_line_id?: string;
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
  initialAllocations = [],
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { show, hide } = useLoader();
  // const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>([]);

  const cleanRequiredQty = formatQty(requiredQuantity);

  // 1. Initialize state directly from props (No useEffect needed for state sync)
  const [allocations, setAllocations] = useState<StockDeAllocationRecord[]>(
    () => {
      if (initialAllocations && initialAllocations.length > 0) {
        return initialAllocations.map((a) => ({
          ...a,
          allocated_quantity: formatQty(a.allocated_quantity),
          return_quantity: formatQty(a.return_quantity),
        }));
      }
      return [];
    },
  );

  useEffect(() => {
    if (!open || (initialAllocations && initialAllocations.length > 0)) {
      return;
    }

    // 2. Otherwise fetch allocations from API
    if (!purchaseInvoiceLineId && !debitNoteLineId && !purchaseOrderLineId)
      return;

    let isMounted = true;
    const queryParams = new URLSearchParams();

    if (debitNoteLineId) queryParams.set("debit_note_line_id", debitNoteLineId);
    if (purchaseOrderLineId)
      queryParams.set("purchase_order_line_id", purchaseOrderLineId);
    if (purchaseInvoiceLineId)
      queryParams.set("purchase_invoice_line_id", purchaseInvoiceLineId);

    show("Fetching Record...");

    fetch(`/api/debit-notes/inventory-allocations?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;

        if (data.success && Array.isArray(data.data)) {
          let remainingToAllocate = cleanRequiredQty;

          const mapped: StockDeAllocationRecord[] = data.data.map(
            (item: DBAllocationRecord) => {
              const origQty = formatQty(item.allocated_quantity);

              let initialReturnQty = 0;
              if (remainingToAllocate > 0) {
                initialReturnQty = Math.min(origQty, remainingToAllocate);
                remainingToAllocate -= initialReturnQty;
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
                allocated_quantity: origQty,
                return_quantity: initialReturnQty,
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
        if (isMounted) {
          setLoading(false);
          hide();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    open,
    purchaseOrderLineId,
    purchaseInvoiceLineId,
    debitNoteLineId,
    initialAllocations,
    cleanRequiredQty,
    hide,
    show,
  ]);

  if (!open) return null;

  const currentTotalReturn = allocations.reduce(
    (sum, row) => sum + formatQty(row.return_quantity),
    0,
  );

  const variance = currentTotalReturn - cleanRequiredQty;
  const isValidAllocation = Math.abs(variance) < 0.0001;

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
    if (!isValidAllocation) {
      if (currentTotalReturn < cleanRequiredQty) {
        toast.error(
          `De-allocation incomplete. You need to allocate ${cleanRequiredQty - currentTotalReturn} more items across batches.`,
        );
      } else {
        toast.error(
          `Over-allocated. You have selected ${currentTotalReturn - cleanRequiredQty} more items than the required ${cleanRequiredQty}.`,
        );
      }
      return;
    }

    const validDeAllocations = allocations.filter((a) => a.return_quantity > 0);
    onSave(validDeAllocations);
    onClose();
  };

  return (
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
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        </div>



        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Item:
              </span>{" "}
              {itemCode} {itemName ? `- ${itemName}` : ""}
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Warehouse:
              </span>{" "}
              {warehouseName || "-"}
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Required Return Qty:
              </span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {cleanRequiredQty}
              </span>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="p-2">Batch No</th>
                <th className="p-2">Bin</th>
                <th className="p-2">Expiry</th>
                <th className="p-2 text-right">Original Qty</th>
                <th className="p-2 text-right w-[120px]">Return Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-slate-500">
                    No allocated batches found.
                  </td>
                </tr>
              ) : (
                allocations.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="p-2">{row.batch_no || "-"}</td>
                    <td className="p-2">{row.bin_code || "-"}</td>
                    <td className="p-2">{row.expiry_date || "-"}</td>
                    <td className="p-2 text-right font-mono">
                      {row.allocated_quantity}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={row.return_quantity}
                        onChange={(e) =>
                          handleQuantityChange(idx, e.target.value)
                        }
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded p-1 text-right font-mono"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs">
            Total Returning:{" "}
            <span
              className={`font-bold font-mono ${
                isValidAllocation
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {currentTotalReturn} / {cleanRequiredQty}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium"
            >
              Save Allocation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} */

{
  /* <div className="flex-1 overflow-y-auto p-4 space-y-4">
     
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Required Return Qty:
              </span>{" "}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {cleanRequiredQty}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Selected Return Qty:
              </span>{" "}
              <strong
                className={`font-mono ${
                  isValidAllocation
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {currentTotalReturn}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Status:
              </span>{" "}
              {isValidAllocation ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Icon icon="tabler:circle-check-filled" className="w-4 h-4" />
                  Matched
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                  <Icon icon="tabler:alert-triangle-filled" className="w-4 h-4" />
                  {variance > 0 ? `+${variance} Excess` : `${variance} Remaining`}
                </span>
              )}
            </div>
          </div>

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
                        className="w-full text-right px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800"
                        // className="w-full text-right px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 focus:border-red-600 outline-none font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> */
}

{
  /* <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * Total return quantity across batches must equal{" "}
            <strong>{cleanRequiredQty}</strong>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValidAllocation || allocations.length === 0}
              className={`px-4 py-1.5 rounded text-xs font-semibold text-white transition ${
                isValidAllocation && allocations.length > 0
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              Confirm De-Allocation
            </button>
          </div>
        </div> */
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

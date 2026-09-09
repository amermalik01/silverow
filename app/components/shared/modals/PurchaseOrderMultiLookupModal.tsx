// app/components/shared/modals/PurchaseOrderMultiLookupModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { format } from "date-fns";

export interface PurchaseOrderLookupItem {
  id: string;
  purchase_order_id: string;
  purchase_invoice_id?: string | null;
  document_type: "purchase_order" | "invoice";
  posting_date: string;
  order_no: string;
  invoice_no?: string | null;
  supplier_invoice_no?: string | null;
  supplier_name?: string | null;
  supplier_no?: string | null;
  currency_code: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  is_posted: boolean;
  has_invoice: boolean;
  has_invoice_pending: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrders: (orders: PurchaseOrderLookupItem[]) => void;
  selectedOrderNos?: string[];
}

export const PurchaseOrderMultiLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectOrders,
  selectedOrderNos = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderLookupItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<PurchaseOrderLookupItem[]>(
    [],
  );

  // Search terms & debounce
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(
        `/api/lookups/purchase-orders?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load purchase orders");
      }

      const json = await res.json();
      setOrders(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isOpen) {
      fetchPurchaseOrders();
    }
  }, [isOpen, fetchPurchaseOrders]);

  const handleToggleSelect = (item: PurchaseOrderLookupItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.order_no === item.order_no);
      if (exists) {
        return prev.filter((i) => i.order_no !== item.order_no);
      }
      return [...prev, item];
    });
  };

  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const combined = [...selectedItems];
      orders.forEach((ord) => {
        if (!combined.some((item) => item.order_no === ord.order_no)) {
          combined.push(ord);
        }
      });
      setSelectedItems(combined);
    } else {
      const pageOrderNos = new Set(orders.map((o) => o.order_no));
      setSelectedItems((prev) =>
        prev.filter((i) => !pageOrderNos.has(i.order_no)),
      );
    }
  };

  const handleConfirm = () => {
    onSelectOrders(selectedItems);
    onClose();
  };

  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (!isOpen) return null;

  const isAllPageSelected =
    orders.length > 0 &&
    orders.every((ord) =>
      selectedItems.some((i) => i.order_no === ord.order_no),
    );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon className="text-xl" icon="tabler:file-invoice" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Purchase Orders ({selectedItems.length} Selected)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon className="text-xl" icon="tabler:x" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
              icon="tabler:search"
            />
            <input
              type="text"
              placeholder="Type to search PO No., PI No.,..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon className="text-sm" icon="tabler:x" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {loading && (
              <span className="flex items-center gap-1 text-[#103701] dark:text-slate-300">
                <Icon
                  className="animate-spin text-base"
                  icon="tabler:loader-2"
                />{" "}
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-left text-xs table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="p-2.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAllOnPage}
                    className="rounded border-slate-300 text-[#103701] focus:ring-[#103701]"
                  />
                </th>
                <th className="p-2.5 text-left font-semibold">Type</th>
                <th className="p-2.5 text-left font-semibold">Posting Date</th>
                <th className="p-2.5 text-left font-semibold">Order No.</th>
                <th className="p-2.5 text-left font-semibold">Invoice No.</th>
                <th className="p-2.5 text-left font-semibold">
                  Suppl. Inv. No.
                </th>
                <th className="p-2.5 text-left font-semibold">Currency</th>
                <th className="p-2.5 font-semibold text-right">Amount</th>
                <th className="p-2.5 font-semibold text-right">VAT</th>
                <th className="p-2.5 font-semibold text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const isChecked = selectedItems.some(
                  (i) => i.order_no === ord.order_no,
                );
                return (
                  <tr
                    key={ord.id}
                    onClick={() => handleToggleSelect(ord)}
                    className={`hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition ${
                      isChecked ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <td
                      className="p-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(ord)}
                        className="rounded border-slate-300 text-[#103701] focus:ring-[#103701]"
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ord.has_invoice
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {ord.has_invoice ? "INVOICE" : "PO"}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {ord.posting_date
                        ? format(new Date(ord.posting_date), "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      {ord.order_no}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      {ord.invoice_no || (
                        <span className="text-slate-400">Not invoiced</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {ord.supplier_invoice_no || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {ord.currency_code || "GBP"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(ord.amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(ord.vat_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {Number(ord.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER & ACTIONS */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Showing {orders.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
              {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
              orders
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-left" className="text-base" />
              </Button>

              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                disabled={page >= pagination.totalPages || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-right" className="text-base" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-[#103701] hover:bg-[#103701]/90 text-white"
              onClick={handleConfirm}
              size="sm"
            >
              Confirm Selection ({selectedItems.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

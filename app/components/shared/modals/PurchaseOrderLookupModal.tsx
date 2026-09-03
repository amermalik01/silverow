// app/components/shared/modals/PurchaseOrderLookupModal.tsx

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
  onSelectOrder: (order: PurchaseOrderLookupItem) => void;
}

export const PurchaseOrderLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderLookupItem[]>([]);

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

  // Reset page to 1 on new search term
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debounced term changes
  useEffect(() => {
    if (isOpen) {
      fetchPurchaseOrders();
    }
  }, [isOpen, fetchPurchaseOrders]);

  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:file-invoice" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Purchase Order
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Type to search PO number, vendor, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {loading && (
              <span className="flex items-center gap-1 text-[#103701] dark:text-slate-300">
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
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
              {orders.map((ord) => (
                <tr
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                >
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
                      ? format(ord.posting_date, "dd/MM/yyyy")
                      : "—"}
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Icon
                        icon="tabler:external-link"
                        className="w-3.5 h-3.5"
                      />
                      {ord.order_no}
                    </span>
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      {ord.invoice_no ? (
                        <>
                          <Icon
                            icon="tabler:file-invoice"
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          <span className="text-blue-700 dark:text-blue-400">
                            {ord.invoice_no}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">Not invoiced</span>
                      )}
                    </span>
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
                    })}{" "}
                    {ord.currency_code || "GBP"}
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                    {Number(ord.vat_amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {ord.currency_code || "GBP"}
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    {Number(ord.total_amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {orders.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
            orders
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-12 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

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
        </div>
      </div>
    </div>
  );
};

/* "use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

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
  onSelectOrder: (order: PurchaseOrderLookupItem) => void;
}

export const PurchaseOrderLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<PurchaseOrderLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // setLoading(true);
    const query = new URLSearchParams({
      search: searchTerm,
      limit: "50",
    });

    fetch(`/api/lookups/purchase-orders?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching supplier orders:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="p-3 bg-emerald-800 dark:bg-slate-800 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-white">
            Purchase Orders/Invoices
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 dark:hover:bg-slate-700 rounded transition"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>


        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="relative max-w-sm">
            <Icon
              icon="tabler:search"
              className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search order/invoice no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading Purchase Orders/Invoices...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No purchase orders or invoices found.
            </div>
          ) : (
            <table className="w-full text-left text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-semibold">
                  <th className="p-2 border border-emerald-700">Type</th>
                  <th className="p-2 border border-emerald-700">
                    Posting Date
                  </th>
                  <th className="p-2 border border-emerald-700">Order No.</th>
                  <th className="p-2 border border-emerald-700">Invoice No.</th>
                  <th className="p-2 border border-emerald-700">
                    Suppl. Inv. No.
                  </th>
                  <th className="p-2 border border-emerald-700">Currency</th>
                  <th className="p-2 border border-emerald-700 text-right">
                    Amount
                  </th>
                  <th className="p-2 border border-emerald-700 text-right">
                    VAT
                  </th>
                  <th className="p-2 border border-emerald-700 text-right">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => onSelectOrder(ord)}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                  >
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
                        ? format(ord.posting_date, "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Icon
                          icon="tabler:external-link"
                          className="w-3.5 h-3.5"
                        />
                        {ord.order_no}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        {ord.invoice_no ? (
                          <>
                            <Icon
                              icon="tabler:file-invoice"
                              className="w-3.5 h-3.5 text-blue-600"
                            />
                            <span className="text-blue-700 dark:text-blue-400">
                              {ord.invoice_no}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Not invoiced</span>
                        )}
                      </span>
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
                      })}{" "}
                      {ord.currency_code || "GBP"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(ord.vat_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {ord.currency_code || "GBP"}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {Number(ord.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>


        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
          <Button type="button" onClick={onClose} variant="cancel">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
 */

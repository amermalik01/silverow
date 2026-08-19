// app/components/sales/quotes/SalesQuoteList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesQuote } from "@/types/sales-quote";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function SalesQuoteList({ slug }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<SalesQuote[]>([]);
  const [loading, setLoading] = useState(true);

  // Async feedback markers
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filter and Pagination States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const load = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status,
      });

      const res = await fetch(
        `/api/sales/sales-quotes?${queryParams.toString()}`,
      );
      const data = await res.json();

      setRows(data.rows || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load elements", err);
    } finally {
      setLoading(false);
    }
  };

  // Reload data context on input changes
  useEffect(() => {
    load();
  }, [page, limit, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset back to first page upon filtering actions
    load();
  };

  // Process mapping pipeline from quote to order database entities
  const handleConvertToOrder = async (quoteId: string) => {
    if (
      !confirm(
        "Are you sure you want to convert this quote into a live Sales Order?",
      )
    )
      return;

    try {
      setSubmittingId(quoteId);
      setAlertMsg(null);

      const res = await fetch(`/api/sales/sales-quotes/${quoteId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Failed to process quote transformation.",
        );
      }

      setAlertMsg({ type: "success", text: result.message });

      // Auto-reload current data collection parameters to reflect internal status modifications
      await load();

      // Optional UX redirect logic to directly review your generated entity
      // router.push(`/${slug}/sales/orders/${result.orderId}`);
    } catch (err) {
      const errorObj = err as Error;
      setAlertMsg({ type: "error", text: errorObj.message });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* GLOBAL SYSTEM ALERTS */}
      {alertMsg && (
        <div
          className={`p-4 rounded-xl text-xs border font-medium ${
            alertMsg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
          }`}
        >
          {alertMsg.text}
        </div>
      )}
      {/* FILTER CONTROLS BAR */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-wrap items-end gap-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium mb-1 opacity-70">
            Search Quotes
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quote number or customer..."
            className="w-full text-xs border rounded px-3 py-1.5 dark:bg-slate-900 text-black dark:text-white"
          />
        </div>

        <div className="w-[160px]">
          <label className="block text-xs font-medium mb-1 opacity-70">
            Filter Status
          </label>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs border rounded px-2 py-1.5 dark:bg-slate-900 text-black dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
            <option value="CONVERTED">Converted</option>
          </select>
        </div>

        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded transition-colors"
        >
          Apply Filters
        </Button>
      </form>

      {/* EXTENDED VIEWS TABLE CONTAINER */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white overflow-hidden shadow-sm p-4 overflow-auto">
        {loading ? (
          <div className="py-8 text-center text-xs opacity-70">
            Loading quote ledger data...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs opacity-70">
            No sales quotes found matching current filter context.
          </div>
        ) : (
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-gray-100 dark:bg-slate-800 text-black dark:text-white">
              <tr>
                <th className="p-3 text-left">Quote No</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Expiry Date</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-3 font-medium">{row.quote_no}</td>
                  <td className="p-3">{row.customer_name}</td>
                  <td className="p-3 whitespace-nowrap">{row.quote_date}</td>
                  <td className="p-3 whitespace-nowrap">
                    {row.expiry_date || <span className="opacity-40">—</span>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        row.status === "CONVERTED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : row.status === "SENT" || row.status === "ACCEPTED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : row.status === "EXPIRED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {Number(row.subtotal || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {Number(row.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <Link
                        href={`/${slug}/sales/quotes/${row.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Open
                      </Link>
                      {/* CONVERSION BUTTON CONTEXT ACTION */}
                      {row.id &&
                      row.status !== "CONVERTED" &&
                      row.status !== "EXPIRED" &&
                      row.status !== "REJECTED" ? (
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => row.id && handleConvertToOrder(row.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xs font-medium px-2.5 py-1 rounded transition-colors"
                        >
                          {submittingId === row.id
                            ? "Converting..."
                            : "Convert to Order"}
                        </button>
                      ) : row.status === "CONVERTED" ? (
                        <span className="text-xs text-gray-400 italic">
                          Processed
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER PAGINATION BAR */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm text-xs">
        <div className="opacity-70">
          Showing {rows.length} of {pagination.total} records found
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs opacity-70">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="border rounded p-1 text-xs dark:bg-slate-900"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-3">
              Page <strong>{pagination.page}</strong> of{" "}
              {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

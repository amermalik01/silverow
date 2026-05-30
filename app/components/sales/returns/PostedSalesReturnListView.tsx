// /app/components/sales/returns/PostedSalesReturnListView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PostedCreditNoteRow {
  id: string;
  credit_note_no: string;
  source_return_no: string;
  posting_date: string;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  journal_entry_id: string | null;
  notes: string | null;
  customer_name: string;
  currency_code: string;
}

export default function PostedSalesReturnListView({ slug }: { slug: string }) {
  const [records, setRecords] = useState<PostedCreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination Core States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Dynamic Query Filter Metrics
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce tracking effect loop
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadPostedLedgers() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(debouncedSearch && { search: debouncedSearch }),
        });

        const res = await fetch(
          `/api/sales/posted-returns?${query.toString()}`,
        );
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          throw new Error(
            payload.error || "System rejected posted archive parsing request.",
          );
        }

        setRecords(payload.data);
        setTotalPages(payload.meta.totalPages);
        setTotalRecords(payload.meta.total);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPostedLedgers();
  }, [page, limit, debouncedSearch]);

  // Reset indices back to page 1 during configuration changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
      {/* Structural Workspace Header Banner */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Posted Credit Notes Ledger
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Archived immutable journal entries. Authorized read-only
            transactional audit trail.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${slug}/sales/returns`}
            className="border dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition text-center shadow-sm"
          >
            View Return Drafts
          </Link>
        </div>
      </div>

      {/* Control Actions & Keyword Filter Block */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <input
            type="text"
            placeholder="Search by Credit Note #, Source Return # or Notes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full text-sm border p-2 pl-9 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 font-medium"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm pointer-events-none select-none">
            🔍
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase whitespace-nowrap self-end sm:self-center">
          <span>Records per grid layout:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            className="border p-1 rounded bg-white dark:bg-slate-800 dark:border-slate-700 font-mono text-sm"
          >
            {[10, 25, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Main Immutable Ledger Grid Panel Layout */}
      <div className="border dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse font-medium">
            Parsing verified historic accounting streams...
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-sm text-gray-400 italic">
            No matching posted ledger rows resolved inside this archive window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b dark:border-slate-800 text-xs font-bold text-gray-500 tracking-wider uppercase select-none">
                <tr>
                  <th className="p-4 w-40">Credit Note No</th>
                  <th className="p-4 w-40">Source Ref</th>
                  <th className="p-4 w-32">Posting Date</th>
                  <th className="p-4">Customer Entity</th>
                  <th className="p-4 w-32 text-center">Financials</th>
                  <th className="p-4 w-40 text-right">Total Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60">
                {records.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-gray-900 dark:text-white">
                      {row.credit_note_no}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {row.source_return_no}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                      {new Date(row.posting_date).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </td>
                    <td className="p-4">
                      <div
                        className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs"
                        title={row.customer_name}
                      >
                        {row.customer_name}
                      </div>
                      {row.notes && (
                        <p
                          className="text-[11px] text-gray-400 font-normal truncate max-w-xs mt-0.5"
                          title={row.notes}
                        >
                          {row.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {row.journal_entry_id ? (
                        <Link
                          href={`/${slug}/financials/journals/${row.journal_entry_id}`}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-extrabold px-2 py-1 rounded border border-blue-200/50 dark:border-blue-900/40 tracking-wider uppercase transition"
                        >
                          GL Journal ↗
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs italic select-none">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {row.currency_code}{" "}
                      {Number(row.total_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Footer Control Bar */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/30 border-t dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm select-none">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Showing tracking indexes{" "}
            <span className="font-mono text-gray-800 dark:text-gray-200">
              {records.length ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-mono text-gray-800 dark:text-gray-200">
              {Math.min(page * limit, totalRecords)}
            </span>{" "}
            of{" "}
            <span className="font-mono text-gray-800 dark:text-gray-200">
              {totalRecords}
            </span>{" "}
            archived entries.
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
              className="px-2.5 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-gray-50 text-xs font-bold transition"
            >
              &laquo; First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-gray-50 text-xs font-bold transition"
            >
              &larr; Prev
            </button>

            <span className="px-4 py-1 text-xs font-bold text-gray-600 dark:text-gray-400">
              Page{" "}
              <span className="font-mono text-gray-900 dark:text-white font-extrabold">
                {page}
              </span>{" "}
              of {totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-gray-50 text-xs font-bold transition"
            >
              Next &rarr;
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="px-2.5 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-gray-50 text-xs font-bold transition"
            >
              Last &raquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

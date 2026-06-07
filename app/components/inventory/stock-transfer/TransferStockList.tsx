// app/components/inventory/stock-transfer/TransferStockList.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export interface StockTransferListItem {
  id: string;
  transfer_no: string;
  transfer_date: string;
  warehouse_from_id: string;
  warehouse_to_id: string;
  in_transit_code: string;
  shipping_charge: number | string;
  is_posted: boolean;
}

type Props = {
  slug: string;
  title: string;
  apiBase: string;
  createPath: string;
};

type StatusFilter = "all" | "posted" | "unposted";

export default function StockTransferList({
  title,
  apiBase,
  createPath,
}: Props) {
  const [data, setData] = useState<StockTransferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("unposted");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Query filters append matching status and server-side page indices
      const res = await fetch(`${apiBase}?status=${status}&page=${page}&limit=20`);
      const result = await res.json();

      setData(result.rows || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error("[LOAD_STOCK_TRANSFER_LIST_ERROR]", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, status, page]);

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatus(newStatus);
    setPage(1);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePost = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to lock and finalize this stock transfer? This will move physical quantities across warehouses.",
      )
    )
      return;

    try {
      const res = await fetch(`${apiBase}/${id}/post`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Posting runtime calculations aborted.");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Error posting transactional stock transfer document.");
    }
  };

  return (
    <div className="p-6 rounded border bg-white dark:bg-zinc-900 shadow-sm space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">
            Monitor, track and verify multi-warehouse stock fulfillment
            movements and drafts.
          </p>
        </div>
        <Link
          href={createPath}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded transition"
        >
          + New Transfer
        </Link>
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 text-sm">
        {(["unposted", "posted", "all"] as StatusFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleStatusChange(tab)}
            className={`px-4 py-2 font-medium border-b-2 -mb-[2px] transition capitalize ${
              status === tab
                ? "border-emerald-600 text-emerald-600 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "unposted"
              ? "Drafts"
              : tab === "posted"
                ? "Posted"
                : "All Transfers"}
          </button>
        ))}
      </div>

      {/* DATA VIEW GRID */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500 font-medium">
          Loading general inventory distribution records...
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 border border-dashed rounded">
          No records located matching current filter scope.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                <th className="p-3 w-32">Transfer No</th>
                <th className="p-3 w-32">Date</th>
                <th className="p-3">Source Warehouse</th>
                <th className="p-3">Dest Warehouse</th>
                <th className="p-3 w-28">Transit Method</th>
                <th className="p-3 w-32 text-right">Freight Cost</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition content-center"
                >
                  <td className="p-3 font-medium">
                    <Link
                      href={`${createPath.replace("/create", "")}/${row.id}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                    >
                      {row.transfer_no}
                    </Link>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    {new Date(row.transfer_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    {row.warehouse_from_id}
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    {row.warehouse_to_id}
                  </td>
                  <td className="p-3 text-zinc-500 font-mono text-xs">
                    {row.in_transit_code || "Direct"}
                  </td>
                  <td className="p-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                    $
                    {Number(row.shipping_charge || 0).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.is_posted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {row.is_posted ? "Posted" : "Draft"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {!row.is_posted ? (
                      <button
                        onClick={() => handlePost(row.id)}
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/40"
                      >
                        Post Stock
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">
                        Locked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION PANEL CONTROLS */}
          <div className="flex justify-between items-center p-4 border-t border-zinc-200 dark:border-zinc-800 text-sm">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              ← Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

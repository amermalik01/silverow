// app/components/finance/journals/JournalList.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export interface JournalListItem {
  id: string;
  entry_no: string | number;
  posting_date: string;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
  currency_code: string;
  exchange_rate: number;
  total_debit: number | string;
  total_credit: number | string;
  is_posted: boolean;
}

type Props = {
  slug?: string;
  title: string;
  journalType: "customer" | "supplier" | "item" | "general";
  apiBase: string;
  createPath: string;
};

type StatusFilter = "all" | "posted" | "unposted";

export default function JournalList({ title, apiBase, createPath }: Props) {
  const [data, setData] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("unposted");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}?status=${status}&page=${page}&limit=20`,
      );
      const result = await res.json();

      setData(result.rows || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load journals:", err);
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

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">
            Manage, balance and verify double entry book adjustments.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={createPath}>+ Create</Link>
        </Button>
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 text-xs">
        {(["unposted", "posted", "all"] as StatusFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleStatusChange(tab)}
            className={`px-4 py-2 font-medium border-b-2 -mb-[2px] transition capitalize ${
              status === tab
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "unposted"
              ? "Drafts"
              : tab === "posted"
                ? "Posted"
                : "All Entries"}
          </button>
        ))}
      </div>

      {/* DATA VIEW GRID */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 font-medium">
          Loading journal entries...
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-400 border border-dashed rounded">
          No journal entries found matching the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left border-collapse table-fixed text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                <th className="p-3 w-28">Entry No</th>
                <th className="p-3 w-28">Posting Date</th>
                <th className="p-3 w-28">Entry Date</th>
                <th className="p-3 w-24 text-center">Status</th>
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
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      #{row.entry_no}
                    </Link>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    {row.posting_date
                      ? format(row.posting_date, "dd/MM/yyyy")
                      : "—"}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    {format(row.entry_date, "dd/MM/yyyy")}
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
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION CONTROLS */}
          <div className="flex justify-between items-center p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
            <Button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800"
            >
              ← Previous
            </Button>
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <Button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* 


  const handlePost = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to lock and post this journal entry to general ledgers?",
      )
    )
      return;
    try {
      const res = await fetch(`${apiBase}/${id}/post`, { method: "POST" });
      if (!res.ok) throw new Error("Posting execution failed.");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Error posting transactional item.");
    }
  };
*/
/* 

                <th className="p-3 w-32">Reference</th>
                <th className="p-3">Description</th>
                <th className="p-3 w-20 text-center">Currency</th>
                <th className="p-3 w-32 text-right">Debit Amount</th>
                <th className="p-3 w-32 text-right">Credit Amount</th>
                <th className="p-3 w-24 text-center">Action</th>
*/
                  {/* <td className="p-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                    {row.currency_code || "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {Number(row.total_debit || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {Number(row.total_credit || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td> 
                  <td className="p-3 font-mono text-xs max-w-[140px] truncate">
                    {row.reference || (
                      <span className="text-zinc-300 dark:text-zinc-700">
                        —
                      </span>
                    )}
                  </td>
                  <td
                    className="p-3 max-w-xs truncate text-zinc-600 dark:text-zinc-400"
                    title={row.description || ""}
                  >
                    {row.description || (
                      <span className="text-zinc-400 italic">
                        No description
                      </span>
                    )}
                  </td>
                   <td className="p-3 text-center">
                    {!row.is_posted ? (
                      <Button
                        onClick={() => handlePost(row.id)}
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/40"
                      >
                        Post
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">
                        Locked
                      </span>
                    )}
                  </td> */}
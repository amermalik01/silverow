// app/components/finance/journals/JournalList.tsx

// app/components/finance/journals/JournalList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export interface JournalListItem {
  id: string;
  entry_no: string | number;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
  amount: number | string; // Aggregated net total value from database
  is_posted: boolean;
}

type Props = {
  slug: string;
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

  // Update fetch to pass the page parameter
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}?status=${status}&page=${page}&limit=20`,
      );
      const result = await res.json();

      setData(result.rows || []); // Adjusted from result.data to result.rows
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, status, page]);

  // Reset page back to 1 if the user switches tabs
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

  return (
    <div className="p-6 rounded border bg-white dark:bg-zinc-900 shadow-sm space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">
            Manage, balance and verify double entry book adjustments.
          </p>
        </div>
        <Link
          href={createPath}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded transition"
        >
          + New Entry
        </Link>
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 text-sm">
        {(["unposted", "posted", "all"] as StatusFilter[]).map((tab) => (
          <button
            key={tab}
            // onClick={() => setStatus(tab)}
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
        <div className="py-12 text-center text-sm text-zinc-500 font-medium">
          Loading general journals documentation entries...
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
                <th className="p-3 w-24">Entry No</th>
                <th className="p-3 w-32">Date</th>
                <th className="p-3 w-36">Reference</th>
                <th className="p-3">Memo Description</th>
                <th className="p-3 w-36 text-right">Total Amount</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-24 text-center">Action</th>
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
                    {new Date(row.entry_date).toLocaleDateString()}
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
                        No entry text log provided
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    $
                    {Number(row.amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
                        Post Book
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

          <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800 text-sm">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800"
            >
              ← Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40 text-xs font-medium bg-zinc-50 dark:bg-zinc-800"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface JournalListItem {
  id: string;
  entry_no: number;
  entry_date: string;
  reference?: string;
  is_posted: boolean;
}

type Props = {
  slug: string;

  title: string;

  journalType:
  | "customer"
  | "supplier"
  | "item"
  | "general";

  apiBase: string;

  createPath: string;
};

export default function JournalList({
  slug,
  title,
  apiBase,
  createPath,
}: Props) {
  const [data, setData] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${apiBase}?status=unposted`);

      const result = await res.json();

      setData(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePost = async (id: string) => {
    const confirmed = confirm("Post this journal?");

    if (!confirmed) return;

    try {
      await fetch(`${apiBase}/${id}/post`, {
        method: "POST",
      });

      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 rounded shadow dark:shadow-white space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{title}</h2>

        <Link
          href={createPath}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New
        </Link>
      </div>

      {loading ? (
        <p>Loading journals...</p>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Entry No</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">
                  <Link
                    href={`${createPath.replace("/create", "")}/${row.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {row.entry_no}
                  </Link>
                </td>

                <td className="p-2">{row.entry_date}</td>

                <td className="p-2">{row.reference}</td>

                <td className="p-2">{row.is_posted ? "Posted" : "Open"}</td>

                <td className="p-2">
                  {!row.is_posted && (
                    <button
                      onClick={() => handlePost(row.id)}
                      className="text-green-600 hover:underline"
                    >
                      Post
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
 */

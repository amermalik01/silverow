// app/components/purchases/debit-notes/DebitNoteList.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DebitNote } from "@/types/debit-note";
import DebitNoteStatusBadge from "./DebitNoteStatusBadge";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

type Props = {
  slug: string;
};

type ApiResponse = {
  success: boolean;
  data: DebitNote[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
};

export default function DebitNoteList({ slug }: Props) {
  const [data, setData] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "10",
        search: appliedSearch,
        status: status,
        startDate: startDate,
        endDate: endDate,
      });

      const res = await fetch(`/api/debit-notes?${queryParams.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json?.success === false
            ? "Failed to load debit notes"
            : "Unexpected error",
        );
      }

      setData(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load debit notes",
      );
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, status, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  if (loading)
    return (
      <div className="rounded border p-6 dark:border-slate-800 text-slate-500">
        Loading debit notes...
      </div>
    );
  if (error)
    return (
      <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950/20 p-6 text-red-600">
        {error}
      </div>
    );

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Debit Notes</h2>
          <p className="text-xs text-gray-500">
            Manage supplier return notes, debit reversals and purchase
            adjustments
          </p>
        </div>
        {/* <Link
          href={`/${slug}/purchases/debit-notes/create`}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-xs font-medium transition-colors"
        >
          New Debit Note
        </Link> */}

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/purchases/debit-notes/create`}>
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex gap-2 md:col-span-1"
        >
          <input
            type="text"
            placeholder="Search Debit Note No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-transparent text-black dark:text-white"
          />
          <button
            type="submit"
            className="bg-gray-100 dark:bg-slate-800 text-black dark:text-white px-3 py-2 rounded text-xs hover:bg-gray-200 dark:hover:bg-slate-700 font-medium transition-colors"
          >
            Go
          </button>
        </form>

        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-white dark:bg-slate-800 text-black dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <DatePicker
            value={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
            onChange={(date) => {
              setStartDate(date ? format(date, "yyyy-MM-dd") : "");
              setPage(1);
            }}
            maxDate={endDate ? new Date(`${endDate}T00:00:00`) : undefined}
            placeholder="Start date"
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-transparent text-black dark:text-white"
          />

          <span className="text-xs text-gray-400 shrink-0">to</span>

          <DatePicker
            value={endDate ? new Date(`${endDate}T00:00:00`) : undefined}
            onChange={(date) => {
              setEndDate(date ? format(date, "yyyy-MM-dd") : "");
              setPage(1);
            }}
            minDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
            placeholder="End date"
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-transparent text-black dark:text-white"
          />
        </div>

        {/* <div className="flex items-center gap-2 md:col-span-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-transparent text-black dark:text-white"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="border dark:border-slate-700 rounded p-2 text-xs w-full bg-transparent text-black dark:text-white"
          />
        </div> */}
      </div>

      <div className="border dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/60 border-b dark:border-slate-800 text-black dark:text-white">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">Document No</th>
                <th className="p-3 text-left whitespace-nowrap">Supplier</th>
                <th className="p-3 text-left whitespace-nowrap">Date</th>
                <th className="p-3 text-left whitespace-nowrap">Status</th>
                <th className="p-3 text-right whitespace-nowrap">Total</th>
                <th className="p-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {!data.length ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No debit notes found
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={`/${slug}/purchases/debit-notes/${row.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {row.debit_note_no || "Draft"}
                      </Link>
                    </td>
                    <td className="p-3">{row.supplier_name || "-"}</td>
                    <td className="p-3">
                      {new Date(row.document_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <DebitNoteStatusBadge status={row.status} />
                    </td>
                    <td className="p-3 text-right font-mono">
                      {Number(row.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/${slug}/purchases/debit-notes/${row.id}/edit`}
                        className="rounded border dark:border-slate-700 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalRecords > 0 && (
          <div className="bg-gray-50 dark:bg-slate-800/40 p-4 border-t dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-gray-500 dark:text-slate-400">
              Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalRecords}{" "}
              total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium text-black dark:text-white"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium text-black dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

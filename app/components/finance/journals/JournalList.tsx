// app/components/finance/journals/JournalList.tsx

"use client";

import { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { getJournalCellRenderers, JournalRecord } from "./journalCellRenderers";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type StatusFilter = "unposted" | "posted" | "all";

type Props = {
  slug?: string;
  title: string;
  moduleKey: string;
  sourceType: "CUSTOMER_JOURNAL" | "SUPPLIER_JOURNAL" | "GENERAL";
  createPath: string;
};

export default function JournalList({
  slug = "",
  title,
  moduleKey,
  sourceType,
  createPath,
}: Props) {
  const [status, setStatus] = useState<StatusFilter>("unposted");

  // Custom cell renderers (entry links, formatted numbers, status badges)
  const cellRenderers = useMemo(() => {
    return getJournalCellRenderers(slug, createPath);
  }, [slug, createPath]);

  const renderRowCell = useCallback(
    (row: JournalRecord, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  // Fetch API callback bound to current status tab & source type
  const fetchJournals = useCallback(
    async (params: FetchParams): Promise<FetchResponse<JournalRecord>> => {
      const res = await fetch("/api/finance/journals/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          source: sourceType,
          status: status === "all" ? undefined : status,
        }),
      });
      return res.json();
    },
    [sourceType, status],
  );

  const columnsConfigApi = useMemo(
    () => ({
      get: async (key: string): Promise<ColumnConfig[]> => {
        const res = await fetch(`/api/table-config?moduleKey=${key}`);
        return res.json();
      },
      save: async (key: string, configs: ColumnConfig[]): Promise<void> => {
        await fetch("/api/table-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey: key, configs }),
        });
      },
      reset: async (key: string): Promise<ColumnConfig[]> => {
        await fetch(`/api/table-config/reset?moduleKey=${key}`, {
          method: "POST",
        });
        const res = await fetch(`/api/table-config?moduleKey=${key}`);
        return res.json();
      },
    }),
    [],
  );

  return (
    <div className="space-y-6 ">
      <Breadcrumbs
        items={[
          {
            label: `${title}`,
            href: `${createPath.replace("/create", "")}`,
          },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {/* <p className="text-xs text-slate-500">
            Manage, verify, and review double-entry financial journals.
          </p> */}
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={createPath}>+ Create</Link>
        </Button>
      </div>

      <div className="space-y-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm pt-2">
        {/* Accounting Lifecycle Status Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs gap-1 mx-4">
          {(["unposted", "posted", "all"] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`px-4 py-2 font-medium border-b-2 -mb-[2px] transition capitalize ${
                status === tab
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              {tab === "unposted"
                ? "Open"
                : tab === "posted"
                  ? "Posted Journals"
                  : "All Journals"}
            </button>
          ))}
        </div>

        {/* High-Volume Data Table */}
        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <DataTable<JournalRecord>
            key={status} // Resets grid parameters cleanly on tab switches
            moduleKey={moduleKey}
            fetchApi={fetchJournals}
            columnsConfigApi={columnsConfigApi}
            renderRowCell={renderRowCell}
          />
        </div>
      </div>
    </div>
  );
}

/* "use client";

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
  journalType: "customer" | "supplier" | "general"; // "item" | 
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
                <th className="p-3 w-28">Posting By</th>
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
} */

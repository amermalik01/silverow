// app/components/finance/posted-entries/PostedTransactionsModal.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { PostedLedgerEntry } from "@/types/posted-ledger";
import { postedEntriesCellRenderers } from "./postedEntriesCellRenderers";

interface PostedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentNo?: string;
  documentTitle?: string;
  fetchEndpoint: string;
}

interface PostedEntriesResponse {
  success: boolean;
  data?: PostedLedgerEntry[];
  posted_by?: string;
  posted_at?: string;
  error?: string;
}

const normalizeEntry = (entry: PostedLedgerEntry): PostedLedgerEntry => ({
  ...entry,

  debit_fcy: entry.debit_fcy ?? 0,
  credit_fcy: entry.credit_fcy ?? 0,

  net_amount_fcy:
    entry.net_amount_fcy ??
    Number(entry.debit_fcy || 0) - Number(entry.credit_fcy || 0),

  debit_lcy: entry.debit_lcy ?? 0,
  credit_lcy: entry.credit_lcy ?? 0,

  net_amount_lcy:
    entry.net_amount_lcy ??
    Number(entry.debit_lcy || 0) - Number(entry.credit_lcy || 0),
});

export const PostedTransactionsModal: React.FC<
  PostedTransactionsModalProps
> = ({
  isOpen,
  onClose,
  documentNo,
  documentTitle = "Document",
  fetchEndpoint,
}) => {
  const [entries, setEntries] = useState<PostedLedgerEntry[]>([]);
  const [postedInfo, setPostedInfo] = useState<{
    user: string;
    date: string;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEntries = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(fetchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch posted entries.");
      }

      const json: PostedEntriesResponse = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch posted entries.");
      }

      setEntries((json.data || []).map(normalizeEntry));

      setPostedInfo({
        user: json.posted_by || "System",
        date: json.posted_at || "",
      });
    } catch (err) {
      console.error("Fetch Posted Entries Error:", err);

      setEntries([]);
      setPostedInfo(null);

      setError(
        err instanceof Error ? err.message : "Failed to fetch posted entries.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      fetchEntries();
    }
  }, [isOpen, fetchEndpoint]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchableValues = [
        entry.entry_no,
        entry.posting_date,
        entry.document_type,
        entry.document_number,
        entry.gl_no,
        entry.name,
        entry.source_no,
        entry.user_id,
        entry.debit_lcy,
        entry.credit_lcy,
        entry.net_amount_lcy,
        entry.debit_fcy,
        entry.credit_fcy,
        entry.net_amount_fcy,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [entries, search]);

  const renderCell = (row: PostedLedgerEntry, columnKey: string) => {
    const renderer = postedEntriesCellRenderers[columnKey];

    if (renderer) {
      return renderer(row);
    }

    return row[columnKey as keyof PostedLedgerEntry] ?? "";
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-[#1b431c] px-5 py-3 text-white">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Accounting Entries for {documentTitle} No. {documentNo || "Draft"}
            </h2>

            {!loading && entries.length > 0 && (
              <p className="mt-0.5 text-[11px] text-white/70">
                {entries.length} posted{" "}
                {entries.length === 1 ? "entry" : "entries"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon icon="tabler:x" className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}

        {/* SEARCH BAR & SUMMARY */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <span className="flex items-center gap-1 text-xs text-[#103701] dark:text-slate-300">
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
                />
                Searching...
              </span>
            )}
            {!loading && search && (
              <div className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {filteredEntries.length} of {entries.length}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col py-2 px-1">
          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Icon
                    icon="tabler:loader-2"
                    className="h-5 w-5 animate-spin"
                  />
                  Loading posted entries...
                </div>
              </div>
            ) : error ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                <Icon
                  icon="tabler:alert-circle"
                  className="h-6 w-6 text-red-500"
                />

                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchEntries}
                  className="text-xs font-medium text-[#1b431c] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <Icon
                  icon="tabler:file-search"
                  className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-600"
                />

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {search
                    ? "No entries match your search."
                    : "No posted entries found."}
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-1 text-xs font-medium text-[#1b431c] hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <table className="min-w-[1200px] w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      Posting Date
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      Document Type
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      Document No.
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      GL No.
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      Account Name
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-left font-semibold text-slate-600 dark:text-slate-300">
                      Source No.
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-right font-semibold text-slate-600 dark:text-slate-300">
                      Debit (LCY)
                    </th>

                    <th className="whitespace-nowrap p-2.5  text-right font-semibold text-slate-600 dark:text-slate-300">
                      Credit (LCY)
                    </th>

                    <th className="whitespace-nowrap p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Net (LCY)
                    </th>

                    <th className="whitespace-nowrap p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Debit (FCY)
                    </th>

                    <th className="whitespace-nowrap p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Credit (FCY)
                    </th>

                    <th className="whitespace-nowrap p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Net (FCY)
                    </th>
                    <th className="whitespace-nowrap p-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Entry No.
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={`${entry.entry_no}-${index}`}
                      // className="border-b border-slate-100 transition-colors last:border-b-0 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                    >
                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800">
                        {renderCell(entry, "posting_date")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800">
                        {renderCell(entry, "document_type")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800">
                        {renderCell(entry, "document_number")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800 font-medium ">
                        {renderCell(entry, "gl_no")}
                      </td>

                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        {renderCell(entry, "name")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800">
                        {renderCell(entry, "source_no")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums   ">
                        {renderCell(entry, "debit_lcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums   ">
                        {renderCell(entry, "credit_lcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                        {renderCell(entry, "net_amount_lcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums   ">
                        {renderCell(entry, "debit_fcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums   ">
                        {renderCell(entry, "credit_fcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 ">
                        {renderCell(entry, "net_amount_fcy")}
                      </td>

                      <td className="whitespace-nowrap p-2 border-r border-slate-200 dark:border-slate-800  text-right">
                        {renderCell(entry, "entry_no")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-between border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          {/* Posted information */}
          {postedInfo && !loading && (
            <div className="mt-2 flex shrink-0 justify-start items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <Icon
                icon="tabler:circle-check"
                className="h-3.5 w-3.5 text-green-600"
              />

              <span>
                Posted by {postedInfo.user}
                {postedInfo.date ? ` on ${postedInfo.date}` : ""}
              </span>
            </div>
          )}
          <Button type="button" onClick={onClose} variant="cancel">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

/* "use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { PostedLedgerEntry } from "@/types/posted-ledger";
import { postedEntriesCellRenderers } from "./postedEntriesCellRenderers";

interface PostedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentNo?: string;
  documentTitle?: string;
  fetchEndpoint: string;
}

// Stable API Config object outside render lifecycle
const columnsConfigApi = {
  get: async (moduleKey: string): Promise<ColumnConfig[]> => {
    const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
    return res.json();
  },
  save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
    await fetch("/api/table-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey, configs }),
    });
  },
  reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
    await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
      method: "POST",
    });
    const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
    return res.json();
  },
};

export const PostedTransactionsModal: React.FC<
  PostedTransactionsModalProps
> = ({
  isOpen,
  onClose,
  documentNo,
  documentTitle = "Document",
  fetchEndpoint,
}) => {
  const [postedInfo, setPostedInfo] = useState<{
    user: string;
    date: string;
  } | null>(null);

  const renderRowCell = useCallback(
    (row: PostedLedgerEntry, columnKey: string) => {
      const renderer = postedEntriesCellRenderers[columnKey];
      return renderer ? renderer(row) : undefined;
    },
    [],
  );

  const fetchEntries = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PostedLedgerEntry>> => {
      const res = await fetch(fetchEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (json.posted_by) {
        setPostedInfo({
          user: json.posted_by,
          date: json.posted_at || "",
        });
      }

      // Map DB field fallbacks to keep legacy render keys aligned
      const normalizedData = (json.data || []).map((entry: PostedLedgerEntry) => ({
        ...entry,
        debit_fcy: entry.debit_fcy ?? 0,
        credit_fcy: entry.credit_fcy ?? 0,
        net_amount_fcy: entry.net_amount_fcy ?? (Number(entry.debit_fcy || 0) - Number(entry.credit_fcy || 0)),
        debit_lcy: entry.debit_lcy ?? 0,
        credit_lcy: entry.credit_lcy ?? 0,
        net_amount_lcy: entry.net_amount_lcy ?? (Number(entry.debit_lcy || 0) - Number(entry.credit_lcy || 0)),
      }));

      return {
        data: normalizedData,
        totalRecords:
          json.total || json.totalCount || (json.data ? json.data.length : 0),
      };
    },
    [fetchEndpoint],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-7xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
  
        <div className="bg-[#1b431c] text-white px-6 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold tracking-wide text-white">
            Accounting Entries for {documentTitle} No. {documentNo || "Draft"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="tabler:x" className="w-5 h-5" />
          </button>
        </div>

 
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <DataTable<PostedLedgerEntry>
              moduleKey="posted_ledger_entries"
              fetchApi={fetchEntries}
              columnsConfigApi={columnsConfigApi}
              renderRowCell={renderRowCell}
            />
          </div>

          {postedInfo && (
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Posted By {postedInfo.user}{" "}
              {postedInfo.date ? `On ${postedInfo.date}` : ""}
            </div>
          )}
        </div>


        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900 shrink-0">
          <Button type="button" onClick={onClose} variant="cancel">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}; */
/* "use client";

import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { PostedLedgerEntry } from "@/types/posted-ledger";
import { getPostedEntriesCellRenderers } from "./postedEntriesCellRenderers";

interface PostedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentNo?: string;
  documentTitle?: string; // e.g., "Purchase Invoice", "Journal", "Debit Note"
  fetchEndpoint: string; // e.g., `/api/purchase-invoices/${invoiceId}/posted-entries`
}

export const PostedTransactionsModal: React.FC<
  PostedTransactionsModalProps
> = ({
  isOpen,
  onClose,
  documentNo,
  documentTitle = "Document",
  fetchEndpoint,
}) => {
  const [postedInfo, setPostedInfo] = useState<{
    user: string;
    date: string;
  } | null>(null);

  // Cell Renderer dispatcher
  const cellRenderers = getPostedEntriesCellRenderers();
  const renderRowCell = (row: PostedLedgerEntry, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // DataTable Api Wrapper
  const fetchEntries = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PostedLedgerEntry>> => {
      const res = await fetch(fetchEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (json.posted_by) {
        setPostedInfo({
          user: json.posted_by,
          date: json.posted_at || "",
        });
      }

      return {
        data: json.data || [],
        totalRecords:
          json.total || json.totalCount || (json.data ? json.data.length : 0),
      };
    },
    [fetchEndpoint],
  );

  // Table Configuration Persistence
  const columnsConfigApi = {
    get: async (moduleKey: string): Promise<ColumnConfig[]> => {
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
    save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
      await fetch("/api/table-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, configs }),
      });
    },
    reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
      await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
        method: "POST",
      });
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-7xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

        <div className="bg-[#1b431c] text-white px-6 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-white">
            Accounting Entries for {documentTitle} No. {documentNo || "Draft"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="tabler:x" className="w-5 h-5" />
          </button>
        </div>

   
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <DataTable<PostedLedgerEntry>
              moduleKey="posted_ledger_entries"
              fetchApi={fetchEntries}
              columnsConfigApi={columnsConfigApi}
              renderRowCell={renderRowCell}
            />
          </div>


          {postedInfo && (
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Posted By {postedInfo.user}{" "}
              {postedInfo.date ? `On ${postedInfo.date}` : ""}
            </div>
          )}
        </div>


        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
          <Button type="button" onClick={onClose} variant="cancel">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}; */

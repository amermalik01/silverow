// app/components/finance/posted-entries/PostedTransactionsModal.tsx

"use client";

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
        {/* Header */}
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

        {/* Modal Body */}
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900 shrink-0">
          <Button type="button" onClick={onClose} variant="cancel">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
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

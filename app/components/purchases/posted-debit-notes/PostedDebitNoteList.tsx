// app/components/purchases/posted-debit-notes/PostedDebitNoteList.tsx

"use client";

import { DebitNote } from "@/types/debit-note";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPostedDebitNoteCellRenderers } from "./PosteddebitNoteCellRenderers";

type Props = {
  slug: string;
};

export default function PostedDebitNoteList({ slug }: Props) {
  // 1. Get registry renderers for posted debit note table
  const cellRenderers = getPostedDebitNoteCellRenderers(slug);

  // 2. Render row cell dispatcher
  const renderRowCell = (row: DebitNote, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // 3. Data Fetching Handler
  const fetchPostedDebitNotes = async (
    params: FetchParams
  ): Promise<FetchResponse<DebitNote>> => {
    const res = await fetch("/api/posted-debit-notes/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // 4. Config Persistence APIs
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

  return (
    <div className="space-y-4 container mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Posted Debit Notes</h2>
          <p className="text-xs text-gray-500">
            View posted supplier debit notes, general ledger reversals, and historical purchase adjustments
          </p>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<DebitNote>
          moduleKey="posted_debit_notes"
          fetchApi={fetchPostedDebitNotes}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

// app/components/finance/journals/ItemJournalList.tsx

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
  sourceType: "ITEM_JOURNAL";
  createPath: string;
};

export default function ItemJournalList({
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
      const res = await fetch("/api/finance/item-journal/listing", {
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

// /app/components/sales/returns/SalesReturnList.tsx

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { SalesReturn } from "@/types/sales-return";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getCreditNoteCellRenderers } from "./creditNoteCellRenderers";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

export default function SalesReturnList({ slug }: Props) {
  const cellRenderers = useMemo(() => getCreditNoteCellRenderers(slug), [slug]);

  const renderRowCell = useCallback(
    (row: SalesReturn, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];

      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  const fetchCreditNotes = async (
    params: FetchParams,
  ): Promise<FetchResponse<SalesReturn>> => {
    const res = await fetch("/api/sales/returns/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

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
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Credit Notes",
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Credit Notes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer credit notes, return approvals, and refund tracking
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/returns/new`}>+ Create</Link>
        </Button>
      </div>

      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<SalesReturn>
          moduleKey="sales_credit_notes"
          fetchApi={fetchCreditNotes}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          enableRowSelection={true}
          rowKey="id"
        />
      </div>
    </div>
  );
}

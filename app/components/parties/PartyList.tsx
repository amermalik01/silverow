// app/components/parties/PartyList.tsx

"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { getPartyCellRenderers, PartyRecord } from "./partyCellRenderers";
import Breadcrumbs from "../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug?: string;
  title: string;
  moduleKey?: string;
  roleFlag: "is_crm_lead" | "is_srm_vendor" | "is_customer" | "is_supplier";
  basePath: string;
};

export default function PartyList({
  slug = "parties",
  title,
  moduleKey = "parties",
  roleFlag,
  basePath,
}: Props) {
  // 1. Memoize renderers dictionary based on navigation/role props
  const cellRenderers = useMemo(() => {
    return getPartyCellRenderers(slug, roleFlag, basePath);
  }, [slug, roleFlag, basePath]);

  // 2. Memoize cell renderer execution callback
  const renderRowCell = useCallback(
    (row: PartyRecord, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  // 3. Stable reference for pagination/search fetch handler
  const fetchParties = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PartyRecord>> => {
      const res = await fetch("/api/parties/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, role: roleFlag }),
      });
      return res.json();
    },
    [roleFlag],
  );

  // 4. Memoize table configuration API object reference
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
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: `${title}`,
          },
        ]}
      />
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">
            Manage directory records and system visibility configurations.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/${basePath}/new`}>+ Create</Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PartyRecord>
          moduleKey={moduleKey}
          fetchApi={fetchParties}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          enableRowSelection={true}
          rowKey="id"
        />
      </div>
    </div>
  );
}

/* "use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { getPartyCellRenderers, PartyRecord } from "./partyCellRenderers";

type Props = {
  slug?: string;
  title: string;
  moduleKey?: string;
  roleFlag: "is_crm_lead" | "is_srm_vendor" | "is_customer" | "is_supplier";
  basePath: string;
};

export default function PartyList({
  slug="parties",
  title,
  moduleKey="parties",
  roleFlag,
  basePath,
}: Props) {
  const cellRenderers = getPartyCellRenderers(slug, roleFlag, basePath);

  const renderRowCell = (row: PartyRecord, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  const fetchParties = async (
    params: FetchParams,
  ): Promise<FetchResponse<PartyRecord>> => {
    const res = await fetch("/api/parties/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, role: roleFlag }),
    });
    return res.json();
  };

  const columnsConfigApi = {
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
  };

  return (
    <div className="space-y-4  p-4">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">
            Manage directory records and system visibility configurations.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/${basePath}/new`}>
           +
            Create
          </Link>
        </Button>
      </div>


      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PartyRecord>
          moduleKey={moduleKey}
          fetchApi={fetchParties}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
} */

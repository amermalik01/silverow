// app/components/crm/prospects/ProspectListView.tsx

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/app/components/DataTable/DataTable";
import type { FetchParams, FetchResponse, ColumnConfig } from "@/types/table";
import type { ProspectListRecord } from "@/types/prospect";

import { renderProspectCell } from "./prospectCellRenderers";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

const MODULE_KEY = "crm_prospects";
const BASE_PATH = "sales/prospects";

const defaultColumns: ColumnConfig[] = [
  {
    columnKey: "prospect_no",
    label: "Prospect No.",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 1,
    columnWidth: 130,
  },
  {
    columnKey: "company_name",
    label: "Company",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 2,
    columnWidth: 220,
  },
  {
    columnKey: "primary_contact_name",
    label: "Contact",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 170,
  },
  {
    columnKey: "primary_email",
    label: "Email",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 210,
  },
  {
    columnKey: "primary_phone",
    label: "Phone",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 5,
    columnWidth: 140,
  },
  {
    columnKey: "status",
    label: "Status",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 6,
    columnWidth: 125,
  },
  {
    columnKey: "priority",
    label: "Priority",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 7,
    columnWidth: 100,
  },
  {
    columnKey: "estimated_deal_value",
    label: "Deal Value",
    dataType: "number",
    isVisible: true,
    isPinned: false,
    columnOrder: 8,
    columnWidth: 140,
  },
  {
    columnKey: "assigned_to_name",
    label: "Assigned To",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 9,
    columnWidth: 160,
  },
  {
    columnKey: "next_follow_up_at",
    label: "Next Follow-up",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 10,
    columnWidth: 145,
  },
];

export default function ProspectListView({ slug }: Props) {
  const router = useRouter();

  const fetchProspects = useCallback(
    async (params: FetchParams): Promise<FetchResponse<ProspectListRecord>> => {
      const response = await fetch("/api/sales/crm/prospects/listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Unable to load prospects.");
      }

      return (await response.json()) as FetchResponse<ProspectListRecord>;
    },
    [],
  );

  const columnsConfigApi = useMemo(
    () => ({
      get: async (key: string): Promise<ColumnConfig[]> => {
        const response = await fetch(
          `/api/table-config?moduleKey=${encodeURIComponent(key)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return defaultColumns;
        }

        const result: unknown = await response.json();

        if (
          typeof result === "object" &&
          result !== null &&
          "configs" in result &&
          Array.isArray(result.configs)
        ) {
          return result.configs as ColumnConfig[];
        }

        return defaultColumns;
      },

      save: async (key: string, configs: ColumnConfig[]): Promise<void> => {
        const response = await fetch("/api/table-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            moduleKey: key,
            configs,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to save table configuration.");
        }
      },

      reset: async (key: string): Promise<ColumnConfig[]> => {
        const resetResponse = await fetch(
          `/api/table-config/reset?moduleKey=${encodeURIComponent(key)}`,
          { method: "POST" },
        );

        if (!resetResponse.ok) {
          throw new Error("Unable to reset table configuration.");
        }

        const response = await fetch(
          `/api/table-config?moduleKey=${encodeURIComponent(key)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return defaultColumns;
        }

        const result: unknown = await response.json();

        if (
          typeof result === "object" &&
          result !== null &&
          "configs" in result &&
          Array.isArray(result.configs)
        ) {
          return result.configs as ColumnConfig[];
        }

        return defaultColumns;
      },
    }),
    [],
  );

  const renderRowCell = useCallback(
    (row: ProspectListRecord, columnKey: string) =>
      renderProspectCell(row, columnKey, slug),
    [slug],
  );

  const handleCreate = useCallback(() => {
    router.push(`/${slug}/${BASE_PATH}/new`);
  }, [router, slug]);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Prospects",
          },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Prospects
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage potential customers and track sales opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          <span className="text-lg leading-none">+</span>
          New Prospect
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DataTable<ProspectListRecord>
          moduleKey={MODULE_KEY}
          fetchApi={fetchProspects}
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

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable } from "@/app/components/DataTable/DataTable";
import type { FetchParams, FetchResponse, ColumnConfig } from "@/types/table";
import type { ProspectListRecord } from "@/types/prospect";
import { renderProspectCell } from "./prospectCellRenderers";

type Props = {
  slug: string;
};

const MODULE_KEY = "crm_prospects";

const defaultColumns: ColumnConfig[] = [
  {
    columnKey: "prospect_no",
    label: "Prospect No.",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 1,
    columnWidth: 130,
  },
  {
    columnKey: "company_name",
    label: "Company",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 2,
    columnWidth: 220,
  },
  {
    columnKey: "primary_contact_name",
    label: "Contact",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 170,
  },
  {
    columnKey: "primary_email",
    label: "Email",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 210,
  },
  {
    columnKey: "primary_phone",
    label: "Phone",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 5,
    columnWidth: 140,
  },
  {
    columnKey: "status",
    label: "Status",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 6,
    columnWidth: 125,
  },
  {
    columnKey: "priority",
    label: "Priority",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 7,
    columnWidth: 100,
  },
  {
    columnKey: "estimated_deal_value",
    label: "Deal Value",
    dataType: "number",
    isVisible: true,
    isPinned: false,
    columnOrder: 8,
    columnWidth: 140,
  },
  {
    columnKey: "assigned_to_name",
    label: "Assigned To",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 9,
    columnWidth: 160,
  },
  {
    columnKey: "next_follow_up_at",
    label: "Next Follow-up",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 10,
    columnWidth: 145,
  },
];

export default function ProspectListView({ slug }: Props) {
  const router = useRouter();

  const fetchProspects = useCallback(
    async (
      fetchParams: FetchParams,
    ): Promise<FetchResponse<ProspectListRecord>> => {
      const response = await fetch("/api/sales/crm/prospects/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(fetchParams),
      });

      if (!response.ok) {
        throw new Error("Unable to load prospects.");
      }

      return (await response.json()) as FetchResponse<ProspectListRecord>;
    },
    [],
  );

  const columnsConfigApi = {
    get: async () => {
      const response = await fetch(
        `/api/table-config?moduleKey=${encodeURIComponent(MODULE_KEY)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return defaultColumns;
      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "configs" in result &&
        Array.isArray(result.configs)
      ) {
        return result.configs as ColumnConfig[];
      }
      return defaultColumns;
    },
    save: async (configs: ColumnConfig[]) => {
      const response = await fetch("/api/table-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey: MODULE_KEY, configs }),
      });
      if (!response.ok) throw new Error("Unable to save table configuration.");
    },
    reset: async () => {
      const response = await fetch(
        `/api/table-config/reset?moduleKey=${encodeURIComponent(MODULE_KEY)}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Unable to reset table configuration.");
    },
  };

  const handleCreate = () => router.push(`/${slug}/sales/prospects/new`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Prospects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage potential customers and track sales opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-900"
        >
          <span className="text-lg leading-none">+</span>
          New Prospect
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable<ProspectListRecord>
          moduleKey={MODULE_KEY}
          fetchApi={fetchProspects}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderProspectCell}
          rowKey="id"
          enableRowSelection={false}
        />
      </div>
    </div>
  );
} */

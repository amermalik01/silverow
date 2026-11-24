// app/components/crm/prospects/ProspectListView.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { DataTable } from "@/app/components/DataTable/DataTable";
import type { FetchParams, FetchResponse, ColumnConfig } from "@/types/table";
import type {
  ProspectDashboardData,
  ProspectListRecord,
  ProspectListingFilters,
} from "@/types/prospect";
import type {
  ProspectStatus,
} from "@/lib/validations/prospect.schema";

import { renderProspectCell } from "./prospectCellRenderers";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

import ProspectKpiCards from "./dashboard/ProspectKpiCards";
import ProspectPipelineCard from "./dashboard/ProspectPipelineCard";
import ProspectFollowUpsCard from "./dashboard/ProspectFollowUpsCard";
import ProspectRecentActivityCard from "./dashboard/ProspectRecentActivityCard";
import {
  DateRangePicker,
  FilterMenu,
  type ProspectQuickFilters,
} from "./dashboard/ProspectDashboardControls";
import {
  endOfTodayIso,
  formatRangeLabel,
  rangeForPreset,
  statusLabel,
  type DateRange,
} from "./dashboard/dashboardUtils";

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
    columnKey: "source",
    label: "Source",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 110,
  },
  {
    columnKey: "primary_contact_name",
    label: "Contact",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 170,
  },
  {
    columnKey: "primary_email",
    label: "Email",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 5,
    columnWidth: 210,
  },
  {
    columnKey: "primary_phone",
    label: "Phone",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 6,
    columnWidth: 140,
  },
  {
    columnKey: "status",
    label: "Status",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 7,
    columnWidth: 125,
  },
  {
    columnKey: "priority",
    label: "Priority",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 8,
    columnWidth: 100,
  },
  {
    columnKey: "estimated_deal_value",
    label: "Deal Value",
    dataType: "number",
    isVisible: true,
    isPinned: false,
    columnOrder: 9,
    columnWidth: 140,
  },
  {
    columnKey: "assigned_to_name",
    label: "Assigned To",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 10,
    columnWidth: 160,
  },
  {
    columnKey: "last_activity_at",
    label: "Last Activity",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 11,
    columnWidth: 170,
  },
  {
    columnKey: "next_follow_up_at",
    label: "Next Follow-up",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 12,
    columnWidth: 145,
  },
];

export default function ProspectListView({ slug }: Props) {
  const router = useRouter();
  const tableRef = useRef<HTMLElement>(null);

  /* ---------------- Dashboard state ---------------- */

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    rangeForPreset("all"),
  );
  const [quickFilters, setQuickFilters] = useState<ProspectQuickFilters>({
    status: null,
    priority: null,
    source: null,
  });
  const [followUpsOnly, setFollowUpsOnly] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  /* debounce header search */
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [dashboard, setDashboard] = useState<ProspectDashboardData | null>(
    null,
  );
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [totalRecords, setTotalRecords] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const query = new URLSearchParams({ dueBefore: endOfTodayIso() });
      if (dateRange.from) query.set("from", dateRange.from);
      if (dateRange.to) query.set("to", dateRange.to);

      const response = await fetch(
        `/api/sales/crm/prospects/dashboard?${query}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error("Unable to load dashboard.");

      setDashboard((await response.json()) as ProspectDashboardData);
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : "Unable to load dashboard.",
      );
    } finally {
      setDashboardLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ---------------- Table data ---------------- */

  const listingFilters = useMemo<ProspectListingFilters>(
    () => ({
      status: quickFilters.status,
      priority: quickFilters.priority,
      source: quickFilters.source,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      followUpDueBefore: followUpsOnly ? endOfTodayIso() : null,
    }),
    [quickFilters, dateRange.from, dateRange.to, followUpsOnly],
  );

  /* New identity whenever dashboard filters change -> DataTable reloads. */
  const fetchProspects = useCallback(
    async (params: FetchParams): Promise<FetchResponse<ProspectListRecord>> => {
      const response = await fetch("/api/sales/crm/prospects/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...params,
          /* header search is used when the table's own search is empty */
          search: params.search?.trim() ? params.search : search,
          dashboard: listingFilters,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to load prospects.");
      }

      const result =
        (await response.json()) as FetchResponse<ProspectListRecord>;
      setTotalRecords(result.totalRecords ?? 0);
      return result;
    },
    [listingFilters, search],
  );

  const columnsConfigApi = useMemo(() => {
    const readConfigs = async (key: string): Promise<ColumnConfig[]> => {
      const response = await fetch(
        `/api/table-config?moduleKey=${encodeURIComponent(key)}`,
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
    };

    return {
      get: readConfigs,

      save: async (key: string, configs: ColumnConfig[]): Promise<void> => {
        const response = await fetch("/api/table-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey: key, configs }),
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

        return readConfigs(key);
      },
    };
  }, []);

  const renderRowCell = useCallback(
    (row: ProspectListRecord, columnKey: string) =>
      renderProspectCell(row, columnKey, slug),
    [slug],
  );

  /* ---------------- Actions ---------------- */

  const scrollToTable = () =>
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const selectStatus = (status: ProspectStatus | null) => {
    setQuickFilters((current) => ({ ...current, status }));
    if (status) scrollToTable();
  };

  const clearAll = () => {
    setQuickFilters({ status: null, priority: null, source: null });
    setFollowUpsOnly(false);
    setDateRange(rangeForPreset("all"));
    setSearchInput("");
    setSearch("");
  };

  /* Active filter chips shown above the table */
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (quickFilters.status) {
    chips.push({
      key: "status",
      label: `Status: ${statusLabel(quickFilters.status)}`,
      clear: () => setQuickFilters((c) => ({ ...c, status: null })),
    });
  }
  if (quickFilters.priority) {
    chips.push({
      key: "priority",
      label: `Priority: ${quickFilters.priority}`,
      clear: () => setQuickFilters((c) => ({ ...c, priority: null })),
    });
  }
  if (quickFilters.source) {
    chips.push({
      key: "source",
      label: `Source: ${quickFilters.source}`,
      clear: () => setQuickFilters((c) => ({ ...c, source: null })),
    });
  }
  if (followUpsOnly) {
    chips.push({
      key: "followups",
      label: "Follow-ups due",
      clear: () => setFollowUpsOnly(false),
    });
  }
  if (dateRange.from || dateRange.to) {
    chips.push({
      key: "date",
      label: `Created: ${formatRangeLabel(dateRange)}`,
      clear: () => setDateRange(rangeForPreset("all")),
    });
  }
  if (search) {
    chips.push({
      key: "search",
      label: `Search: “${search}”`,
      clear: () => {
        setSearchInput("");
        setSearch("");
      },
    });
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Prospects" }]} />

      {/* HEADER */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Prospect Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Track potential customers through your sales pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:w-72 sm:flex-none">
            <Icon
              icon="tabler:search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search prospects, companies, contacts..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <FilterMenu value={quickFilters} onChange={setQuickFilters} />

          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <button
            type="button"
            onClick={() => router.push(`/${slug}/${BASE_PATH}/new`)}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900"
          >
            <Icon icon="tabler:plus" className="text-base" />
            Add Prospect
          </button>
        </div>
      </div>

      {dashboardError && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {dashboardError}
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <ProspectKpiCards
        data={dashboard}
        loading={dashboardLoading}
        activeStatus={quickFilters.status}
        onSelect={selectStatus}
      />

      {/* PIPELINE + FOLLOW-UPS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ProspectPipelineCard
            data={dashboard}
            loading={dashboardLoading}
            onSelectStatus={selectStatus}
          />
        </div>
        <div className="xl:col-span-5">
          <ProspectFollowUpsCard
            slug={slug}
            data={dashboard}
            loading={dashboardLoading}
            onViewAll={() => {
              setFollowUpsOnly(true);
              scrollToTable();
            }}
          />
        </div>
      </div>

      {/* PROSPECTS TABLE + RECENT ACTIVITY */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section
          ref={tableRef}
          className="min-w-0 scroll-mt-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <Icon icon="tabler:users" className="text-xl text-emerald-700" />
              Prospects
              {totalRecords !== null && (
                <span className="font-semibold text-slate-500">
                  ({totalRecords.toLocaleString("en-GB")})
                </span>
              )}
            </h3>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.clear}
                      title="Remove filter"
                      className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    >
                      <Icon icon="tabler:x" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {chips.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-slate-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          <DataTable<ProspectListRecord>
            moduleKey={MODULE_KEY}
            fetchApi={fetchProspects}
            columnsConfigApi={columnsConfigApi}
            renderRowCell={renderRowCell}
            enableRowSelection={true}
            rowKey="id"
          />
        </section>

        <div className="xl:col-span-4">
          <ProspectRecentActivityCard
            slug={slug}
            data={dashboard}
            loading={dashboardLoading}
          />
        </div>
      </div>
    </div>
  );
}

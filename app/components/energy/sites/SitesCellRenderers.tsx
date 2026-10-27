// app/components/energy/sites/SitesCellRenderers.tsx


import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

import type { SitesListRow } from "@/types/sites";

const displayText = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

export function getSitesCellRenderers(slug: string) {
  return {
    site_no: (row: SitesListRow) => (
      <Link
        href={`/${slug}/energy/sites/${row.id}`}
        className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
      >
        <Icon icon="lucide:zap" className="text-sm" />
        {displayText(row.site_no)}
      </Link>
    ),

    site_name: (row: SitesListRow) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {displayText(row.site_name)}
      </span>
    ),

    gsp_uk: (row: SitesListRow) => (
      <span className="text-xs">
        {displayText(row.gsp_uk)}
      </span>
    ),

    distributor_network_operator: (row: SitesListRow) => (
      <span className="text-xs">
        {displayText(row.distributor_network_operator)}
      </span>
    ),

    mpan_no: (row: SitesListRow) => (
      <span className="font-mono text-xs">
        {displayText(row.mpan_no)}
      </span>
    ),

    meter_count: (row: SitesListRow) => (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Icon icon="lucide:gauge" className="text-slate-400" />
        {row.meter_count ?? 0}
      </span>
    ),

    connection_size: (row: SitesListRow) => (
      <span className="text-xs tabular-nums">
        {displayText(row.connection_size)}
      </span>
    ),

    connection_size_approved: (row: SitesListRow) => (
      <span className="text-xs tabular-nums">
        {displayText(row.connection_size_approved)}
      </span>
    ),

    bess_brand_model: (row: SitesListRow) => (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Icon
          icon="lucide:battery-charging"
          className="text-emerald-600"
        />
        {displayText(row.bess_brand_model)}
      </span>
    ),

    bess_unit_count: (row: SitesListRow) => (
      <span className="text-xs tabular-nums">
        {row.bess_unit_count ?? 0}
      </span>
    ),

    bess_function_trading: (row: SitesListRow) => (
      <span className="text-xs text-slate-600 dark:text-slate-300">
        {displayText(row.bess_function_trading)}
      </span>
    ),

    segments: (row: SitesListRow) => (
      <span className="text-xs">
        {displayText(row.segments)}
      </span>
    ),

    status: (row: SitesListRow) => {
      const isActive = Number(row.status) === 1;

      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },

    actions: (row: SitesListRow) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/${slug}/energy/sites/${row.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Icon icon="lucide:eye" />
          View
        </Link>
      </div>
    ),
  };
}


/* import React from "react";
import Link from "next/link";
import { SitesListRow } from "@/types/sites";

export function getSitesCellRenderers(slug: string) {
  return {
    site_no: (row: SitesListRow) => (
      <Link
        href={`/${slug}/energy/sites/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.site_no || "-"}
      </Link>
    ),
    distributor_network_operator: (row: SitesListRow) => row.distributor_network_operator || "-",
    mpan_no: (row: SitesListRow) => row.mpan_no || "-",
    connection_size: (row: SitesListRow) => row.connection_size || "-",
    connection_size_approved: (row: SitesListRow) => row.connection_size_approved || "-",
    bess_brand_model: (row: SitesListRow) => row.bess_brand_model || "-",
    segments: (row: SitesListRow) => row.segments || "-",
    gsp_uk: (row: SitesListRow) => row.gsp_uk || "-",
    bess_function_trading: (row: SitesListRow) => {
      const isStatusActive = row.status === 1 || row.bess_function_trading === "Active";
      return (
        <span
          className={
            isStatusActive
              ? "text-emerald-600 dark:text-emerald-400 font-medium"
              : "text-rose-500 dark:text-rose-400 font-medium"
          }
        >
          {row.bess_function_trading || "-"}
        </span>
      );
    },
    actions: (row: SitesListRow) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/energy/sites/${row.id}`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
} */
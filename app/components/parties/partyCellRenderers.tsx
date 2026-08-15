// app/components/parties/partyCellRenderers.tsx

import React from "react";
import Link from "next/link";

export type PartyRecord = {
  id: string;
  name: string;
  crm_code?: string;
  srm_code?: string;
  customer_code?: string;
  supplier_code?: string;
  is_crm_lead?: boolean;
  is_srm_vendor?: boolean;
  is_customer?: boolean;
  is_supplier?: boolean;
  email?: string;
  phone?: string;
  primaryc_name?: string;
  primaryc_email?: string;
  primaryc_phone?: string;
  primary_city?: string;
  county?: string;
  currency?: string;
  status?: string;
};

type RoleFlag = "is_crm_lead" | "is_srm_vendor" | "is_customer" | "is_supplier";

export function getPartyCellRenderers(
  slug: string,
  roleFlag: RoleFlag,
  basePath: string,
) {
  const resolveDisplayCode = (row: PartyRecord) => {
    if (roleFlag === "is_crm_lead") return row.crm_code || "PENDING";
    if (roleFlag === "is_srm_vendor") return row.srm_code || "PENDING";
    if (roleFlag === "is_customer") return row.customer_code || "UNASSIGNED";
    if (roleFlag === "is_supplier") return row.supplier_code || "UNASSIGNED";
    return "N/A";
  };

  return {
    code: (row: PartyRecord) => (
      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
        {resolveDisplayCode(row)}
      </span>
    ),

    name: (row: PartyRecord) => (
      <Link
        href={`/${slug}/${basePath}/${row.id}`}
        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.name}
      </Link>
    ),

    primary_city: (row: PartyRecord) => row.primary_city || "—",
    county: (row: PartyRecord) => row.county || "—",
    primaryc_name: (row: PartyRecord) => row.primaryc_name || "—",
    primaryc_email: (row: PartyRecord) =>
      row.primaryc_email || row.email || "—",
    primaryc_phone: (row: PartyRecord) =>
      row.primaryc_phone || row.phone || "—",
    currency: (row: PartyRecord) => row.currency || "—",

    roles: (row: PartyRecord) => (
      <div className="flex flex-wrap gap-1">
        {row.is_crm_lead && (
          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            CRM
          </span>
        )}
        {row.is_srm_vendor && (
          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            SRM
          </span>
        )}
        {row.is_customer && (
          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Cust
          </span>
        )}
        {row.is_supplier && (
          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            Vend
          </span>
        )}
      </div>
    ),

    status: (row: PartyRecord) => (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block capitalize ${
          row.status?.toLowerCase() === "active"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.status || "Active"}
      </span>
    ),

    actions: (row: PartyRecord) => (
      <div className="flex items-center gap-1.5">
        {/* <Link
          href={`/${slug}/${basePath}/${row.id}`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          View
        </Link> */}
        <Link
          href={`/${slug}/${basePath}/${row.id}/edit`}
          className="rounded border border-emerald-600 px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
}

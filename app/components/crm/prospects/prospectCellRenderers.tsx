// app/components/crm/prospects/prospectCellRenderers.tsx

import Link from "next/link";
import type { ReactNode } from "react";

import type { ProspectListRecord } from "@/types/prospect";

const statusStyles: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Contacted: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  Interested:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Qualified: "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  Proposal:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  Negotiation:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Converted:
    "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  Lost: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const priorityStyles: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  High: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const datePart = value.slice(0, 10);
  const parts = datePart.split("-");

  if (parts.length !== 3) return "—";

  const [year, month, day] = parts;

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function formatAmount(
  value: number | string,
  currencyCode: string | null,
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}

export function renderProspectCell(
  row: ProspectListRecord,
  columnKey: string,
  slug: string,
): ReactNode {
  switch (columnKey) {
    case "prospect_no":
      return (
        <Link
          href={`/${slug}/sales/prospects/${row.id}/edit`}
          className="font-mono text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-400"
        >
          {row.prospect_no}
        </Link>
      );

    case "company_name":
      return (
        <div className="min-w-0">
          <Link
            href={`/${slug}/sales/prospects/${row.id}/edit`}
            className="block truncate font-medium text-slate-900 hover:text-emerald-700 hover:underline dark:text-slate-100 dark:hover:text-emerald-400"
          >
            {row.company_name}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {row.prospect_no}
          </p>
        </div>
      );

    case "primary_contact_name":
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {row.primary_contact_name || "—"}
        </span>
      );

    case "primary_email":
      return (
        <span className="text-slate-600 dark:text-slate-400">
          {row.primary_email || "—"}
        </span>
      );

    case "primary_phone":
      return (
        <span className="text-slate-600 dark:text-slate-400">
          {row.primary_phone || "—"}
        </span>
      );

    case "status":
      return (
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
            statusStyles[row.status] || statusStyles.New
          }`}
        >
          {row.status}
        </span>
      );

    case "priority":
      return (
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
            priorityStyles[row.priority] || priorityStyles.Medium
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {row.priority}
        </span>
      );

    case "estimated_deal_value":
      return (
        <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
          {formatAmount(row.estimated_deal_value, row.currency_code)}
        </span>
      );

    case "assigned_to_name":
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {row.assigned_to_name || "—"}
        </span>
      );

    case "next_follow_up_at":
      return (
        <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">
          {formatDate(row.next_follow_up_at)}
        </span>
      );

    default:
      return "—";
  }
}

/* import type { ProspectListRecord } from "@/types/prospect";

const statusStyles: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  Contacted: "bg-blue-50 text-blue-700",
  Interested: "bg-emerald-100 text-emerald-800",
  Qualified: "bg-teal-50 text-teal-800",
  Proposal: "bg-violet-50 text-violet-700",
  Negotiation: "bg-amber-50 text-amber-800",
  Converted: "bg-green-100 text-green-800",
  Lost: "bg-rose-50 text-rose-700",
};

const priorityStyles: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-amber-50 text-amber-700",
  High: "bg-orange-50 text-orange-700",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 10).split("-").reverse().join("/");
}

function formatAmount(
  value: number | string,
  currencyCode: string | null,
): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return `${currencyCode ? `${currencyCode} ` : ""}${amount.toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;
}

export function renderProspectCell(
  row: ProspectListRecord,
  columnKey: string,
): React.ReactNode {
  switch (columnKey) {
    case "prospect_no":
      return (
        <span className="font-semibold text-emerald-800">
          {row.prospect_no}
        </span>
      );

    case "company_name":
      return (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {row.company_name}
          </p>
          <p className="text-xs text-slate-500">{row.prospect_no}</p>
        </div>
      );

    case "primary_contact_name":
      return (
        <span className="text-slate-700">
          {row.primary_contact_name || "—"}
        </span>
      );



    case "primary_email":
      return <span className="text-slate-600">{row.primary_email || "—"}</span>;

    case "primary_phone":
      return <span className="text-slate-600">{row.primary_phone || "—"}</span>;

    case "status":
      return (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            statusStyles[row.status] || statusStyles.New
          }`}
        >
          {row.status}
        </span>
      );

    case "priority":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            priorityStyles[row.priority] || priorityStyles.Medium
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {row.priority}
        </span>
      );

    case "estimated_deal_value":
      return (
        <span className="font-medium tabular-nums text-slate-800">
          {formatAmount(row.estimated_deal_value, row.currency_code)}
        </span>
      );

    case "assigned_to_name":
      return (
        <span className="text-slate-700">{row.assigned_to_name || "—"}</span>
      );

    case "next_follow_up_at":
      return (
        <span className="text-slate-600">
          {formatDate(row.next_follow_up_at)}
        </span>
      );

    default:
      return "—";
  }
} */

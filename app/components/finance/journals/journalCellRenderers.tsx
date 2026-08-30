// app/components/finance/journals/journalCellRenderers.tsx
import React from "react";
import Link from "next/link";

export interface JournalRecord {
  id: string;
  entry_no: string | number;
  posted_at?: string | null;
  entry_date: string;
  reference?: string | null;
  posted_by?: string | null;
  description?: string | null;
  is_posted: boolean;
}

// Optimized static string date formatting
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  return dateStr.length >= 10
    ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
    : dateStr;
};

export function getJournalCellRenderers(slug: string, createPath: string) {
  const basePath = createPath.replace("/create", "");

  return {
    entry_no: (row: JournalRecord) => (
      <Link
        href={`${basePath}/${row.id}`}
        className="text-blue-600 dark:text-blue-400 hover:underline font-mono "
      >
        #{row.entry_no}
      </Link>
    ),

    posted_at: (row: JournalRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {row.posted_at ? formatDate(row.posted_at) : "—"}
      </span>
    ),

    entry_date: (row: JournalRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {formatDate(row.entry_date)}
      </span>
    ),

    posted_by: (row: JournalRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {row.posted_by}
      </span>
    ),

    // total_debit: (row: JournalRecord) => (
    //   <span className="font-mono text-right block font-semibold text-slate-700 dark:text-slate-200">
    //     {Number(row.total_debit).toLocaleString(undefined, {
    //       minimumFractionDigits: 2,
    //       maximumFractionDigits: 2,
    //     })}{" "}
    //     <span className="text-[10px] text-slate-400">{row.currency_code}</span>
    //   </span>
    // ),

    // total_credit: (row: JournalRecord) => (
    //   <span className="font-mono text-right block font-semibold text-slate-700 dark:text-slate-200">
    //     {Number(row.total_credit).toLocaleString(undefined, {
    //       minimumFractionDigits: 2,
    //       maximumFractionDigits: 2,
    //     })}{" "}
    //     <span className="text-[10px] text-slate-400">{row.currency_code}</span>
    //   </span>
    // ),

    is_posted: (row: JournalRecord) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs  ${
          row.is_posted
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-800/20"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-800/20"
        }`}
      >
        {row.is_posted ? "Posted" : "Draft"}
      </span>
    ),
  };
}
// app/components/finance/posted-entries/postedEntriesCellRenderers.tsx

import React from "react";
import { format } from "date-fns";
import { PostedLedgerEntry } from "@/types/posted-ledger";

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return "—";
  }
};

const formatAmount = (val?: number | string | null): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num) || num === 0) return "";
  
  const formatted = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className="font-mono text-right block">
      {num < 0 ? `(${formatted})` : formatted}
    </span>
  );
};

export function getPostedEntriesCellRenderers() {
  return {
    posting_date: (row: PostedLedgerEntry) => formatDate(row.posting_date),
    document_type: (row: PostedLedgerEntry) => row.document_type || "—",
    document_number: (row: PostedLedgerEntry) => (
      <span className="font-semibold">{row.document_number || "—"}</span>
    ),
    gl_no: (row: PostedLedgerEntry) => (
      <span className="font-semibold">{row.gl_no}</span>
    ),
    name: (row: PostedLedgerEntry) => (
      <span className="font-sans font-medium">{row.name}</span>
    ),
    source_no: (row: PostedLedgerEntry) => row.source_no || "-",
    currency_code: (row: PostedLedgerEntry) => (
      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        {row.currency_code || "LCY"}
      </span>
    ),
    currency_factor: (row: PostedLedgerEntry) => 
      row.currency_factor ? Number(row.currency_factor).toFixed(4) : "1.0000",

    // Foreign Currency (FCY)
    debit: (row: PostedLedgerEntry) => formatAmount(row.debit),
    credit: (row: PostedLedgerEntry) => formatAmount(row.credit),
    amount: (row: PostedLedgerEntry) => formatAmount(row.amount),

    // Local Currency (LCY)
    debit_lcy: (row: PostedLedgerEntry) => formatAmount(row.debit_lcy),
    credit_lcy: (row: PostedLedgerEntry) => formatAmount(row.credit_lcy),
    amount_lcy: (row: PostedLedgerEntry) => formatAmount(row.amount_lcy),

    user_id: (row: PostedLedgerEntry) => (
      <span className="font-sans">{row.user_id || "-"}</span>
    ),
    entry_no: (row: PostedLedgerEntry) => row.entry_no,
  };
}
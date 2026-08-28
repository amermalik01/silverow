// app/components/finance/posted-entries/postedEntriesCellRenderers.tsx

import React from "react";
// import { format } from "date-fns";
import { PostedLedgerEntry } from "@/types/posted-ledger";

// Optimized static string date formatting
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  return dateStr.length >= 10
    ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
    : dateStr;
};

/* const formatAmount = (val?: number | string | null): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : Number(val);
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
}; */
const formatAmount = (
  val?: number | string | null,
  hideZero: boolean = true,
): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";

  // Parse strings with commas or spaces safely
  const cleanedVal =
    typeof val === "string" ? val.replace(/,/g, "").trim() : val;
  const num =
    typeof cleanedVal === "number" ? cleanedVal : parseFloat(cleanedVal);

  if (isNaN(num)) return "—";
  if (hideZero && num === 0) return "";

  const formatted = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isNegative = num < 0;

  return (
    <span
      className={`font-mono text-right block ${
        isNegative ? "text-rose-600 dark:text-rose-400 font-semibold" : ""
      }`}
    >
      {isNegative ? `(${formatted})` : formatted}
    </span>
  );
};

export const postedEntriesCellRenderers: Record<
  string,
  (row: PostedLedgerEntry) => React.ReactNode
> = {
  posting_date: (row) => formatDate(row.posting_date),
  document_type: (row) => row.document_type || "—",
  document_number: (row) => (
    <span className="font-semibold">{row.document_number || "—"}</span>
  ),
  gl_no: (row) => <span className="font-semibold">{row.gl_no}</span>,
  name: (row) => <span className="font-sans font-medium">{row.name}</span>,
  source_no: (row) => row.source_no || "-",

  // Debit and Credit suppress 0 values for clean presentation
  debit: (row) => formatAmount(row.debit_fcy, true),
  credit: (row) => formatAmount(row.credit_fcy, true),
  debit_lcy: (row) => formatAmount(row.debit_lcy, true),
  credit_lcy: (row) => formatAmount(row.credit_lcy, true),

  // Net amounts show all positive and negative balances (do not hide 0)
  amount: (row) => formatAmount(row.net_amount_fcy, false),
  amount_lcy: (row) => formatAmount(row.net_amount_lcy, false),

  user_id: (row) => <span className="font-sans">{row.user_id || "-"}</span>,
  entry_no: (row) => row.entry_no,
};

/* const formatDate = (dateStr?: string | null): string => {
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
}; */

/* export function getPostedEntriesCellRenderers() {
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
    // currency_code: (row: PostedLedgerEntry) => (
    //   <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
    //     {row.currency_code || "LCY"}
    //   </span>
    // ),
    // currency_factor: (row: PostedLedgerEntry) => 
    //   row.currency_factor ? Number(row.currency_factor).toFixed(4) : "1.0000",

    // Foreign Currency (FCY)
    debit: (row: PostedLedgerEntry) => formatAmount(row.debit_fcy),
    credit: (row: PostedLedgerEntry) => formatAmount(row.credit_fcy),
    amount: (row: PostedLedgerEntry) => formatAmount(row.net_amount_fcy),

    // Local Currency (LCY)
    debit_lcy: (row: PostedLedgerEntry) => formatAmount(row.debit_lcy),
    credit_lcy: (row: PostedLedgerEntry) => formatAmount(row.credit_lcy),
    amount_lcy: (row: PostedLedgerEntry) => formatAmount(row.net_amount_lcy),

    user_id: (row: PostedLedgerEntry) => (
      <span className="font-sans">{row.user_id || "-"}</span>
    ),
    entry_no: (row: PostedLedgerEntry) => row.entry_no,
  };
} */

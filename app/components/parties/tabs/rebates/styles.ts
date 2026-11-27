// app/components/parties/tabs/rebates/styles.ts

import { format, isValid, parseISO } from "date-fns";
import type { RebateStatus } from "@/types/rebate";

/* Shared look for the rebate tab — matches the Finance / Price List tabs. */

const inputBase =
  "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

export const inputClass = `${inputBase} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500 disabled:bg-slate-100/80 disabled:dark:bg-slate-900/70 disabled:border-slate-200 disabled:dark:border-slate-800 disabled:text-black disabled:dark:text-slate-300 disabled:cursor-not-allowed`;

export const inputErrorClass = `${inputBase} border-red-500 bg-red-50/20 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500`;

export const getInputClass = (hasError?: boolean) =>
  hasError ? inputErrorClass : inputClass;

export const labelClass =
  "text-sm font-medium text-black dark:text-slate-400";

export const errorTextClass = "text-red-500 text-[11px] mt-0.5";

export const cardClass =
  "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] p-4 shadow-2xs transition-colors";

/** @deprecated kept for older imports — use cardClass */
export const panelClass = cardClass;

export const sectionHeaderClass =
  "flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100";

export const sectionIconClass = "text-emerald-800 dark:text-emerald-400 text-2xl";

export const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const tableHeadRowClass =
  "border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-black dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40";

export const fieldRowClass =
  "grid grid-cols-12 gap-x-3 gap-y-1 items-center max-w-[520px]";
export const fieldLabelColClass = "col-span-4 text-sm font-medium text-black dark:text-slate-400";
export const fieldInputColClass = "col-span-8";

export const STATUS_BADGES: Record<RebateStatus, string> = {
  DRAFT:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  ACTIVE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  SUSPENDED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  EXPIRED:
    "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  CANCELLED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
};

export const statusBadgeClass = (status?: string) =>
  `inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
    STATUS_BADGES[(status as RebateStatus) || "DRAFT"] || STATUS_BADGES.DRAFT
  }`;

export const statusLabel = (status?: string) => {
  const value = status || "DRAFT";
  return value.charAt(0) + value.slice(1).toLowerCase();
};

export const SCOPE_LABELS: Record<string, string> = {
  UNIVERSAL: "All Items",
  CATEGORY: "Categories",
  ITEM: "Specific Items",
};

export const SCOPE_ICONS: Record<string, string> = {
  UNIVERSAL: "tabler:world",
  CATEGORY: "tabler:category",
  ITEM: "tabler:box",
};

export const formatRebateDate = (value?: string | null) => {
  if (!value) return "—";
  const date = parseISO(String(value));
  return isValid(date) ? format(date, "dd/MM/yyyy") : String(value);
};

export const formatRebateNumber = (value: unknown, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatRebateValue = (
  value: unknown,
  priceType?: string,
  calculationMethod?: string,
) => {
  if (calculationMethod === "TIERED") return "Tiered";
  return priceType === "PERCENTAGE"
    ? `${formatRebateNumber(value)}%`
    : formatRebateNumber(value);
};

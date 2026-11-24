// app/components/crm/prospects/dashboard/dashboardUtils.ts

import type {
  ProspectActivityType,
  ProspectPriority,
  ProspectStatus,
} from "@/lib/validations/prospect.schema";

/* ============================================================
   DATE RANGE
============================================================ */

export type DateRangePreset =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"
  | "custom";

export type DateRange = {
  preset: DateRangePreset;
  /** yyyy-MM-dd, inclusive; null = open */
  from: string | null;
  to: string | null;
};

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "thisYear", label: "This year" },
];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function rangeForPreset(preset: DateRangePreset): DateRange {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const make = (from: Date, to: Date): DateRange => ({
    preset,
    from: toDateKey(from),
    to: toDateKey(to),
  });

  switch (preset) {
    case "today":
      return make(today, today);
    case "last7":
      return make(new Date(y, m, today.getDate() - 6), today);
    case "last30":
      return make(new Date(y, m, today.getDate() - 29), today);
    case "thisMonth":
      return make(new Date(y, m, 1), new Date(y, m + 1, 0));
    case "lastMonth":
      return make(new Date(y, m - 1, 1), new Date(y, m, 0));
    case "thisQuarter": {
      const q = Math.floor(m / 3) * 3;
      return make(new Date(y, q, 1), new Date(y, q + 3, 0));
    }
    case "thisYear":
      return make(new Date(y, 0, 1), new Date(y, 11, 31));
    default:
      return { preset: "all", from: null, to: null };
  }
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatRangeLabel(range: DateRange): string {
  if (!range.from && !range.to) return "All time";

  const fmt = (key: string) =>
    parseDateKey(key).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (range.from && range.to) {
    return range.from === range.to
      ? fmt(range.from)
      : `${fmt(range.from)} – ${fmt(range.to)}`;
  }

  return range.from ? `From ${fmt(range.from)}` : `Until ${fmt(range.to!)}`;
}

/** End of the user's local day, as an ISO instant (for "due today"). */
export function endOfTodayIso(): string {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/* ============================================================
   DISPLAY
============================================================ */

export const FUNNEL_STATUSES: ProspectStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Lost",
];

export function statusLabel(status: ProspectStatus | string): string {
  return status === "Proposal" ? "Proposal Sent" : status;
}

/** Funnel / legend colours: greens getting lighter, Lost in red. */
export const STATUS_COLORS: Record<string, { bar: string; dot: string; text: string }> = {
  New: { bar: "bg-emerald-800", dot: "bg-emerald-800", text: "text-white" },
  Contacted: { bar: "bg-emerald-700", dot: "bg-emerald-700", text: "text-white" },
  Interested: { bar: "bg-emerald-600", dot: "bg-emerald-600", text: "text-white" },
  Qualified: { bar: "bg-emerald-500", dot: "bg-emerald-500", text: "text-white" },
  Proposal: { bar: "bg-emerald-400", dot: "bg-emerald-400", text: "text-white" },
  Negotiation: { bar: "bg-emerald-300", dot: "bg-emerald-300", text: "text-emerald-950" },
  Lost: { bar: "bg-rose-400", dot: "bg-rose-400", text: "text-white" },
};

export const STATUS_BADGE: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  Contacted: "bg-emerald-50 text-emerald-700",
  Interested: "bg-emerald-100 text-emerald-800",
  Qualified: "bg-teal-50 text-teal-800",
  Proposal: "bg-emerald-100 text-emerald-800",
  Negotiation: "bg-emerald-100 text-emerald-800",
  Converted: "bg-green-100 text-green-800",
  Lost: "bg-rose-50 text-rose-700",
};

export const PRIORITY_BADGE: Record<ProspectPriority, string> = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-emerald-50 text-emerald-700",
};

export const ACTIVITY_ICON: Record<ProspectActivityType, string> = {
  Call: "tabler:phone",
  Email: "tabler:mail",
  Meeting: "tabler:calendar-event",
  Task: "tabler:checkbox",
  Note: "tabler:notes",
  Other: "tabler:activity",
};

export function activityTitle(type: ProspectActivityType, company: string): string {
  switch (type) {
    case "Call":
      return `Call with ${company}`;
    case "Email":
      return `Email to ${company}`;
    case "Meeting":
      return `Meeting with ${company}`;
    case "Note":
      return `Note added for ${company}`;
    case "Task":
      return `Task for ${company}`;
    default:
      return `Activity for ${company}`;
  }
}

/** "10:24", "Yesterday, 16:15" or "28 Jan 2025, 09:47". */
export function formatRelativeDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const today = startOfToday();
  const yesterday = new Date(today.getTime() - 86_400_000);

  if (date >= today) return time;
  if (date >= yesterday) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${time}`;
}

export function initials(name?: string | null): string {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** % change; null when there is no previous period to compare. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

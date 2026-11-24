// app/components/crm/prospects/dashboard/ProspectKpiCards.tsx

"use client";

import { Icon } from "@iconify/react";
import type {
  ProspectDashboardData,
} from "@/types/prospect";
import type {
  ProspectStatus,
} from "@/lib/validations/prospect.schema";
import { percentChange } from "./dashboardUtils";

type Props = {
  data: ProspectDashboardData | null;
  loading: boolean;
  /** Currently selected status filter (null = all). */
  activeStatus: ProspectStatus | null;
  onSelect: (status: ProspectStatus | null) => void;
};

const CARDS: {
  key: ProspectStatus | "Total";
  label: string;
  icon: string;
  iconClass: string;
}[] = [
  { key: "Total", label: "Total Prospects", icon: "tabler:users", iconClass: "bg-emerald-50 text-emerald-700" },
  { key: "New", label: "New", icon: "tabler:circle-plus", iconClass: "bg-emerald-50 text-emerald-700" },
  { key: "Contacted", label: "Contacted", icon: "tabler:mail", iconClass: "bg-emerald-50 text-emerald-700" },
  { key: "Proposal", label: "Proposal Sent", icon: "tabler:file-text", iconClass: "bg-emerald-50 text-emerald-700" },
  { key: "Negotiation", label: "Negotiation", icon: "tabler:heart-handshake", iconClass: "bg-emerald-50 text-emerald-700" },
  { key: "Lost", label: "Lost", icon: "tabler:circle-x", iconClass: "bg-rose-50 text-rose-600" },
];

export default function ProspectKpiCards({
  data,
  loading,
  activeStatus,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {CARDS.map((card) => {
        const current =
          card.key === "Total"
            ? (data?.current.total ?? 0)
            : (data?.current.byStatus[card.key] ?? 0);

        const previous = data?.previous
          ? card.key === "Total"
            ? data.previous.total
            : (data.previous.byStatus[card.key] ?? 0)
          : null;

        const change = percentChange(current, previous);
        const isActive =
          card.key === "Total" ? activeStatus === null : activeStatus === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key === "Total" ? null : card.key)}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow dark:bg-slate-900 ${
              isActive
                ? "border-emerald-600 ring-1 ring-emerald-600"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${card.iconClass}`}
              >
                <Icon icon={card.icon} className="text-lg" />
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {card.label}
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {loading && !data ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              ) : (
                current.toLocaleString("en-GB")
              )}
            </p>

            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {change === null ? (
                <span>
                  {data?.previous ? "No data in previous period" : "All time"}
                </span>
              ) : (
                <>
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      change > 0
                        ? "text-emerald-700"
                        : change < 0
                          ? "text-rose-600"
                          : "text-slate-500"
                    }`}
                  >
                    <Icon
                      icon={
                        change > 0
                          ? "tabler:triangle-filled"
                          : change < 0
                            ? "tabler:triangle-inverted-filled"
                            : "tabler:minus"
                      }
                      className="h-2.5 w-2.5"
                    />
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                  <span>vs. previous period</span>
                </>
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

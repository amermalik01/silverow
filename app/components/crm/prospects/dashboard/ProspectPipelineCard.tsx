// app/components/crm/prospects/dashboard/ProspectPipelineCard.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type {
  ProspectDashboardData,
} from "@/types/prospect";
import type {
  ProspectStatus,
} from "@/lib/validations/prospect.schema";
import { FUNNEL_STATUSES, STATUS_COLORS, statusLabel } from "./dashboardUtils";

type Props = {
  data: ProspectDashboardData | null;
  loading: boolean;
  onSelectStatus: (status: ProspectStatus) => void;
};

export default function ProspectPipelineCard({
  data,
  loading,
  onSelectStatus,
}: Props) {
  const [view, setView] = useState<"funnel" | "pipeline">("funnel");

  const rows = FUNNEL_STATUSES.map((status) => ({
    status,
    count: data?.current.byStatus[status] ?? 0,
  }));

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(1, ...rows.map((row) => row.count));

  const pct = (count: number) =>
    total ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Icon icon="tabler:calendar-stats" className="text-xl text-emerald-700" />
          Pipeline Overview
          <span
            title="Prospects created in the selected period, by current status. Converted prospects are excluded."
            className="cursor-help text-slate-400"
          >
            <Icon icon="tabler:info-circle" className="text-base" />
          </span>
        </h3>

        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold dark:border-slate-700">
          {(["funnel", "pipeline"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-md px-3 py-1 capitalize transition ${
                view === option
                  ? "bg-emerald-800 text-white"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="h-64 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800/50" />
      ) : total === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <Icon icon="tabler:filter-off" className="text-3xl text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            No prospects in this period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Visual */}
          {view === "funnel" ? (
            <div className="flex flex-col items-center gap-1">
              {rows.map((row, index) => {
                /* Fixed funnel shape; numbers carry the data. */
                const width = 100 - index * (60 / (rows.length - 1));
                const colors = STATUS_COLORS[row.status];

                return (
                  <button
                    key={row.status}
                    type="button"
                    onClick={() => onSelectStatus(row.status)}
                    title={`${statusLabel(row.status)}: ${row.count}`}
                    style={{
                      width: `${width}%`,
                      clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)",
                    }}
                    className={`flex h-8 items-center justify-center text-sm font-bold tabular-nums transition hover:brightness-110 ${colors.bar} ${colors.text}`}
                  >
                    {row.count.toLocaleString("en-GB")}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const colors = STATUS_COLORS[row.status];
                return (
                  <button
                    key={row.status}
                    type="button"
                    onClick={() => onSelectStatus(row.status)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="w-24 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400">
                      {statusLabel(row.status)}
                    </span>
                    <span className="h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <span
                        className={`block h-full rounded ${colors.bar} transition-all`}
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {row.count.toLocaleString("en-GB")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li key={row.status}>
                <button
                  type="button"
                  onClick={() => onSelectStatus(row.status)}
                  className="flex w-full items-center gap-2.5 rounded px-1 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[row.status].dot}`}
                  />
                  <span className="flex-1 font-medium text-slate-800 dark:text-slate-200">
                    {statusLabel(row.status)}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {row.count.toLocaleString("en-GB")}
                  </span>
                  <span className="w-14 text-right text-xs tabular-nums text-slate-500">
                    ({pct(row.count)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

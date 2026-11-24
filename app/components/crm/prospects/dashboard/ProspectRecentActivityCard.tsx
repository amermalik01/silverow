// app/components/crm/prospects/dashboard/ProspectRecentActivityCard.tsx

"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ProspectDashboardData } from "@/types/prospect";
import {
  ACTIVITY_ICON,
  activityTitle,
  formatRelativeDateTime,
} from "./dashboardUtils";

type Props = {
  slug: string;
  data: ProspectDashboardData | null;
  loading: boolean;
};

export default function ProspectRecentActivityCard({
  slug,
  data,
  loading,
}: Props) {
  const rows = data?.recentActivity ?? [];

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Icon icon="tabler:activity" className="text-xl text-emerald-700" />
        Recent Activity
      </h3>

      {loading && !data ? (
        <div className="h-72 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800/50" />
      ) : rows.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <Icon icon="tabler:activity" className="text-3xl text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No activity logged yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute bottom-4 left-[17px] top-4 w-px bg-emerald-200 dark:bg-emerald-900" />

          <ul>
            {rows.map((activity) => (
              <li
                key={activity.id}
                className="relative flex gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
              >
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-4 ring-white dark:bg-emerald-950 dark:text-emerald-400 dark:ring-slate-900">
                  <Icon
                    icon={ACTIVITY_ICON[activity.activity_type] ?? "tabler:activity"}
                    className="text-lg"
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/${slug}/sales/prospects/${activity.prospect_id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-emerald-700 hover:underline dark:text-slate-100"
                    >
                      {activityTitle(activity.activity_type, activity.company_name)}
                    </Link>
                    <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
                      {formatRelativeDateTime(activity.activity_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                    {activity.description || activity.subject}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

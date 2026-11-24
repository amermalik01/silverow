// app/components/crm/prospects/dashboard/ProspectFollowUpsCard.tsx

"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ProspectDashboardData } from "@/types/prospect";
import { PRIORITY_BADGE, startOfToday } from "./dashboardUtils";

type Props = {
  slug: string;
  data: ProspectDashboardData | null;
  loading: boolean;
  onViewAll: () => void;
};

function formatDue(value: string): { text: string; overdue: boolean } {
  const date = new Date(value);
  const overdue = date < startOfToday();

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!overdue) return { text: time, overdue };

  return {
    text: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    overdue,
  };
}

export default function ProspectFollowUpsCard({
  slug,
  data,
  loading,
  onViewAll,
}: Props) {
  const rows = data?.followUps ?? [];

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Icon icon="tabler:calendar-due" className="text-xl text-emerald-700" />
          Follow-ups Due
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
        >
          View All <Icon icon="tabler:arrow-right" />
        </button>
      </div>

      {loading && !data ? (
        <div className="h-56 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800/50" />
      ) : rows.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <Icon icon="tabler:calendar-check" className="text-3xl text-emerald-300" />
          <p className="mt-2 text-sm text-slate-500">No follow-ups due today.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-2">Prospect</th>
                <th className="py-2 pr-2">Company</th>
                <th className="py-2 pr-2">Due</th>
                <th className="py-2">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => {
                const due = formatDue(row.next_follow_up_at);
                return (
                  <tr key={row.id}>
                    <td className="py-2 pr-2">
                      <Link
                        href={`/${slug}/sales/prospects/${row.id}`}
                        className="font-semibold text-emerald-800 hover:underline dark:text-emerald-400"
                      >
                        {row.contact_name || row.prospect_no}
                      </Link>
                    </td>
                    <td className="max-w-[140px] truncate py-2 pr-2 text-slate-700 dark:text-slate-300">
                      {row.company_name}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2 pr-2 tabular-nums ${
                        due.overdue ? "font-semibold text-rose-600" : "text-slate-700 dark:text-slate-300"
                      }`}
                      title={due.overdue ? "Overdue" : "Due today"}
                    >
                      {due.overdue && (
                        <Icon icon="tabler:alert-circle" className="mr-1 inline h-3.5 w-3.5" />
                      )}
                      {due.text}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[row.priority]}`}
                      >
                        {row.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

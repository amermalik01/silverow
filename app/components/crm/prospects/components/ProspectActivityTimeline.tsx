// app/components/crm/prospects/components/ProspectActivityTimeline.tsx

"use client";

import { useEffect, useState } from "react";
import type { ProspectActivity } from "@/types/prospect";
import { Icon } from "@iconify/react";

type Props = {
  prospectId: string;
  initialActivities: ProspectActivity[];
  onAddActivity: () => void;
  onRefresh: () => Promise<void>;
  readOnly?: boolean;
};

const activityIcons: Record<string, string> = {
  Email: "arcticons:huawei-email",
  Call: "doodle-icons:call",
  Meeting: "andrsrxn:calendar-clock",
  Task: "carbon:task",
  Note: "andrsrxn:notes",
  Other: "•",
};

function formatActivityDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProspectActivityTimeline({
  prospectId,
  initialActivities,
  onAddActivity,
  onRefresh,
  readOnly = false,
}: Props) {
  const [activities, setActivities] = useState(initialActivities);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  const refreshActivities = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/sales/crm/prospects/${prospectId}/activities`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to load activities.");
      }

      const result: unknown = await response.json();

      if (Array.isArray(result)) {
        setActivities(result as ProspectActivity[]);
      } else if (
        typeof result === "object" &&
        result !== null &&
        "data" in result &&
        Array.isArray(result.data)
      ) {
        setActivities(result.data as ProspectActivity[]);
      }

      await onRefresh();
    } catch (error) {
      console.error("Refresh activities error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void refreshActivities()}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline disabled:opacity-50 dark:text-emerald-400"
        >
          <Icon
            icon="lucide:refresh-cw"
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        {!readOnly && activities.length > 0 && (
          <button
            type="button"
            onClick={onAddActivity}
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Log Activity
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No activities yet
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Log a call, email or meeting to start the timeline.
          </p>

          {!readOnly && (
            <button
              type="button"
              onClick={onAddActivity}
              className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
            >
              Log Activity
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute bottom-4 left-[11px] top-3 w-px bg-emerald-200 dark:bg-emerald-900" />

          <div className="h-90 space-y-0 overflow-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="relative flex gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800"
              >
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-800 ring-4 ring-white dark:bg-emerald-950 dark:text-emerald-400 dark:ring-[#11161D]">
                  <Icon
                    icon={activityIcons[activity.activity_type] || "•"}
                    className="text-lg"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {activity.subject}
                    </h4>

                    <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatActivityDate(activity.activity_at)}
                    </span>
                  </div>

                  {activity.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {activity.description}
                    </p>
                  )}

                  {activity.outcome && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Outcome: {activity.outcome}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

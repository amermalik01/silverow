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
};

const activityIcons: Record<string, string> = {
  Email: "✉",
  Call: "☎",
  Meeting: "▣",
  Task: "✓",
  Note: "▤",
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
}: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [activeTab, setActiveTab] = useState<
    "activity" | "notes" | "attachments"
  >("activity");
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
      if (!response.ok) throw new Error("Unable to load activities.");

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200">
        {(
          [
            ["activity", "Activity", "bytesize:activity"],
            ["notes", "Notes", "arcticons:google-docs-alt"],
            ["attachments", "Attachments", "clarity:attachment-line"],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 border-b-2 px-5 py-4 text-lg font-bold ${
              activeTab === key
                ? "border-emerald-800 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {/* <span>{icon}</span> */}
            <Icon icon={icon} className="text-emerald-800" />
            {label}
          </button>
        ))}
        {activeTab === "activity" && (
          <button
            type="button"
            onClick={onAddActivity}
            className="ml-auto my-2 mr-3 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Log Activity
          </button>
        )}
      </div>

      <div className="p-5">
        {activeTab === "activity" && (
          <>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => void refreshActivities()}
                disabled={loading}
                className="text-xs font-medium text-emerald-800 hover:underline disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No activities yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Log a call, email or meeting to start the timeline.
                </p>
                <button
                  type="button"
                  onClick={onAddActivity}
                  className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
                >
                  Log Activity
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-4 left-[11px] top-3 w-px bg-emerald-200" />
                <div className="space-y-0">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 border-b border-slate-100 py-4 last:border-0"
                    >
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-800 ring-4 ring-white">
                        {activityIcons[activity.activity_type] || "•"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {activity.subject}
                          </h4>
                          <span className="whitespace-nowrap text-xs text-slate-500">
                            {formatActivityDate(activity.activity_at)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-sm text-slate-600">
                            {activity.description}
                          </p>
                        )}
                        {activity.outcome && (
                          <p className="mt-1 text-xs text-slate-500">
                            Outcome: {activity.outcome}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "notes" && (
          <p className="py-10 text-center text-sm text-slate-500">
            Use the Notes tab in the prospect form to manage notes.
          </p>
        )}

        {activeTab === "attachments" && (
          <p className="py-10 text-center text-sm text-slate-500">
            No attachment storage API is connected yet.
          </p>
        )}
      </div>
    </section>
  );
}

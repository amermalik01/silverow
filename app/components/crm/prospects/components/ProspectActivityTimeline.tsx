// app/components/crm/prospects/components/ProspectActivityTimeline.tsx

"use client";

import { useEffect, useState } from "react";
import type { ProspectActivity } from "@/types/prospect";
import { Icon } from "@iconify/react";
import AttachmentsTab from "@/app/components/shared/AttachmentsTab";
import ProspectNotesList from "./ProspectNotesList";

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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#11161D]">
      <div className="flex flex-wrap items-center border-b border-slate-200 dark:border-slate-800">
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
            className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition-colors ${
              activeTab === key
                ? "border-emerald-800 text-emerald-800 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon
              icon={icon}
              className="text-emerald-800 text-xl dark:text-emerald-400"
            />
            {label}
          </button>
        ))}

        {activeTab === "activity" && !readOnly && (
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
                className="text-xs font-medium text-emerald-800 hover:underline disabled:opacity-50 dark:text-emerald-400"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
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
          </>
        )}

        {activeTab === "notes" && (
          <ProspectNotesList prospectId={prospectId} readonly={readOnly} />
        )}

        {activeTab === "attachments" && (
          <AttachmentsTab
            module="prospect"
            recordId={prospectId}
            readonly={readOnly}
          />
        )}
      </div>
    </section>
  );
}

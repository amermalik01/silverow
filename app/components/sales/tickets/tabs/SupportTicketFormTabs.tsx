// tabs/SupportTicketFormTabs.tsx

"use client";

import { Icon } from "@iconify/react";
import type { SupportTicketTab } from "@/types/support-ticket";

interface Props {
  activeTab: SupportTicketTab;
  onChange: (tab: SupportTicketTab) => void;
  noteCount: number;
}

const tabs: {
  id: SupportTicketTab;
  label: string;
  icon: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: "lucide:clipboard-list",
  },
  {
    id: "details",
    label: "Details",
    icon: "lucide:file-text",
  },
  {
    id: "notes",
    label: "Notes",
    icon: "lucide:messages-square",
  },
  {
    id: "attachments",
    label: "Attachments",
    icon: "lucide:paperclip",
  },
];

export default function SupportTicketFormTabs({
  activeTab,
  onChange,
  noteCount,
}: Props) {
  return (
    <div className="flex gap-1 pb-px flex-wrap">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`capitalize px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
              active
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}

            {tab.id === "notes" && noteCount > 0 && (
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                {noteCount}
              </span>
            )}

            {active && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
{
  /* <div className="border-b border-slate-200 dark:border-slate-800">
      <div
        className="flex items-center gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Support ticket sections"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={[
                "relative inline-flex shrink-0 items-center gap-2",
                "px-4 py-3 text-xs font-semibold transition-colors",
                active
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <Icon icon={tab.icon} className="h-4 w-4" />

              <span>{tab.label}</span>

              {tab.id === "notes" && noteCount > 0 && (
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  ].join(" ")}
                >
                  {noteCount}
                </span>
              )}

              {active && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div> */
}

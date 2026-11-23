// app/components/crm/prospects/components/ProspectWorkspaceTabs.tsx


"use client";

import { Icon } from "@iconify/react";

export type ProspectWorkspaceTab =
  | "activity"
  | "follow-up"
  | "notes"
  | "attachments"
  | "pricing";

type Props = {
  activeTab: ProspectWorkspaceTab;
  onChange: (tab: ProspectWorkspaceTab) => void;
  attachmentCount?: number;
  children: React.ReactNode;
};

const tabs: {
  id: ProspectWorkspaceTab;
  label: string;
  icon: string;
}[] = [
  { id: "activity", label: "Activity", icon: "lucide:activity" },
  { id: "follow-up", label: "Follow-up", icon: "lucide:calendar-days" },
  { id: "notes", label: "Notes", icon: "lucide:file-text" },
  { id: "attachments", label: "Attachments", icon: "lucide:paperclip" },
  { id: "pricing", label: "Pricing", icon: "lucide:tag" },
];

export default function ProspectWorkspaceTabs({
  activeTab,
  onChange,
  attachmentCount = 0,
  children,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex overflow-x-auto border-b border-slate-200 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-4 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "text-emerald-700"
                : "text-slate-700 hover:text-emerald-700"
            }`}
          >
            <Icon icon={tab.icon} className="text-xl text-emerald-600" />
            {tab.label}

            {tab.id === "attachments" && attachmentCount > 0 && (
              <span className="text-xs text-slate-500">
                ({attachmentCount})
              </span>
            )}

            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t-full bg-emerald-600" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

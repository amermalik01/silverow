// app/components/crm/prospects/tabs/ProspectFormTabs.tsx

"use client";

import type { ProspectTab } from "@/types/prospect";

type Props = {
  activeTab: ProspectTab;
  onChange: (tab: ProspectTab) => void;
};

const tabs: Array<{ id: ProspectTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "contacts", label: "Contacts" },
  { id: "addresses", label: "Addresses" },
  { id: "notes", label: "Notes" },
  { id: "attachments", label: "Attachments" },
];

export default function ProspectFormTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
            activeTab === tab.id
              ? "border-emerald-800 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

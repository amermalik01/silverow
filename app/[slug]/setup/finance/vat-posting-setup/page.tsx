// app/[slug]/setup/finance/vat-posting-setup/page.tsx

"use client";

import { useState } from "react";
import VatPostingSetupList from "@/app/components/setup/VatPostingSetupList";
import VatBusinessPostingGroupsList from "@/app/components/setup/VatBusinessPostingGroupsList";
import VatProductPostingGroupsList from "@/app/components/setup/VatProductPostingGroupsList";
import VatRatesList from "@/app/components/setup/VatRatesList";

type TabType = "matrix" | "business" | "product" | "rates";

export default function VatPostingSetupPage() {
  const [activeTab, setActiveTab] = useState<TabType>("matrix");

  const tabs: { id: TabType; label: string }[] = [
    { id: "matrix", label: "Posting Setup Matrix" },
    { id: "business", label: "Business Groups" },
    { id: "product", label: "Product Groups" },
    { id: "rates", label: "VAT Rates Master" },
  ];

  return (
    <div className="space-y-6 container mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            VAT Setup & Rules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure transaction posting classifications, standard rates, and
            account mappings.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        {/* Silver / Dark Metallic Styling Navigation Bar */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav
            className="-mb-px flex space-x-6 overflow-x-auto"
            aria-label="Tabs"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-slate-400 dark:border-slate-200 text-slate-900 dark:text-slate-100 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Module View */}
        <div className="mt-4">
          {activeTab === "matrix" && <VatPostingSetupList />}
          {activeTab === "business" && <VatBusinessPostingGroupsList />}
          {activeTab === "product" && <VatProductPostingGroupsList />}
          {activeTab === "rates" && <VatRatesList />}
        </div>
      </div>
    </div>
  );
}
/* import VatPostingSetupList from "@/app/components/setup/VatPostingSetupList";

export default function VatPostingSetupPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">VAT Posting Setup</h1>
      </div>

      <VatPostingSetupList />
    </div>
  );
} */

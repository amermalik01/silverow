// app/components/setup/finance/FinanceSetupForm.tsx

"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

import VatPostingSetupList from "@/app/components/setup/VatPostingSetupList";
import VatBusinessPostingGroupsList from "@/app/components/setup/VatBusinessPostingGroupsList";
// import VatProductPostingGroupsList from "@/app/components/setup/VatProductPostingGroupsList";
import VatRatesList from "@/app/components/setup/VatRatesList";
import PostingDateRangeSetup from "@/app/components/setup/posting/PostingDateRangeSetup";
import InventorySystemSetup from "../posting/InventorySystemSetup";
import SalesPostingGroups from "../posting/SalesPostingGroups";
import PurchasePostingGroups from "../posting/PurchasePostingGroups";
import InventoryPostingGroups from "../posting/InventoryPostingGroups";

type TabType =
  | "posting_setup"
  | "matrix"
  | "business"
  // | "product"
  | "rates"
  | "posting_date_range";

const tabs: {
  id: TabType;
  label: string;
  icon: string;
}[] = [
  {
    id: "posting_setup",
    label: "Finance Posting Setup",
    icon: "solar:table-linear",
  },
  {
    id: "matrix",
    label: "Posting Setup Matrix",
    icon: "solar:table-linear",
  },
  {
    id: "business",
    label: "Business Groups",
    icon: "solar:buildings-2-linear",
  },
  // {
  //   id: "product",
  //   label: "Product Groups",
  //   icon: "solar:box-linear",
  // },
  {
    id: "rates",
    label: "VAT Rates",
    icon: "solar:percent-circle-linear",
  },
  {
    id: "posting_date_range",
    label: "Posting Date Range",
    icon: "solar:calendar-date-linear",
  },
];

export default function FinanceSetupForm() {
  const [activeTab, setActiveTab] = useState<TabType>("matrix");

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* =====================================================
          Header
          ===================================================== */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        {/* Optional header content can be enabled later */}

        {/* <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Icon
              icon="solar:wallet-money-linear"
              width={20}
              height={20}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Finance Configuration
            </h2>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage your finance master data and posting configuration.
            </p>
          </div>
        </div> */}
      </div>

      {/* =====================================================
          Tabs
          ===================================================== */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={isActive}
                role="tab"
                className={`
                  group inline-flex items-center gap-1.5 rounded-lg border px-3 py-2
                  text-xs font-semibold transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                  ${
                    isActive
                      ? `
                        border-emerald-200
                        bg-white
                        text-emerald-700
                        shadow-sm
                        dark:border-emerald-800
                        dark:bg-slate-900
                        dark:text-emerald-400
                      `
                      : `
                        border-transparent
                        bg-transparent
                        text-slate-500
                        hover:border-slate-200
                        hover:bg-white
                        hover:text-slate-800
                        dark:text-slate-400
                        dark:hover:border-slate-700
                        dark:hover:bg-slate-900
                        dark:hover:text-slate-200
                      `
                  }
                `}
              >
                <Icon
                  icon={tab.icon}
                  width={16}
                  height={16}
                  className={`
                    shrink-0 transition-colors
                    ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    }
                  `}
                />

                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          Active Section Header
          ===================================================== */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800/80">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon
            icon={activeTabInfo?.icon || "solar:settings-linear"}
            width={17}
            height={17}
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {activeTabInfo?.label}
          </h3>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Configure {activeTabInfo?.label?.toLowerCase()}.
          </p>
        </div>
      </div>

      {/* =====================================================
          Content
          ===================================================== */}
      <div className="p-3 sm:p-4">
        {activeTab === "posting_setup" && (
          <>
            <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-4">
              <InventorySystemSetup />

              <div className="border p-6 rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white space-x-6 shadow-sm">
                <h2 className="font-semibold text-lg">Sales Posting Setup</h2>
                <SalesPostingGroups />
              </div>

              <div className="border p-6 rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white space-x-6 shadow-sm">
                <h2 className="font-semibold text-lg">
                  Purchase Posting Setup
                </h2>
                <PurchasePostingGroups />
              </div>

              <div className="border p-6 rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white space-x-6 shadow-sm">
                <h2 className="font-semibold text-lg">
                  Inventory Posting Setup
                </h2>
                <InventoryPostingGroups />
              </div>
            </div>
          </>
        )}
        {activeTab === "matrix" && <VatPostingSetupList />}

        {activeTab === "business" && <VatBusinessPostingGroupsList />}

        {/* {activeTab === "product" && (
          <VatProductPostingGroupsList />
        )} */}

        {activeTab === "rates" && <VatRatesList />}

        {activeTab === "posting_date_range" && <PostingDateRangeSetup />}
      </div>
    </div>
  );
}

/* "use client";

import { useState } from "react";
import VatPostingSetupList from "@/app/components/setup/VatPostingSetupList";
import VatBusinessPostingGroupsList from "@/app/components/setup/VatBusinessPostingGroupsList";
// import VatProductPostingGroupsList from "@/app/components/setup/VatProductPostingGroupsList";
import VatRatesList from "@/app/components/setup/VatRatesList";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import PostingDateRangeSetup from "@/app/components/setup/posting/PostingDateRangeSetup";

type TabType = "matrix" | "business" | "rates" | "posting_date_range"; // "product" |

export default function FinanceSetupForm() {
  const [activeTab, setActiveTab] = useState<TabType>("matrix");

  const tabs: { id: TabType; label: string }[] = [
    { id: "matrix", label: "Posting Setup Matrix" },
    { id: "business", label: "Business Groups" },
    // { id: "product", label: "Product Groups" },
    { id: "rates", label: "VAT Rates" },
    { id: "posting_date_range", label: "Posting Date Range" },
    // { id: "posting_date_range", label: "Posting Date Range" },
  ];

  return (
    <div className="space-y-4 ">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">

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


        <div className="mt-4">
          {activeTab === "matrix" && <VatPostingSetupList />}
          {activeTab === "business" && <VatBusinessPostingGroupsList />}
          {activeTab === "posting_date_range" && <PostingDateRangeSetup />}
          {activeTab === "product" && <VatProductPostingGroupsList />}
          {activeTab === "rates" && <VatRatesList />}
        </div>
      </div>
    </div>
  );
}
 */

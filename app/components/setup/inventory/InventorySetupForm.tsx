// app/components/setup/inventory/InventorySetupForm.tsx


"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

import BrandsTab from "./tabs/brands";
import CategoriesTab from "./tabs/categories";
import UOMTab from "./tabs/UOM";

type TabType =
  | "brands"
  | "categories"
  | "uom";

const tabs: {
  id: TabType;
  label: string;
  icon: string;
}[] = [
  {
    id: "brands",
    label: "Brands",
    icon: "solar:table-linear",
  },
  {
    id: "categories",
    label: "Categories",
    icon: "solar:table-linear",
  },
  {
    id: "uom",
    label: "UOM",
    icon: "solar:table-linear",
  },
];

export default function InventorySetupForm() {
  const [activeTab, setActiveTab] = useState<TabType>("brands");

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
        {activeTab === "brands" && <BrandsTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "uom" && <UOMTab />}
      </div>
    </div>
  );
}
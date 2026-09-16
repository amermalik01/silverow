// app/components/setup/purchases/PurchasesSetupForm.tsx

"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";
import RankedStagesTemplate from "../RankedStagesTemplate";

type TabType =
  | "segments"
  | "territories"
  | "selling_groups"
  | "classification"
  | "price_offer_method"
  | "payment_terms"
  | "payment_method"
  | "shipment_method"
  | "purchase_order_stages"
  | "debit_note_stages";

const tabs: {
  id: TabType;
  label: string;
  icon: string;
}[] = [
  {
    id: "segments",
    label: "Segments",
    icon: "solar:widget-4-linear",
  },
  {
    id: "territories",
    label: "Territories",
    icon: "solar:map-point-linear",
  },
  {
    id: "selling_groups",
    label: "Selling Groups",
    icon: "solar:users-group-rounded-linear",
  },
  {
    id: "classification",
    label: "Classification",
    icon: "solar:layers-linear",
  },
  {
    id: "price_offer_method",
    label: "Price Offer Method",
    icon: "solar:tag-price-linear",
  },
  {
    id: "payment_terms",
    label: "Payment Terms",
    icon: "solar:calendar-linear",
  },
  {
    id: "payment_method",
    label: "Payment Method",
    icon: "solar:card-linear",
  },
  {
    id: "shipment_method",
    label: "Shipment Method",
    icon: "solar:delivery-linear",
  },
  {
    id: "purchase_order_stages",
    label: "Order Stages",
    icon: "solar:sort-by-time-linear",
  },
  {
    id: "debit_note_stages",
    label: "Debit Note Stages",
    icon: "solar:document-text-linear",
  },
];

export default function PurchasesSetupForm() {
  const [activeTab, setActiveTab] = useState<TabType>("segments");

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className=" flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        {/* <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#103701]/10 text-[#103701] dark:bg-emerald-500/10 dark:text-emerald-400">
            <Icon
              icon="solar:settings-minimalistic-linear"
              width={20}
              height={20}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Purchases Configuration
            </h2>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage your purchases master data and workflow configuration.
            </p>
          </div>
        </div> */}

        {/* <div className=" inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {tabs.length} Configuration Areas
        </div> */}
      </div>

      {/* =====================================================
          Tabs
          ===================================================== */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className=" flex flex-wrap items-center gap-1.5">
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
                  group inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                  ${
                    isActive
                      ? `border-emerald-200 bg-white text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-400`
                      : `border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200
                      `
                  }
                `}
              >
                <Icon
                  icon={tab.icon}
                  width={16}
                  height={16}
                  className={` shrink-0  transition-colors
                    ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}
                  `}
                />

                <span>{tab.label}</span>

                {/* {isActive && (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )} */}
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
        {activeTab === "segments" && (
          <SetupDataGrid {...setupConfig.purchasesSegments} />
        )}

        {activeTab === "territories" && (
          <SetupDataGrid {...setupConfig.purchasesTerritories} />
        )}

        {activeTab === "selling_groups" && (
          <SetupDataGrid {...setupConfig.purchasesSellingGroups} />
        )}

        {activeTab === "classification" && (
          <SetupDataGrid {...setupConfig.purchasesClassification} />
        )}

        {activeTab === "price_offer_method" && (
          <SetupDataGrid {...setupConfig.purchasesPriceOfferMethod} />
        )}

        {activeTab === "payment_terms" && (
          <SetupDataGrid {...setupConfig.purchasesPaymentTerms} />
        )}

        {activeTab === "payment_method" && (
          <SetupDataGrid {...setupConfig.purchasesPaymentMethod} />
        )}

        {activeTab === "shipment_method" && (
          <SetupDataGrid {...setupConfig.purchasesShipmentMethod} />
        )}

        {activeTab === "purchase_order_stages" && (
          <RankedStagesTemplate config={setupConfig.purchaseOrderStages} />
        )}

        {activeTab === "debit_note_stages" && (
          <RankedStagesTemplate config={setupConfig.debitNoteStages} />
        )}
      </div>
    </div>
  );
}

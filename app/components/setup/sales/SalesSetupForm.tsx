// app/components/setup/sales/SalesSetupForm.tsx

"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";
import RankedStagesTemplate from "../RankedStagesTemplate";

type TabType =
  | "credit-ratings"
  | "segments"
  | "territories"
  | "buying_groups"
  | "classification"
  | "sources_crm"
  | "ownership_type"
  | "status"
  | "order_sources"
  | "type"
  | "price_offer_method"
  | "payment_terms"
  | "payment_method"
  | "shipment_method"
  | "order_stages"
  | "credit_note_stages";

const tabs: {
  id: TabType;
  label: string;
  icon: string;
}[] = [
  {
    id: "credit-ratings",
    label: "Credit Ratings",
    icon: "solar:shield-check-linear",
  },
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
    id: "buying_groups",
    label: "Buying Groups",
    icon: "solar:users-group-rounded-linear",
  },
  {
    id: "classification",
    label: "Classification",
    icon: "solar:layers-linear",
  },
  {
    id: "sources_crm",
    label: "CRM Sources",
    icon: "solar:share-linear",
  },
  {
    id: "ownership_type",
    label: "Ownership Type",
    icon: "solar:user-id-linear",
  },
  {
    id: "status",
    label: "Status",
    icon: "solar:check-circle-linear",
  },
  {
    id: "order_sources",
    label: "Order Sources",
    icon: "solar:route-linear",
  },
  {
    id: "type",
    label: "Type",
    icon: "solar:tag-linear",
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
    id: "order_stages",
    label: "Order Stages",
    icon: "solar:sort-by-time-linear",
  },
  {
    id: "credit_note_stages",
    label: "Credit Note Stages",
    icon: "solar:document-text-linear",
  },
];

export default function SalesSetupForm() {
  const [activeTab, setActiveTab] = useState<TabType>("credit-ratings");

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
              Sales Configuration
            </h2>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage your sales master data and workflow configuration.
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
        {activeTab === "credit-ratings" && (
          <SetupDataGrid {...setupConfig.salesCreditRating} />
        )}

        {activeTab === "segments" && (
          <SetupDataGrid {...setupConfig.salesSegments} />
        )}

        {activeTab === "territories" && (
          <SetupDataGrid {...setupConfig.salesTerritories} />
        )}

        {activeTab === "buying_groups" && (
          <SetupDataGrid {...setupConfig.salesBuyingGroups} />
        )}

        {activeTab === "ownership_type" && (
          <SetupDataGrid {...setupConfig.salesOwnershipType} />
        )}

        {activeTab === "order_sources" && (
          <SetupDataGrid {...setupConfig.salesOrderSource} />
        )}

        {activeTab === "sources_crm" && (
          <SetupDataGrid {...setupConfig.salesSource} />
        )}

        {activeTab === "type" && <SetupDataGrid {...setupConfig.salesType} />}

        {activeTab === "status" && (
          <SetupDataGrid {...setupConfig.salesStatus} />
        )}

        {activeTab === "classification" && (
          <SetupDataGrid {...setupConfig.salesClassification} />
        )}

        {activeTab === "price_offer_method" && (
          <SetupDataGrid {...setupConfig.salesPriceOfferMethod} />
        )}

        {activeTab === "payment_terms" && (
          <SetupDataGrid {...setupConfig.salesPaymentTerms} />
        )}

        {activeTab === "payment_method" && (
          <SetupDataGrid {...setupConfig.salesPaymentMethod} />
        )}

        {activeTab === "shipment_method" && (
          <SetupDataGrid {...setupConfig.salesShipmentMethod} />
        )}

        {activeTab === "order_stages" && (
          <RankedStagesTemplate config={setupConfig.salesOrderStages} />
        )}

        {activeTab === "credit_note_stages" && (
          <RankedStagesTemplate config={setupConfig.creditNoteStages} />
        )}
      </div>
    </div>
  );
}

/* "use client";

import React, { useEffect, useState } from "react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";

type TabType =
  | "credit-ratings"
  | "segments"
  | "territories"
  | "buying_groups"
  | "classification"
  | "sources_crm"
  | "ownership_type"
  | "status"
  | "order_sources"
  | "type"
  | "price_offer_method"
  | "payment_terms"
  | "payment_method"
  | "shipment_method"
  | "order_stages"
  | "credit_note_stages";

export default function SalesSetupForm() {
  const [activeTab, setActiveTab] = useState<string>("credit-ratings");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  return (
    <div className="w-full bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-xs p-4">
      {message.text && (
        <div
          className={`p-3 mb-4 border text-xs rounded ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-1 gap-2 overflow-y-auto no-scrollbar ">
        {(
          [
            "credit-ratings",
            "segments",
            "territories",
            "buying_groups",
            "classification",
            "sources_crm",
            "ownership_type",
            "status",
            "order_sources",
            "type",
            "price_offer_method",
            "payment_terms",
            "payment_method",
            "shipment_method",
            "order_stages",
            "credit_note_stages",
          ] as TabType[]
        ).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold capitalize tracking-wider border-b-2 transition whitespace-nowrap ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4">
        {activeTab === "credit-ratings" && (
          <SetupDataGrid {...setupConfig.salesCreditRating} />
        )}

        {activeTab === "segments" && (
          <SetupDataGrid {...setupConfig.salesSegments} />
        )}

        {activeTab === "territories" && (
          <SetupDataGrid {...setupConfig.salesTerritories} />
        )}

        {activeTab === "buying_groups" && (
          <SetupDataGrid {...setupConfig.salesBuyingGroups} />
        )}

        {activeTab === "ownership_type" && (
          <SetupDataGrid {...setupConfig.salesOwnershipType} />
        )}

        {activeTab === "order_sources" && (
          <SetupDataGrid {...setupConfig.salesOrderSource} />
        )}

        {activeTab === "sources_crm" && (
          <SetupDataGrid {...setupConfig.salesSource} />
        )}

        {activeTab === "type" && <SetupDataGrid {...setupConfig.salesType} />}

        {activeTab === "status" && (
          <SetupDataGrid {...setupConfig.salesStatus} />
        )}

        {activeTab === "classification" && (
          <SetupDataGrid {...setupConfig.salesClassification} />
        )}

        {activeTab === "price_offer_method" && (
          <SetupDataGrid {...setupConfig.salesPriceOfferMethod} />
        )}

        {activeTab === "payment_terms" && (
          <SetupDataGrid {...setupConfig.salesPaymentTerms} />
        )}

        {activeTab === "payment_method" && (
          <SetupDataGrid {...setupConfig.salesPaymentMethod} />
        )}

        {activeTab === "shipment_method" && (
          <SetupDataGrid {...setupConfig.salesShipmentMethod} />
        )}

        {activeTab === "order_stages" && (
          <SetupDataGrid {...setupConfig.salesOrderStages} />
        )}

        {activeTab === "credit_note_stages" && (
          <SetupDataGrid {...setupConfig.creditNoteStages} />
        )}

        {activeTab === "virtual-emails" && (
          <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
            Virtual Emails configuration panel.
          </div>
        )}
      </div>
    </div>
  );
} */

/* const tabs = [
    { id: "credit-ratings", label: "Credit Ratings" },
    { id: "segments", label: "Segments" },
    { id: "territories", label: "Territories" },
    { id: "buying_groups", label: "Buying Groups" },
    { id: "classification", label: "Classification" },
    { id: "sources_crm", label: "Source Of CRM" },
    { id: "ownership_type", label: "Ownership Type" },
    { id: "status", label: "Status" },
    { id: "order_sources", label: "Source Of Order" },
    { id: "type", label: "CRM Type" },
    { id: "price_offer_method", label: "Price Offer Method" },
    { id: "payment_terms", label: "Payment Terms" },
    { id: "payment_method", label: "Payment Method" },
    { id: "shipment_method", label: "Shipment Method" },
    { id: "order_stages", label: "Sales Order Stages" },
    { id: "credit_note_stages", label: "Credit Note Stages" },
  ];  
  
  
  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
        <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {loading ? "Loading..." : profile?.name || "Company Profile"}
            </h2>
        </div>
        </div>
    </div>
    </div>    

      
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
    {tabs.map((tab) => {
        return (
        <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`capitalize px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
        >
            {tab.label}
        </button>
        );
    })}
    </div> */

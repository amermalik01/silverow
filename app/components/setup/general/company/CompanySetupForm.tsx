// app/components/setup/general/company/CompanySetupForm.tsx

// app/components/setup/general/company/CompanySetupForm.tsx

"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

import GeneralTab from "./tabs/GeneralTab";
import AdditionalAddressTab from "./tabs/AdditionalAddressTab";
import BankAccountsTab from "./tabs/BankAccountsTab";
import FinancialSettingsTab from "./tabs/FinancialSettingsTab";
import CurrencyTab from "./tabs/CurrencyTab";
import SequenceList from "./tabs/SequenceList";
import PasswordSettingsTab from "./tabs/PasswordSettingsTab";

export interface CompanyProfile {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  telephone: string;
  fax: string;
  additional_printable_info: string;
  web_address: string;
  base_currency: string;
  number_of_users: number;
  logo_url?: string;
}

type CompanyTabType =
  | "general"
  | "additional-address"
  | "bank-accounts"
  | "financial-settings"
  | "currency"
  | "modules-code"
  | "password-settings"
  | "virtual-emails";

const tabs: {
  id: CompanyTabType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: "solar:buildings-2-linear",
    description: "Manage your company profile and basic information.",
  },
  {
    id: "additional-address",
    label: "Additional Address",
    icon: "solar:map-point-linear",
    description: "Manage additional company addresses and locations.",
  },
  {
    id: "bank-accounts",
    label: "Bank Account(s)",
    icon: "solar:bank-linear",
    description: "Configure company bank accounts and banking details.",
  },
  {
    id: "financial-settings",
    label: "Financial Settings",
    icon: "solar:wallet-money-linear",
    description: "Configure financial and accounting preferences.",
  },
  {
    id: "currency",
    label: "Currency",
    icon: "solar:money-bag-linear",
    description: "Configure company currency and currency settings.",
  },
  {
    id: "modules-code",
    label: "Modules Codes",
    icon: "solar:code-square-linear",
    description: "Configure numbering sequences and module codes.",
  },
  {
    id: "password-settings",
    label: "Password Settings",
    icon: "solar:lock-password-linear",
    description: "Configure password and security-related settings.",
  },
  {
    id: "virtual-emails",
    label: "Virtual Emails",
    icon: "solar:letter-linear",
    description: "Configure virtual email addresses for your company.",
  },
];

export default function CompanySetupForm() {
  const [activeTab, setActiveTab] =
    useState<CompanyTabType>("general");

  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/setup/general/company");

      if (!res.ok) {
        throw new Error("Could not pull company setup profiles.");
      }

      const data = await res.json();

      setProfile(data.profile || data);

      // Clear previous error/success message after successful fetch
      setMessage({
        type: "",
        text: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Error fetching profile",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const activeTabInfo = tabs.find(
    (tab) => tab.id === activeTab
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* =====================================================
          Header
          ===================================================== */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon
              icon="solar:buildings-2-linear"
              width={21}
              height={21}
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {loading
                ? "Loading..."
                : profile?.name || "Company Profile"}
            </h2>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage your company profile, financial settings,
              accounts and system configuration.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          Message
          ===================================================== */}
      {message.text && (
        <div className="px-4 pt-4">
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            }`}
          >
            <Icon
              icon={
                message.type === "success"
                  ? "solar:check-circle-linear"
                  : "solar:danger-circle-linear"
              }
              width={16}
              height={16}
              className="mt-0.5 shrink-0"
            />

            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* =====================================================
          Tabs
          ===================================================== */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Company setup sections"
        >
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
                  group inline-flex items-center gap-1.5
                  rounded-lg border px-3 py-2
                  text-xs font-semibold
                  transition-all duration-200
                  focus:outline-none
                  focus:ring-2
                  focus:ring-emerald-500/30
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
            icon={
              activeTabInfo?.icon ||
              "solar:settings-linear"
            }
            width={17}
            height={17}
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {activeTabInfo?.label}
          </h3>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {activeTabInfo?.description}
          </p>
        </div>
      </div>

      {/* =====================================================
          Content
          ===================================================== */}
      <div className="p-3 sm:p-4">
        {activeTab === "general" && (
          <GeneralTab
            initialProfile={profile}
            onUpdated={fetchProfile}
          />
        )}

        {activeTab === "additional-address" && (
          <AdditionalAddressTab />
        )}

        {activeTab === "bank-accounts" && (
          <BankAccountsTab />
        )}

        {activeTab === "financial-settings" && (
          <FinancialSettingsTab />
        )}

        {activeTab === "currency" && <CurrencyTab />}

        {activeTab === "modules-code" && <SequenceList />}

        {activeTab === "password-settings" && (
          <PasswordSettingsTab />
        )}

        {activeTab === "virtual-emails" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center dark:border-slate-800 dark:bg-slate-950/30">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon
                icon="solar:letter-linear"
                width={20}
                height={20}
              />
            </div>

            <h4 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Virtual Emails
            </h4>

            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Virtual Emails configuration panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


/* "use client";

import React, { useEffect, useState } from "react";
import GeneralTab from "./tabs/GeneralTab";
import AdditionalAddressTab from "./tabs/AdditionalAddressTab";
import BankAccountsTab from "./tabs/BankAccountsTab";
import FinancialSettingsTab from "./tabs/FinancialSettingsTab";
import CurrencyTab from "./tabs/CurrencyTab";
import SequenceList from "./tabs/SequenceList";
import PasswordSettingsTab from "./tabs/PasswordSettingsTab";

export interface CompanyProfile {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  telephone: string;
  fax: string;
  additional_printable_info: string;
  web_address: string;
  base_currency: string;
  number_of_users: number;
  logo_url?: string;
}

export default function CompanySetupForm() {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/setup/general/company");
      if (!res.ok) throw new Error("Could not pull company setup profiles.");
      const data = await res.json();
      setProfile(data.profile || data);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error fetching profile",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const tabs = [
    { id: "general", label: "General" },
    { id: "additional-address", label: "Additional Address" },
    { id: "bank-accounts", label: "Bank Account(s)" },
    { id: "financial-settings", label: "Financial Settings" },
    { id: "currency", label: "Currency" },
    { id: "modules-code", label: "Modules Codes" },
    { id: "password-settings", label: "Password Settings" },
    { id: "virtual-emails", label: "Virtual Emails" },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-xs p-4">
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
      </div>
      <div className="p-6">
        {activeTab === "general" && (
          <GeneralTab initialProfile={profile} onUpdated={fetchProfile} />
        )}
        {activeTab === "additional-address" && <AdditionalAddressTab />}
        {activeTab === "bank-accounts" && <BankAccountsTab />}
        {activeTab === "currency" && <CurrencyTab />}
        {activeTab === "financial-settings" && <FinancialSettingsTab />}
        {activeTab === "password-settings" && <PasswordSettingsTab />}
        {activeTab === "modules-code" && <SequenceList />}
        

        {activeTab === "virtual-emails" && (
          <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
            Virtual Emails configuration panel.
          </div>
        )}
      </div>
    </div>
  );
} */

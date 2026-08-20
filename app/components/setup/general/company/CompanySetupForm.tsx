// app/components/setup/general/company/CompanySetupForm.tsx

"use client";

import React, { useEffect, useState } from "react";
import GeneralTab from "./tabs/GeneralTab";
import AdditionalAddressTab from "./tabs/AdditionalAddressTab";
import BankAccountsTab from "./tabs/BankAccountsTab";
import CurrencyTab from "./tabs/CurrencyTab";
import FinancialSettingsTab from "./tabs/FinancialSettingsTab";
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
    { id: "password-settings", label: "Password Settings" },
    { id: "virtual-emails", label: "Virtual Emails" },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border rounded-sm shadow-sm text-xs p-6">
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

        {activeTab === "virtual-emails" && (
          <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
            Virtual Emails configuration panel.
          </div>
        )}
      </div>
    </div>
  );
}

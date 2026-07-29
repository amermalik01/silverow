// app/components/setup/general/company/CompanySetupForm.tsx

"use client";

import React, { useEffect, useState } from "react";
import GeneralTab from "./tabs/GeneralTab";
import AdditionalAddressTab from "./tabs/AdditionalAddressTab";
import BankAccountsTab from "./tabs/BankAccountsTab";
import CurrencyTab from "./tabs/CurrencyTab";
import FinancialSettingsTab from "./tabs/FinancialSettingsTab";
import PasswordSettingsTab from "./tabs/PasswordSettingsTab";

interface CompanyProfile {
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

  useEffect(() => {
    fetch("/api/setup/general/company")
      .then((res) => {
        if (!res.ok) throw new Error("Could not pull company setup profiles.");
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile || data);
      })
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
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
                {profile?.name || "Company Profile"}
              </h2>
            </div>
          </div>
        </div>

        {/* {errorMessage && (
                <div className="mt-3 p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                  <strong>Conversion Error:</strong> {errorMessage}
                </div>
              )} */}
      </div>
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
        {tabs.map((tab) => {
          return (
            <button
              key={tab.id}
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
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "additional-address" && <AdditionalAddressTab />}
        {activeTab === "bank-accounts" && <BankAccountsTab />}
        {activeTab === "currency" && <CurrencyTab />}
        {activeTab === "financial-settings" && <FinancialSettingsTab />}
        {activeTab === "password-settings" && <PasswordSettingsTab />}

        {["virtual-emails"].includes(activeTab) && (
          <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
            {tabs.find((t) => t.id === activeTab)?.label} configuration panel.
          </div>
        )}
      </div>
    </div>
  );
}
/* "use client";

import React, { useEffect, useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";

interface CompanyProfile {
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

interface AdditionalAddress {
  id?: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  contact_person: string;
  job_title: string;
  mobile: string;
  telephone: string;
  fax: string;
  email: string;
}

interface BankAccount {
  id?: string;
  account_name: string;
  preferred_name: string;
  sort_code: string;
  account_no: string;
  swift_code: string;
  iban: string;
  currency: string;
  gl_no: string;
  bank_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
  contact_name: string;
  mobile: string;
  telephone: string;
  fax: string;
  email: string;
}

export default function CompanySetupForm() {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Additional Addresses sub-state
  const [addresses, setAddresses] = useState<AdditionalAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"list" | "form">("list");
  const [currentAddress, setCurrentAddress] = useState<
    Partial<AdditionalAddress>
  >({});

  // Bank Accounts sub-state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankMode, setBankMode] = useState<"list" | "form">("list");
  const [currentBank, setCurrentBank] = useState<Partial<BankAccount>>({});

  useEffect(() => {
    fetch("/api/setup/general/company")
      .then((res) => {
        if (!res.ok) throw new Error("Could not pull company setup profiles.");
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile || data);
        setAddresses(data.addresses || []);
        setBankAccounts(data.bankAccounts || []);
      })
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/setup/general/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Could not save company configuration.");
      setMessage({
        type: "success",
        text: "Company settings updated successfully.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "additional-address", label: "Additional Address" },
    { id: "bank-accounts", label: "Bank Account(s)" },
    { id: "financial-settings", label: "Financial Settings" },
    { id: "currency", label: "Currency" },
    { id: "password-settings", label: "Password Settings" },
    { id: "virtual-emails", label: "Virtual Emails" },
  ];

  if (loading) {
    return (
      <div className="p-6 text-xs text-gray-500">
        Retrieving company setup configuration...
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded-sm shadow-sm text-xs">
    
      <div className="px-4 py-2 flex items-center gap-2 font-medium">
        <span>Setup</span>
        <span>/</span>
        <span>General</span>
        <span>/</span>
        <span className="bg-emerald-700 px-2 py-0.5 rounded text-white font-semibold">
          {profile?.name || "Company Profile"}
        </span>
      </div>

   
      <div className="border-b bg-gray-50 px-4 pt-2 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-emerald-700 text-emerald-800 bg-white font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>


      {message.text && (
        <div
          className={`m-4 p-3 border text-xs rounded ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}


      <div className="p-6">

        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              <div className="space-y-3">
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.name || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.address_line1 || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="address_line2"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.address_line2 || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <span />
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="city"
                      placeholder="City / Town"
                      className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      value={profile?.city || ""}
                      onChange={handleProfileChange}
                    />
                    <input
                      type="text"
                      name="county"
                      placeholder="County"
                      className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      value={profile?.county || ""}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <span />
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="postal_code"
                      placeholder="Postcode"
                      className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      value={profile?.postal_code || ""}
                      onChange={handleProfileChange}
                    />
                    <MasterDropdown
                      type="country"
                      value={profile?.country_code || "United Kingdom"}
                      onChange={handleProfileChange}
                      className="border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">Telephone</label>
                  <input
                    type="text"
                    name="telephone"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.telephone || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">Fax</label>
                  <input
                    type="text"
                    name="fax"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.fax || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-start gap-2 pt-1">
                  <label className="font-medium text-gray-700 pt-1">
                    Additional Printable Information
                  </label>
                  <textarea
                    rows={3}
                    name="additional_printable_info"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                    value={profile?.additional_printable_info || ""}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>

     
              <div className="space-y-3">
                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Web Address
                  </label>
                  <input
                    type="text"
                    name="web_address"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={profile?.web_address || ""}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Base Currency
                  </label>
                  <select
                    name="base_currency"
                    className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                    value={profile?.base_currency || "GBP"}
                    onChange={handleProfileChange}
                  >
                    <option value="GBP">British Pound</option>
                    <option value="USD">US Dollar</option>
                    <option value="EUR">Euro</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 items-center gap-2">
                  <label className="font-medium text-gray-700">
                    Number of Users
                  </label>
                  <input
                    type="number"
                    disabled
                    className="col-span-2 border px-2.5 py-1.5 rounded bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={profile?.number_of_users || 100}
                  />
                </div>

 
                <div className="grid grid-cols-3 items-start gap-2 pt-2">
                  <label className="font-medium text-gray-700 pt-1">
                    Company Logo
                  </label>
                  <div className="col-span-2 space-y-3">
                    <button
                      type="button"
                      className="border border-gray-300 px-3 py-1.5 rounded bg-gray-50 hover:bg-gray-100 font-medium text-gray-700"
                    >
                      Change File
                    </button>


                    <div className="p-3 border rounded bg-white w-48 h-20 flex items-center justify-center border-dashed">
                      {profile?.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Company Logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-gray-400 font-semibold tracking-wider">
                          LOGOTYPE
                        </span>
                      )}
                    </div>

      
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1 text-[11px]">
                      <p className="font-semibold">Note</p>
                      <p>Supported file formats are jpg / png / jpeg</p>
                      <p>File size should be less than 2 MB</p>
                      <p>
                        For best results, upload with dimensions 200 × 200 px
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-medium px-5 py-1.5 rounded transition-colors"
              >
                {saving ? "Saving..." : "Edit / Save"}
              </button>
              <button
                type="button"
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-5 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

 
        {activeTab === "additional-address" && (
          <div className="space-y-4">
            {addressMode === "list" ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    placeholder="Search addresses..."
                    className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentAddress({});
                      setAddressMode("form");
                    }}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded font-medium"
                  >
                    Add
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
                    No additional addresses recorded. Click "Add" above to add
                    one.
                  </div>
                ) : (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="p-2 font-semibold">Name</th>
                          <th className="p-2 font-semibold">Contact Person</th>
                          <th className="p-2 font-semibold">City</th>
                          <th className="p-2 font-semibold">Telephone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addresses.map((addr, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2">{addr.name}</td>
                            <td className="p-2">{addr.contact_person}</td>
                            <td className="p-2">{addr.city}</td>
                            <td className="p-2">{addr.telephone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAddressMode("list");
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        value={currentAddress.name || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        value={currentAddress.address_line1 || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            address_line1: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        value={currentAddress.address_line2 || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            address_line2: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <span />
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentAddress.city || ""}
                          onChange={(e) =>
                            setCurrentAddress({
                              ...currentAddress,
                              city: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="County"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentAddress.county || ""}
                          onChange={(e) =>
                            setCurrentAddress({
                              ...currentAddress,
                              county: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <span />
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Postcode"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentAddress.postal_code || ""}
                          onChange={(e) =>
                            setCurrentAddress({
                              ...currentAddress,
                              postal_code: e.target.value,
                            })
                          }
                        />
                        <MasterDropdown
                          type="country"
                          value={
                            currentAddress.country_code || "United Kingdom"
                          }
                          onChange={(e) =>
                            setCurrentAddress({
                              ...currentAddress,
                              country_code: e.target.value,
                            })
                          }
                          className="border px-2.5 py-1.5 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.contact_person || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            contact_person: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Job Title
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.job_title || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            job_title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Mobile
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.mobile || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            mobile: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Telephone
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.telephone || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            telephone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">Fax</label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.fax || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            fax: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        placeholder="e.g. myname@example.com"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentAddress.email || ""}
                        onChange={(e) =>
                          setCurrentAddress({
                            ...currentAddress,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="border border-emerald-700 text-emerald-800 hover:bg-emerald-50 px-5 py-1.5 rounded font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressMode("list")}
                    className="border border-gray-300 hover:bg-gray-50 px-5 py-1.5 rounded font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}


        {activeTab === "bank-accounts" && (
          <div className="space-y-4">
            {bankMode === "list" ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    placeholder="Search bank accounts..."
                    className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentBank({});
                      setBankMode("form");
                    }}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded font-medium"
                  >
                    Add
                  </button>
                </div>

                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="p-2 font-semibold">Preferred Name</th>
                        <th className="p-2 font-semibold">Bank Name</th>
                        <th className="p-2 font-semibold">Currency</th>
                        <th className="p-2 font-semibold">Account Name</th>
                        <th className="p-2 font-semibold">Sort Code</th>
                        <th className="p-2 font-semibold">Account No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-6 text-gray-500"
                          >
                            No bank account configuration registered.
                          </td>
                        </tr>
                      ) : (
                        bankAccounts.map((bank, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">
                              {bank.preferred_name}
                            </td>
                            <td className="p-2">{bank.bank_name}</td>
                            <td className="p-2">{bank.currency}</td>
                            <td className="p-2">{bank.account_name}</td>
                            <td className="p-2">{bank.sort_code}</td>
                            <td className="p-2">{bank.account_no}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBankMode("list");
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.account_name || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            account_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Preferred Name
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.preferred_name || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            preferred_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Sort Code
                      </label>
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="text"
                          className="border px-2.5 py-1.5 rounded w-full"
                          value={currentBank.sort_code || ""}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              sort_code: e.target.value,
                            })
                          }
                        />
                        <label className="font-medium text-gray-700 whitespace-nowrap">
                          Account No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="border px-2.5 py-1.5 rounded w-full"
                          value={currentBank.account_no || ""}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              account_no: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Swift Code / BIC
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.swift_code || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            swift_code: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">IBAN</label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.iban || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            iban: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        className="col-span-2 border px-2.5 py-1.5 rounded bg-white"
                        value={currentBank.currency || "British Pound"}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            currency: e.target.value,
                          })
                        }
                      >
                        <option value="British Pound">British Pound</option>
                        <option value="US Dollar">US Dollar</option>
                        <option value="Euro">Euro</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        G/L No.
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.gl_no || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            gl_no: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

           
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.bank_name || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            bank_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.address_line1 || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            address_line1: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.address_line2 || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            address_line2: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <span />
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentBank.city || ""}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              city: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="County"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentBank.county || ""}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              county: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <span />
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Postcode"
                          className="border px-2.5 py-1.5 rounded"
                          value={currentBank.postal_code || ""}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              postal_code: e.target.value,
                            })
                          }
                        />
                        <MasterDropdown
                          type="country"
                          value={currentBank.country_code || "Select Country"}
                          onChange={(e) =>
                            setCurrentBank({
                              ...currentBank,
                              country_code: e.target.value,
                            })
                          }
                          className="border px-2.5 py-1.5 rounded"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.contact_name || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            contact_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Mobile
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.mobile || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            mobile: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">
                        Telephone
                      </label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.telephone || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            telephone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">Fax</label>
                      <input
                        type="text"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.fax || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            fax: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        placeholder="e.g. myname@example.com"
                        className="col-span-2 border px-2.5 py-1.5 rounded"
                        value={currentBank.email || ""}
                        onChange={(e) =>
                          setCurrentBank({
                            ...currentBank,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="border border-emerald-700 text-emerald-800 hover:bg-emerald-50 px-5 py-1.5 rounded font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankMode("list")}
                    className="border border-gray-300 hover:bg-gray-50 px-5 py-1.5 rounded font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}


        {[
          "financial-settings",
          "currency",
          "password-settings",
          "virtual-emails",
        ].includes(activeTab) && (
          <div className="py-12 text-center text-gray-500 border rounded bg-gray-50">
            {tabs.find((t) => t.id === activeTab)?.label} configuration panel.
          </div>
        )}
      </div>
    </div>
  );
} */
/* "use client";

import MasterDropdown from "@/app/components/common/MasterDropdown";
import { useEffect, useState } from "react";

interface CompanyProfile {
  name: string;
  slug: string;
  legal_name: string;
  tax_identifier: string;
  website: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  inventory_system: string;
  plan: string;
  subscription_status: string;
}

export default function CompanySetupForm() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/setup/general/company")
      .then((res) => {
        if (!res.ok)
          throw new Error("Could not pull organizational settings profiles.");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/setup/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) throw new Error("Could not save operational settings.");
      setMessage({
        type: "success",
        text: "Global organization profiles updated successfully.",
      });
    } catch (err) {
      if (err instanceof Error) {
        setMessage({
          type: "error",
          text: err.message,
        });
      } else {
        setMessage({
          type: "error",
          text: "An unexpected operation failure occurred.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-xs text-gray-500">
        Retrieving operational configurations...
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8  bg-white text-black  p-8 border rounded shadow-sm"
    >
      
      {message.text && (
        <div
          className={`p-4 border text-xs rounded ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

   
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company Settings</h2>
          <p className="text-xs text-gray-500">
            Configure global metadata structures, localizations, and corporate
            billing details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded font-semibold uppercase">
            Plan: {profile?.plan}
          </span>
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded font-semibold uppercase">
            Status: {profile?.subscription_status}
          </span>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="space-y-4">


          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Name *
            </label>
            <input
              type="text"
              name="name"
              required
              className="border px-3 py-2 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={profile?.name || ""}
              onChange={handleChange}
            />
          </div>



          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Tax Registration Reference Number (EIN / VAT / ID)
            </label>
            <input
              type="text"
              name="tax_identifier"
              className="border px-3 py-2 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={profile?.tax_identifier || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">
              Environment System Access URL Slug (Locked)
            </label>
            <input
              type="text"
              disabled
              className="border px-3 py-2 rounded text-xs bg-gray-50 text-gray-400 font-mono cursor-not-allowed"
              value={profile?.slug || ""}
            />
          </div>
        </div>


        <div className="space-y-4">


          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.email || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Phone</label>
            <input
              type="text"
              name="phone"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.phone || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Web URL
            </label>
            <input
              type="text"
              name="website"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.website || ""}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Default Valuation Accounting Model Engine
            </label>
            <select
              name="inventory_system"
              className="border px-3 py-2 rounded text-xs bg-white font-medium"
              value={profile?.inventory_system || "PERIODIC"}
              onChange={handleChange}
            >
              <option value="PERIODIC">
                Periodic Inventory Model Structure
              </option>
              <option value="PERPETUAL">
                Perpetual Synchronous Asset Model Engine
              </option>
            </select>
          </div>
        </div>
      </div>

      <hr className="my-2" />


      <div className="space-y-4">
        <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
          Address
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Address Line 1
            </label>
            <input
              type="text"
              name="address_line1"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.address_line1 || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Address Line 2
            </label>
            <input
              type="text"
              name="address_line2"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.address_line2 || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">City</label>
            <input
              type="text"
              name="city"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.city || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              State / Province
            </label>
            <input
              type="text"
              name="state_province"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.state_province || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Post Code
            </label>
            <input
              type="text"
              name="postal_code"
              className="border px-3 py-2 rounded text-xs bg-white"
              value={profile?.postal_code || ""}
              onChange={handleChange}
            />
          </div>

          <MasterDropdown
            type="country"
            value={profile?.country_code || "United Kingdom"}
            onChange={handleChange}
            className="border px-3 py-2 rounded text-xs bg-white"
            defaultFilter={(item) => item.country_id === 225}
          />
          
        </div>
      </div>


      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-xs px-6 py-2.5 rounded transition-all shadow-sm"
        >
          {saving
            ? "Persisting Settings Changes..."
            : "Save Configuration Profiles"}
        </button>
      </div>
    </form>
  );
} */

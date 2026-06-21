// components/parties/tabs/GeneralTab.tsx

"use client";

import React, { useEffect, useState } from "react";
import type { Party } from "@/types/erp";

export type CompanyCurrency = {
  id: string; 
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

interface SetupDropdownItem {
  id: string;
  name: string;
}

type Props = {
  account: Partial<Party>;
  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  currencies?: CompanyCurrency[];
};

export default function GeneralTab({
  account,
  setAccount,
  isReadonly = false,
  errors,
  currencies = [],
}: Props) {
  // Setup module state hooks for dropdown populating
  const [segments, setSegments] = useState<SetupDropdownItem[]>([]);
  const [territories, setTerritories] = useState<SetupDropdownItem[]>([]);
  const [buyingGroups, setBuyingGroups] = useState<SetupDropdownItem[]>([]);
  const [creditRatings, setCreditRatings] = useState<SetupDropdownItem[]>([]);

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const getInputClass = (errorKey: string) => 
    `w-full border p-2 rounded text-sm bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white ${
      errors[errorKey] ? "border-red-500 bg-red-50/10" : "border-slate-300 dark:border-slate-700"
    }`;

  // Core module resolution
  const activeModule = account.is_customer || account.is_crm_lead ? "sales" : "purchases";

  // Fetch setup config dropdown items based on active role context
  useEffect(() => {
    async function fetchSetupDropdowns() {
      try {
        const [segRes, terrRes, bgRes, crRes] = await Promise.all([
          fetch(`/api/setup/sales/segments?module=${activeModule}`),
          fetch(`/api/setup/sales/territories?module=${activeModule}`),
          fetch("/api/setup/sales/buying_groups"),
          fetch("/api/setup/sales/credit_ratings")
        ]);

        if (segRes.ok) setSegments(await segRes.json());
        if (terrRes.ok) setTerritories(await terrRes.json());
        if (bgRes.ok) setBuyingGroups(await bgRes.json());
        if (crRes.ok) setCreditRatings(await crRes.json());
      } catch (err) {
        console.error("Error populating ledger configuration setups:", err);
      }
    }
    fetchSetupDropdowns();
  }, [activeModule]);

  return (
    <div className="space-y-6">
      {/* TWO COLUMN MASTER WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: IDENTITY & PRIMARY CONTACT PARAMETERS */}
        <div className="space-y-4">
          
          {/* Row 1: Code / Index Counter Identifier */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {account.is_customer ? "Customer No." : account.is_supplier ? "Supplier No." : "CRM Lead No."}
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled
                className="w-full bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono text-slate-500"
                value={
                  (account.is_customer ? account.customer_code : 
                   account.is_supplier ? account.supplier_code : 
                   account.is_crm_lead ? account.crm_code : account.srm_code) || "[Auto-Generated]"
                }
              />
            </div>
          </div>

          {/* Row 2: Corporate Name */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={getInputClass("general.name")}
                placeholder="Legal Business Name"
              />
              {errors["general.name"] && <p className="text-red-500 text-xs mt-0.5">{errors["general.name"]}</p>}
            </div>
          </div>

          {/* Row 3: Inline Primary Location Address Fields */}
          <div className="grid grid-cols-3 gap-2 items-start">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-1">Address Lines</label>
            <div className="col-span-2 space-y-2">
              <input type="text" placeholder="Address Line 1" className={getInputClass("general.address_1")} />
              <input type="text" placeholder="Address Line 2 (Optional)" className={getInputClass("general.address_2")} />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="City" className={getInputClass("general.city")} />
                <input type="text" placeholder="County / State" className={getInputClass("general.state")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Postcode" className={getInputClass("general.postcode")} />
                <input type="text" placeholder="Country" defaultValue="United Kingdom" className={getInputClass("general.country")} />
              </div>
            </div>
          </div>

          {/* Row 4: Switchboard Connections */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telephone</label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className={getInputClass("general.phone")}
                placeholder="01326 564564"
              />
            </div>
          </div>

          {/* Row 5: Central Electronic Correspondence Email */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Email</label>
            <div className="col-span-2">
              <input
                type="email"
                value={account.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className={getInputClass("general.email")}
                placeholder="info@company.com"
              />
            </div>
          </div>

          {/* Row 6: Corporate Website */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Web</label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                className={getInputClass("general.website")}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Row 7: Functional Operational State */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status <span className="text-red-500">*</span></label>
            <div className="col-span-2">
              <select
                value={account.status || "active"}
                onChange={(e) => updateField("status", e.target.value as "active" | "inactive" | "prospect" | "suspended")}
                className={getInputClass("general.status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Row 8: VAT Registration Identification Field (From Screen Layout) */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">VAT Reg No.</label>
            <div className="col-span-2">
              <input
                type="text"
                placeholder="GB123456789"
                className={getInputClass("general.vat_reg_no")}
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REVENUE ARCHITECTURE & DYNAMIC ROUTING DROP-DOWNS */}
        <div className="space-y-4">
          
          {/* Missing Checklist Block: Account Location Profile Matrix (From Screen Layout) */}
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Location Type Rules</span>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> Billing
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" /> Shipping
              </label>
              {account.is_supplier && (
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /> Collection
                </label>
              )}
            </div>
          </div>

          {/* Setup Config Dropdown 1: Credit Rating Framework */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Credit Rating</label>
            <div className="col-span-2">
              <select className={getInputClass("general.credit_rating_id")}>
                <option value="">Select Credit Rating...</option>
                {creditRatings.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Setup Config Field 2: Conditional Risk Boundary Limits */}
          {(account.is_customer || account.is_crm_lead) && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Credit Limit</label>
              <div className="col-span-2">
                <input
                  type="number"
                  value={account.credit_limit ?? 0}
                  onChange={(e) => updateField("credit_limit", Number(e.target.value))}
                  className={getInputClass("general.credit_limit")}
                />
              </div>
            </div>
          )}

          {/* Core System Matrix Field 3: Currency Node Mapping */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency <span className="text-red-500">*</span></label>
            <div className="col-span-2">
              <select
                value={account.currency_id || ""}
                onChange={(e) => updateField("currency_id", e.target.value)}
                className={getInputClass("general.currency_id")}
              >
                <option value="">Select System Currency...</option>
                {currencies.map((curr) => (
                  <option key={curr.id} value={curr.id}>
                    {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Setup Config Dropdown 4: Target Segment Selection */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Segment <span className="text-red-500">*</span></label>
            <div className="col-span-2">
              <select className={getInputClass("general.segment_id")}>
                <option value="">Select Segment...</option>
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>{seg.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Setup Config Dropdown 5: Regional Allocation Territory */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Territory</label>
            <div className="col-span-2">
              <select className={getInputClass("general.territory_id")}>
                <option value="">Select Territory...</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Setup Config Dropdown 6: Bulk Commercial Buying/Selling Groups */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {account.is_customer ? "Buying Group" : "Selling Group"}
            </label>
            <div className="col-span-2">
              <select className={getInputClass("general.buying_group_id")}>
                <option value="">Select Group Allocation...</option>
                {buyingGroups.map((bg) => (
                  <option key={bg.id} value={bg.id}>{bg.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Financial Architecture Dropdown 7: Dynamic Subledger Posting Integration Rules */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Posting Group</label>
            <div className="col-span-2">
              <select
                value={(account.is_customer ? account.sales_posting_group_id : account.purchase_posting_group_id) || ""}
                onChange={(e) => updateField(account.is_customer ? "sales_posting_group_id" : "purchase_posting_group_id", e.target.value)}
                className={getInputClass("general.posting_group_id")}
              >
                <option value="">Select Ledger Control Profile...</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER BLOCK: DIRECT EXTENDED AUDIT / REFERENCE CONTROLS FROM WORKSPACE */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Primary Contact Quick View</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">Contact Name</label>
              <input type="text" className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-sm dark:bg-slate-900" placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">Job Title</label>
              <input type="text" className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-sm dark:bg-slate-900" placeholder="Procurement Manager" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">Direct Line</label>
              <input type="text" className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-sm dark:bg-slate-900" placeholder="Ext 401" />
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">Mobile Connection</label>
              <input type="text" className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-sm dark:bg-slate-900" placeholder="07xxx xxxxxx" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import React from "react";
import type { Party } from "@/types/erp";

export type CompanyCurrency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type Props = {
  account: Partial<Party>;
  setAccount: React.Dispatch<React.SetStateAction<Partial<Party>>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  currencies?: CompanyCurrency[];
};

export default function GeneralTab({
  account,
  setAccount,
  isReadonly = false,
  errors,
  currencies = [],
}: Props) {
  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const getInputClass = (errorKey: string) =>
    `w-full border p-2 rounded text-sm bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white ${
      errors[errorKey]
        ? "border-red-500 bg-red-50/10"
        : "border-slate-300 dark:border-slate-700"
    }`;

  // Helper to determine active entity profile context
  const isCrmOrCustomer = account.is_crm_lead || account.is_customer;
  const isSupplierOrSrm = account.is_supplier || account.is_srm_vendor;

  return (
    <div className="space-y-6">
  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
 
        <div className="space-y-4">
    
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {account.is_customer
                ? "Customer No."
                : account.is_supplier
                  ? "Supplier No."
                  : "CRM No."}
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled
                className="w-full bg-slate-100 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono text-slate-500"
                value={
                  (account.is_customer
                    ? account.customer_code
                    : account.is_supplier
                      ? account.supplier_code
                      : account.is_crm_lead
                        ? account.crm_code
                        : account.srm_code) || "[Auto-Generated]"
                }
              />
            </div>
          </div>

   
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={getInputClass("general.name")}
                placeholder="Legal Business Name"
              />
              {errors["general.name"] && (
                <p className="text-red-500 text-xs mt-0.5">
                  {errors["general.name"]}
                </p>
              )}
            </div>
          </div>

      
          <div className="grid grid-cols-3 gap-2 items-start">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-1">
              Address Lines
            </label>
            <div className="col-span-2 space-y-2">
              <input
                type="text"
                placeholder="Address Line 1"
                className={getInputClass("general.address_1")}
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                className={getInputClass("general.address_2")}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  className={getInputClass("general.city")}
                />
                <input
                  type="text"
                  placeholder="County / State"
                  className={getInputClass("general.state")}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={getInputClass("general.postcode")}
                />
                <select className={getInputClass("general.country")}>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                </select>
              </div>
            </div>
          </div>

       
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Telephone
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className={getInputClass("general.phone")}
                placeholder="01326 564564"
              />
            </div>
          </div>

 
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Company Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                value={account.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className={getInputClass("general.email")}
                placeholder="info@company.com"
              />
            </div>
          </div>

  
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Web
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                className={getInputClass("general.website")}
                placeholder="https://..."
              />
            </div>
          </div>

 
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                value={account.status || "active"}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value as
                      | "active"
                      | "inactive"
                      | "prospect"
                      | "suspended",
                  )
                }
                className={getInputClass("general.status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

 
        <div className="space-y-4">
 
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Credit Rating
            </label>
            <div className="col-span-2">
              <select className={getInputClass("general.credit_rating")}>
                <option value="">Select Credit Rating</option>
                <option value="good">Good Tier 1</option>
                <option value="risk">High Risk Account</option>
              </select>
            </div>
          </div>

 
          {isCrmOrCustomer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Credit Limit
              </label>
              <div className="col-span-2">
                <input
                  type="number"
                  value={account.credit_limit ?? 0}
                  onChange={(e) =>
                    updateField("credit_limit", Number(e.target.value))
                  }
                  className={getInputClass("general.credit_limit")}
                />
              </div>
            </div>
          )}

    
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Currency <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                value={account.currency_id || ""}
                onChange={(e) => updateField("currency_id", e.target.value)}
                className={getInputClass("general.currency_id")}
              >
                <option value="">Select Currency</option>
                {currencies.map((curr) => (
                  <option key={curr.id} value={curr.id}>
                    {curr.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

 
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Segment <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select className={getInputClass("general.segment")}>
                <option value="Competitor">Competitor</option>
                <option value="Standard Retail">Standard Retail</option>
                <option value="Cycle Shops">Cycle Shops</option>
              </select>
            </div>
          </div>

      
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Posting Group
            </label>
            <div className="col-span-2">
              <select
                value={
                  (account.is_customer
                    ? account.sales_posting_group_id
                    : account.purchase_posting_group_id) || ""
                }
                onChange={(e) =>
                  updateField(
                    account.is_customer
                      ? "sales_posting_group_id"
                      : "purchase_posting_group_id",
                    e.target.value,
                  )
                }
                className={getInputClass("general.posting_group_id")}
              >
                <option value="">Select Posting Group</option>
              </select>
            </div>
          </div>

       
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Additional Info
            </label>
            <div className="col-span-2">
              <input
                type="text"
                placeholder="xyz"
                className={getInputClass("general.additional_info")}
              />
            </div>
          </div>
        </div>
      </div>

   
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Primary Contact Context Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">
                Contact Name
              </label>
              <input
                type="text"
                className="col-span-2 p-2 border rounded text-sm"
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">
                Job Title
              </label>
              <input
                type="text"
                className="col-span-2 p-2 border rounded text-sm"
                placeholder="Procurement Manager"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">
                Direct Line
              </label>
              <input
                type="text"
                className="col-span-2 p-2 border rounded text-sm"
                placeholder="Ext 401"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-500">
                Mobile
              </label>
              <input
                type="text"
                className="col-span-2 p-2 border rounded text-sm"
                placeholder="07xxx xxxxxx"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} */

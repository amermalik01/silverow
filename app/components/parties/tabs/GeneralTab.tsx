// components/parties/tabs/GeneralTab.tsx

"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "../../common/MasterDropdown";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

interface PostingGroupItem {
  id: string;
  name: string;
}

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
  contacts?: PartyContactDraft[];
  setContacts?: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  addresses?: PartyAddressDraft[];
  setAddresses?: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;

  isReadonly?: boolean;
  errors: Record<string, string>;
  currencies?: CompanyCurrency[];
};

export default function GeneralTab({
  account,
  setAccount,
  contacts = [],
  setContacts,
  addresses = [],
  setAddresses,
  isReadonly = false,
  errors,
  currencies = [],
}: Props) {
  const [segments, setSegments] = useState<SetupDropdownItem[]>([]);
  const [territories, setTerritories] = useState<SetupDropdownItem[]>([]);
  const [buyingGroups, setBuyingGroups] = useState<SetupDropdownItem[]>([]);
  const [creditRatings, setCreditRatings] = useState<SetupDropdownItem[]>([]);
  const [ownershipType, setOwnershipType] = useState<SetupDropdownItem[]>([]);
  const [type, setType] = useState<SetupDropdownItem[]>([]);
  const [status, setStatus] = useState<SetupDropdownItem[]>([]);
  const [classification, setClassification] = useState<SetupDropdownItem[]>([]);
  const [sourceOfCRM, setSourceOfCRM] = useState<SetupDropdownItem[]>([]);

  const [salesPostingGroups, setSalesPostingGroups] = useState<
    PostingGroupItem[]
  >([]);
  const [purchasePostingGroups, setPurchasePostingGroups] = useState<
    PostingGroupItem[]
  >([]);

  const [salespersonModalOpen, setSalespersonModalOpen] =
    useState<boolean>(false);

  const primaryAddress = addresses.find((a) => a.is_primary) ||
    addresses[0] || {
      label: "Main Address",
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      postcode: "",
      country: "United Kingdom",
      is_primary: true,
      is_billing: true,
      is_shipping: true,
      is_collection: false,
    };

  const primaryContact = contacts.find((c) => c.is_primary) ||
    contacts[0] || {
      name: "",
      job_title: "",
      phone: "",
      mobile: "",
      email: "",
      is_primary: true,
    };

  const handleAssignPersonSelect = (emp: Employee) => {
    setAccount((prev) => ({
      ...prev,
      assign_person_id: emp.id,
      assign_person: emp.employee_code + "-" + emp.display_name,
    }));
    setSalespersonModalOpen(false);
  };

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const updatePrimaryAddress = (
    field: keyof PartyAddressDraft,
    value: unknown,
  ) => {
    if (!setAddresses) return;

    setAddresses((prev) => {
      const existingIdx = prev.findIndex((a) => a.is_primary);
      const updatedAddress = {
        ...(existingIdx >= 0 ? prev[existingIdx] : primaryAddress),
        [field]: value,
        is_primary: true,
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedAddress;
        return copy;
      } else {
        return [updatedAddress, ...prev];
      }
    });
  };

  const updatePrimaryContact = (
    field: keyof PartyContactDraft,
    value: unknown,
  ) => {
    if (!setContacts) return;

    setContacts((prev) => {
      const existingIdx = prev.findIndex((c) => c.is_primary);
      const updatedContact = {
        ...(existingIdx >= 0 ? prev[existingIdx] : primaryContact),
        [field]: value,
        is_primary: true,
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedContact;
        return copy;
      } else {
        return [updatedContact, ...prev];
      }
    });
  };

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const activeModule =
    account.is_customer || account.is_crm_lead ? "sales" : "purchases";

  useEffect(() => {
    async function fetchSetupDropdowns() {
      try {
        const [
          segRes,
          terrRes,
          bgRes,
          crRes,
          otRes,
          classificationRes,
          tpRes,
          statusRes,
          sourcesRes,
          salesGroupRes,
          purchaseGroupRes,
        ] = await Promise.all([
          fetch(`/api/setup/sales/segments?module=${activeModule}`),
          fetch(`/api/setup/sales/territories?module=${activeModule}`),
          fetch("/api/setup/sales/buying_groups"),
          fetch("/api/setup/sales/credit_ratings"),
          fetch("/api/setup/sales/ownership_type"),
          fetch(`/api/setup/sales/classification?module=${activeModule}`),
          fetch("/api/setup/sales/type"),
          fetch("/api/setup/sales/status"),
          fetch("/api/setup/sales/sources"),

          fetch("/api/setup/finance/sales-posting-groups"),
          fetch("/api/setup/finance/purchase-posting-groups"),
        ]);

        if (segRes.ok) setSegments(await segRes.json());
        if (terrRes.ok) setTerritories(await terrRes.json());
        if (bgRes.ok) setBuyingGroups(await bgRes.json());
        if (crRes.ok) setCreditRatings(await crRes.json());
        if (otRes.ok) setOwnershipType(await otRes.json());
        if (classificationRes.ok)
          setClassification(await classificationRes.json());
        if (tpRes.ok) setType(await tpRes.json());
        if (statusRes.ok) setStatus(await statusRes.json());
        if (sourcesRes.ok) setSourceOfCRM(await sourcesRes.json());

        if (salesGroupRes.ok) setSalesPostingGroups(await salesGroupRes.json());
        if (purchaseGroupRes.ok)
          setPurchasePostingGroups(await purchaseGroupRes.json());
      } catch (err) {
        console.error("Error populating ledger configuration setups:", err);
      }
    }
    fetchSetupDropdowns();
  }, [activeModule]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {account.is_customer
                ? "Customer No."
                : account.is_supplier
                  ? "Supplier No."
                  : "CRM Lead No."}
            </label>
            <div className="col-span-2">
              <input
                type="text"
                disabled
                className="w-full bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-500"
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={getInputClass("general.name")}
                placeholder="Business Name"
                disabled={isReadonly}
              />
              {errors["general.name"] && (
                <p className="text-red-500 text-xs mt-0.5">
                  {errors["general.name"]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-start">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pt-1">
              Address Lines
            </label>
            <div className="col-span-2 space-y-2">
              <input
                type="text"
                placeholder="Address Line 1"
                value={primaryAddress.address_1 || ""}
                onChange={(e) =>
                  updatePrimaryAddress("address_1", e.target.value)
                }
                className={getInputClass("general.address_1")}
                disabled={isReadonly}
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={primaryAddress.address_2 || ""}
                onChange={(e) =>
                  updatePrimaryAddress("address_2", e.target.value)
                }
                className={getInputClass("general.address_2")}
                disabled={isReadonly}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={primaryAddress.city || ""}
                  onChange={(e) => updatePrimaryAddress("city", e.target.value)}
                  className={getInputClass("general.city")}
                  disabled={isReadonly}
                />
                <input
                  type="text"
                  placeholder="County / State"
                  value={primaryAddress.state || ""}
                  onChange={(e) =>
                    updatePrimaryAddress("state", e.target.value)
                  }
                  className={getInputClass("general.state")}
                  disabled={isReadonly}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Postcode"
                  value={primaryAddress.postcode || ""}
                  onChange={(e) =>
                    updatePrimaryAddress("postcode", e.target.value)
                  }
                  className={getInputClass("general.postcode")}
                  disabled={isReadonly}
                />

                <MasterDropdown
                  type="country"
                  value={primaryAddress.country || account.country || "UK"}
                  displayFormat="name"
                  valueKey="code"
                  onChange={(val) => {
                    updatePrimaryAddress("country", val ?? "");
                    updateField("country", val ?? "");
                  }}
                  className={getInputClass("general.country")}
                  disabled={isReadonly}
                  defaultFilter={(item) =>
                    item.code === "UK" || item.country_id === 225
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Telephone
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className={getInputClass("general.phone")}
                placeholder="01326 564564"
                disabled={isReadonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Company Email
            </label>
            <div className="col-span-2">
              <input
                type="email"
                value={account.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className={getInputClass("general.email")}
                placeholder="info@company.com"
                disabled={isReadonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Web
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                className={getInputClass("general.website")}
                placeholder="https://..."
                disabled={isReadonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Assign Person
            </label>
            <div className="col-span-2 flex gap-1">
              <input
                type="text"
                readOnly
                value={account.assign_person || "Select Person..."}
                className={getInputClass("general.assign_person")}
              />
              <button
                type="button"
                disabled={isReadonly}
                onClick={() => setSalespersonModalOpen(true)}
                className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
              >
                <Icon icon="tabler:external-link" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.status || "active"}
                onChange={(e) =>
                  updateField("status", e.target.value as Party["status"])
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

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              VAT Reg No.
            </label>
            <div className="col-span-2">
              <input
                type="text"
                value={account.vat_reg_no || ""}
                onChange={(e) => updateField("vat_reg_no", e.target.value)}
                placeholder="GB123456789"
                className={getInputClass("general.vat_reg_no")}
                disabled={isReadonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Segment
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.segment_id || ""}
                onChange={(e) => updateField("segment_id", e.target.value)}
                className={getInputClass("general.segment_id")}
              >
                <option value="">Select Segment...</option>
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name}
                  </option>
                ))}
              </select>

              {errors["general.segment_id"] && (
                <p className="text-red-500 text-xs mt-0.5">
                  {errors["general.segment_id"]}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Territory
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.territory_id || ""}
                onChange={(e) => updateField("territory_id", e.target.value)}
                className={getInputClass("general.territory_id")}
              >
                <option value="">Select Territory...</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Location Type
            </label>
            <div className="col-span-2">
              <div className="flex flex-wrap gap-4 text-xs font-medium p-2 mb-1">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!primaryAddress.is_billing}
                    onChange={(e) =>
                      updatePrimaryAddress("is_billing", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />{" "}
                  Billing
                </label>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!primaryAddress.is_shipping}
                    onChange={(e) =>
                      updatePrimaryAddress("is_shipping", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />{" "}
                  Shipping
                </label>
                {account.is_supplier && (
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!primaryAddress.is_collection}
                      onChange={(e) =>
                        updatePrimaryAddress("is_collection", e.target.checked)
                      }
                      disabled={isReadonly}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />{" "}
                    Collection
                  </label>
                )}
              </div>
            </div>
          </div>

          {(account.is_customer || account.is_crm_lead) && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Credit Rating
              </label>
              <div className="col-span-2">
                <select
                  disabled={isReadonly}
                  value={account.credit_rating_id || ""}
                  onChange={(e) =>
                    updateField("credit_rating_id", e.target.value)
                  }
                  className={getInputClass("general.credit_rating_id")}
                >
                  <option value="">Select Credit Rating...</option>
                  {creditRatings.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {account.is_customer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Credit Limit
              </label>
              <div className="col-span-2">
                <input
                  type="number"
                  disabled={isReadonly}
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Currency <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.currency_id || ""}
                onChange={(e) => updateField("currency_id", e.target.value)}
                className={getInputClass("general.currency_id")}
              >
                <option value="">Select Currency...</option>
                {currencies.map((curr) => (
                  <option key={curr.id} value={curr.id}>
                    {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(account.is_customer || account.is_crm_lead) && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Ownership Type
                </label>
                <div className="col-span-2">
                  <select
                    disabled={isReadonly}
                    value={account.ownership_type_id || ""}
                    onChange={(e) =>
                      updateField("ownership_type_id", e.target.value)
                    }
                    className={getInputClass("general.ownership_type_id")}
                  >
                    <option value="">Select Ownership Type...</option>
                    {ownershipType.map((ot) => (
                      <option key={ot.id} value={ot.id}>
                        {ot.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No. Of Employee(s)
                </label>
                <div className="grid grid-cols-3 gap-2 col-span-2">
                  <input
                    type="text"
                    disabled={isReadonly}
                    placeholder="No. Of Employee(s)"
                    value={account.no_of_emp ?? 0}
                    onChange={(e) =>
                      updateField("no_of_emp", Number(e.target.value))
                    }
                    className={getInputClass("general.no_of_emp")}
                  />

                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Turnover
                  </label>
                  <div>
                    <input
                      type="text"
                      disabled={isReadonly}
                      placeholder="Turnover"
                      value={account.turnover ?? 0}
                      onChange={(e) =>
                        updateField("turnover", Number(e.target.value))
                      }
                      className={getInputClass("general.turnover")}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Company Reg. No.
                </label>
                <div className="grid grid-cols-3 gap-2 col-span-2">
                  <input
                    type="text"
                    disabled={isReadonly}
                    placeholder="Company Reg. No."
                    value={account.comp_reg_no ?? 0}
                    onChange={(e) => updateField("comp_reg_no", e.target.value)}
                    className={getInputClass("general.comp_reg_no")}
                  />

                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 align-middle">
                    Date Of Inc.
                  </label>

                  <input
                    type="date"
                    disabled={isReadonly}
                    value={
                      account.date_of_inc
                        ? String(account.date_of_inc).split("T")[0]
                        : ""
                    }
                    onChange={(e) => updateField("date_of_inc", e.target.value)}
                    className={getInputClass("general.date_of_inc")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sales Status
                </label>
                <div className="col-span-2">
                  <select
                    disabled={isReadonly}
                    value={account.status_id || ""}
                    onChange={(e) => updateField("status_id", e.target.value)}
                    className={getInputClass("general.status_id")}
                  >
                    <option value="">Select Status...</option>
                    {status.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Source Of CRM
                </label>
                <div className="col-span-2">
                  <select
                    disabled={isReadonly}
                    value={account.source_of_crm_id || ""}
                    onChange={(e) =>
                      updateField("source_of_crm_id", e.target.value)
                    }
                    className={getInputClass("general.source_of_crm_id")}
                  >
                    <option value="">Select Source...</option>
                    {sourceOfCRM.map((src) => (
                      <option key={src.id} value={src.id}>
                        {src.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Type
                </label>
                <div className="col-span-2">
                  <select
                    disabled={isReadonly}
                    value={account.type_id || ""}
                    onChange={(e) => updateField("type_id", e.target.value)}
                    className={getInputClass("general.type_id")}
                  >
                    <option value="">Select Type...</option>
                    {type.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {account.is_crm_lead || account.is_customer
                ? "Buying Group"
                : "Selling Group"}
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.buying_group_id || ""}
                onChange={(e) => updateField("buying_group_id", e.target.value)}
                className={getInputClass("general.buying_group_id")}
              >
                <option value="">Select Group Allocation...</option>
                {buyingGroups.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Classification
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={account.classification_id || ""}
                onChange={(e) =>
                  updateField("classification_id", e.target.value)
                }
                className={getInputClass("general.classification_id")}
              >
                <option value="">Select Classification...</option>
                {classification.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Business Posting Group <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2">
              <select
                disabled={isReadonly}
                value={
                  (account.is_customer
                    ? account.sales_posting_group_id
                    : account.purchase_posting_group_id) || ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (account.is_customer) {
                    updateField("sales_posting_group_id", val);
                  } else {
                    updateField("purchase_posting_group_id", val);
                  }
                }}
                className={
                  getInputClass(
                    account.is_customer
                      ? "general.sales_posting_group_id"
                      : "general.purchase_posting_group_id",
                  ) || getInputClass("general.posting_group_id")
                }
              >
                <option value="">Select Ledger Control Profile...</option>
                {account.is_customer
                  ? salesPostingGroups.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.name}
                      </option>
                    ))
                  : purchasePostingGroups.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.name}
                      </option>
                    ))}
              </select>

              {account.is_customer &&
                errors?.["general.sales_posting_group_id"] && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors["general.sales_posting_group_id"]}
                  </span>
                )}

              {!account.is_customer &&
                errors?.["general.purchase_posting_group_id"] && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors["general.purchase_posting_group_id"]}
                  </span>
                )}
            </div>
          </div> */}

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Additional Information
            </label>
            <div className=" col-span-2">
              <input
                type="text"
                disabled={isReadonly}
                placeholder="Additional Information"
                value={account.additional_information || ""}
                onChange={(e) =>
                  updateField("additional_information", e.target.value)
                }
                className={getInputClass("general.additional_information")}
              />
            </div>
          </div>

          {account.is_supplier && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Anonymous Supplier
              </label>

              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-xs font-medium p-2 w-8">
                  <input
                    type="checkbox"
                    disabled={isReadonly}
                    checked={!!account.anonymous_supplier}
                    onChange={(e) =>
                      updateField("anonymous_supplier", e.target.checked)
                    }
                    className={getInputClass("general.anonymous_supplier")}
                  />
                </div>
              </div>
            </div>
          )}

          {account.is_customer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Anonymous Customer
              </label>

              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-xs font-medium p-2 w-8">
                  <input
                    type="checkbox"
                    disabled={isReadonly}
                    checked={!!account.anonymous_customer}
                    onChange={(e) =>
                      updateField("anonymous_customer", e.target.checked)
                    }
                    className={getInputClass("general.anonymous_customer")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4">
          Primary Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact Name
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={isReadonly}
                  value={primaryContact.name || ""}
                  onChange={(e) => updatePrimaryContact("name", e.target.value)}
                  className={getInputClass("primaryContact.name")}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={isReadonly}
                  value={primaryContact.job_title || ""}
                  onChange={(e) =>
                    updatePrimaryContact("job_title", e.target.value)
                  }
                  className={getInputClass("primaryContact.job_title")}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={isReadonly}
                  value={primaryContact.email || ""}
                  onChange={(e) =>
                    updatePrimaryContact("email", e.target.value)
                  }
                  className={getInputClass("primaryContact.email")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Direct Line
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={isReadonly}
                  value={primaryContact.phone || ""}
                  onChange={(e) =>
                    updatePrimaryContact("phone", e.target.value)
                  }
                  className={getInputClass("primaryContact.phone")}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mobile
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  disabled={isReadonly}
                  value={primaryContact.mobile || ""}
                  onChange={(e) =>
                    updatePrimaryContact("mobile", e.target.value)
                  }
                  className={getInputClass("primaryContact.mobile")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// components/parties/tabs/GeneralTab.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "../../common/MasterDropdown";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";
import SelectWithAddModal from "../../common/SelectWithAddModal";

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

export interface CustomerSummaryMetrics {
  customerSince?: string;
  creditLimitFormatted?: string;
  totalOrdersThisYear?: number | string;
  totalSpendThisYearFormatted?: string;
  lastActivityDate?: string;
  openOutstandingFormatted?: string;
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
  summaryMetrics?: CustomerSummaryMetrics;
  onOpenActivities?: () => void;
  onOpenStatement?: () => void;
  onOpenSalespersonDetail?: (personId?: string | number) => void;
};

function getInitials(name?: string): string {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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
  summaryMetrics,
  onOpenActivities,
  onOpenStatement,
  onOpenSalespersonDetail,
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
  const [activeContactTab, setActiveContactTab] = useState<
    "primary" | "secondary"
  >("primary");
  const [selectedSecondaryIdx, setSelectedSecondaryIdx] = useState<number>(0);

  const primaryAddress = useMemo(
    () =>
      addresses.find((a) => a.is_primary) ||
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
      },
    [addresses],
  );

  const primaryContact = useMemo(
    () =>
      contacts.find((c) => c.is_primary) ||
      contacts[0] || {
        name: "",
        job_title: "",
        phone: "",
        mobile: "",
        email: "",
        is_primary: true,
      },
    [contacts],
  );

  const secondaryContacts = useMemo(
    () => contacts.filter((c) => c !== primaryContact),
    [contacts, primaryContact],
  );

  const activeContact =
    activeContactTab === "primary"
      ? primaryContact
      : secondaryContacts[selectedSecondaryIdx] || primaryContact;

  const handleAssignPersonSelect = (emp: Employee) => {
    setAccount((prev) => ({
      ...prev,
      assign_person_id: emp.id,
      assign_person: `${emp.employee_code}-${emp.display_name}`,
    }));
    setSalespersonModalOpen(false);
  };

  const updateField = <K extends keyof Party>(key: K, value: Party[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeWebsite = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
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
      }
      return [updatedAddress, ...prev];
    });
  };

  const updateContactAtIndex = (
    targetContact: PartyContactDraft,
    field: keyof PartyContactDraft,
    value: unknown,
  ) => {
    if (!setContacts) return;
    setContacts((prev) => {
      if (prev.length === 0) {
        return [{ ...primaryContact, [field]: value, is_primary: true }];
      }
      const idx = prev.findIndex((c) => c === targetContact);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [field]: value };
        return copy;
      }
      return prev;
    });
  };

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-black dark:text-slate-300 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/20 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500";

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
      } catch (err) {
        console.error("Error populating ledger configuration setups:", err);
      }
    }
    fetchSetupDropdowns();
  }, [activeModule]);

  const cardClass =
    "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] p-4 shadow-2xs transition-colors";

  const sectionHeaderClass =
    "flex items-center justify-between gap-2 text-sm font-semibold text-black dark:text-slate-100 mb-3.5";

  const assignedPersonParts = useMemo(() => {
    const raw = account.assign_person || "";
    if (!raw || raw === "Select Person...") {
      return {
        name: "Unassigned",
        role: account.is_customer
          ? "Salesperson"
          : account.is_supplier
            ? "Purchaser"
            : "Assignee",
      };
    }
    const dashIndex = raw.indexOf("-");
    if (dashIndex > 0) {
      return {
        name: raw.slice(dashIndex + 1).trim() || raw,
        role: account.is_customer
          ? "Account Manager"
          : account.is_supplier
            ? "Buyer"
            : "Assigned Person",
      };
    }
    return {
      name: raw,
      role: account.is_customer ? "Salesperson" : "Assigned Person",
    };
  }, [account.assign_person, account.is_customer, account.is_supplier]);

  const metrics = summaryMetrics ?? {
    customerSince: "—",
    creditLimitFormatted: "—",
    totalOrdersThisYear: "0",
    totalSpendThisYearFormatted: "—",
    lastActivityDate: "—",
    openOutstandingFormatted: "—",
  };

  const formatFCY = (val: number, code: string) => {
    const validCode =
      code?.trim().length === 3 ? code.trim().toUpperCase() : "GBP";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: validCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const lcyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  });

  return (
    <div className="space-y-4">

      {/* BOTTOM SUMMARY STRIP */}
      <section className={`${cardClass} grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-slate-800`}>
        <div className="lg:px-3 first:lg:pl-0">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:calendar"
              className="text-emerald-800 text-3xl"
            />
            <span>Customer Since</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {metrics.customerSince}
          </p>
        </div>

        <div className="lg:px-3">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:coins"
              className="text-emerald-800 text-3xl"
            />
            <span>Credit Limit</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {/* {metrics.creditLimitFormatted} */}
            {/* {formatFCY(Number(party.credit_limit) || 0, currencyCode)} */}
          </p>
        </div>

        <div className="lg:px-3">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:shopping-cart"
              className="text-emerald-800 text-3xl"
            />
            <span>Total Orders (This Year)</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {metrics.totalOrdersThisYear}
          </p>
        </div>

        <div className="lg:px-3">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:stack-2"
              className="text-emerald-800 text-3xl"
            />
            <span>Total Spend (This Year)</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {metrics.totalSpendThisYearFormatted}
          </p>
        </div>

        <div className="lg:px-3">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:clock"
              className="text-emerald-800 text-3xl"
            />
            <span>Last Activity</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {metrics.lastActivityDate}
          </p>
        </div>

        <div className="lg:px-3 last:lg:pr-0">
          <div className="flex items-center gap-1.5  text-sm text-black dark:text-slate-400">
            <Icon
              icon="tabler:file-dollar"
              className="text-emerald-800 text-3xl"
            />
            <span>Open Outstanding</span>
          </div>
          <p className="mt-1 text-sm font-bold text-black dark:text-slate-100 tabular-nums">
            {metrics.openOutstandingFormatted}
          </p>
        </div>
      </section>

      {/* Editable Business Name Banner when not readonly */}
      {!isReadonly && (
        <div className={cardClass}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <label className="md:col-span-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="md:col-span-9">
              <input
                type="text"
                value={account.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={getInputClass("general.name")}
                placeholder="Business Name"
              />
              {errors["general.name"] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors["general.name"]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP ROW: Company Details | Address | Actions & Assigned Person */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 1. Company Details */}
        <section className={`${cardClass} lg:col-span-4 flex flex-col justify-between`}>
          <div>
            <div className={sectionHeaderClass}>
              <span className="flex items-center gap-2">
                <Icon
                  icon="tabler:building"
                  className="text-emerald-800 text-3xl"
                />
                Company Details
              </span>
            </div>

            {isReadonly ? (
              <dl className="space-y-2.5 text-sm">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <dt className="text-black dark:text-slate-400">Email</dt>
                  <dd className="col-span-2 truncate">
                    {account.email ? (
                      <a
                        href={`mailto:${account.email}`}
                        className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {account.email}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <dt className="text-black dark:text-slate-400">Phone</dt>
                  <dd className="col-span-2">
                    {account.phone ? (
                      <a
                        href={`tel:${account.phone}`}
                        className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline tabular-nums"
                      >
                        {account.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <dt className="text-black dark:text-slate-400">Website</dt>
                  <dd className="col-span-2 truncate">
                    {account.website ? (
                      <a
                        href={normalizeWebsite(account.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {account.website}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="text-sm text-black dark:text-slate-400">
                    Email
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
                  <label className="text-sm text-black dark:text-slate-400">
                    Phone
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
                  <label className="text-sm text-black dark:text-slate-400">
                    Website
                  </label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={account.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      onBlur={(e) =>
                        updateField("website", normalizeWebsite(e.target.value))
                      }
                      className={getInputClass("general.website")}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Address */}
        <section className={`${cardClass} lg:col-span-4 flex flex-col justify-between`}>
          <div>
            <div className={sectionHeaderClass}>
              <span className="flex items-center gap-2">
                <Icon
                  icon="tabler:map-pin"
                  className="text-emerald-800 text-3xl"
                />
                Address
              </span>
            </div>

            {isReadonly ? (
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm leading-5 text-slate-700 dark:text-slate-300 space-y-0.5 min-w-0">
                  {primaryAddress.address_1 && (
                    <p className="font-medium text-black dark:text-slate-100 truncate">
                      {primaryAddress.address_1}
                    </p>
                  )}
                  {primaryAddress.address_2 && (
                    <p className="truncate">{primaryAddress.address_2}</p>
                  )}
                  {(primaryAddress.city || primaryAddress.postcode) && (
                    <p className="truncate">
                      {[primaryAddress.city, primaryAddress.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {primaryAddress.state && (
                    <p className="text-black dark:text-slate-400 truncate">
                      {primaryAddress.state}
                    </p>
                  )}
                  <p className="text-black dark:text-slate-400">
                    {primaryAddress.country || account.country || "United Kingdom"}
                  </p>
                  {!primaryAddress.address_1 &&
                    !primaryAddress.city &&
                    !primaryAddress.postcode && (
                      <p className="text-slate-400">No primary address set</p>
                    )}
                </div>

                <div className="w-24 h-20 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-black dark:text-slate-400">
                  <div className="w-7 h-7 rounded-full bg-emerald-600/15 dark:bg-emerald-500/20 flex items-center justify-center mb-1">
                    <Icon
                      icon="tabler:map-pin-filled"
                      className="text-emerald-800 text-3xl"
                    />
                  </div>
                  <span className="text-[10px] font-medium">Map View</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={primaryAddress.address_1 || ""}
                  onChange={(e) =>
                    updatePrimaryAddress("address_1", e.target.value)
                  }
                  className={getInputClass("general.address_1")}
                />
                <input
                  type="text"
                  placeholder="Address Line 2 (Optional)"
                  value={primaryAddress.address_2 || ""}
                  onChange={(e) =>
                    updatePrimaryAddress("address_2", e.target.value)
                  }
                  className={getInputClass("general.address_2")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={primaryAddress.city || ""}
                    onChange={(e) =>
                      updatePrimaryAddress("city", e.target.value)
                    }
                    className={getInputClass("general.city")}
                  />
                  <input
                    type="text"
                    placeholder="County / State"
                    value={primaryAddress.state || ""}
                    onChange={(e) =>
                      updatePrimaryAddress("state", e.target.value)
                    }
                    className={getInputClass("general.state")}
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
                  />
                  <MasterDropdown
                    type="Country"
                    value={primaryAddress.country || account.country || ""}
                    displayFormat="name"
                    valueKey="code"
                    onChange={(val) => {
                      updatePrimaryAddress("country", val ?? "");
                      updateField("country", val ?? "");
                    }}
                    className={getInputClass("general.country")}
                    defaultFilter={(item) =>
                      item.code === "UK" || item.country_id === 225
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Quick Action Pills + Assigned Salesperson / Person Card */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenActivities}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#11161D] hover:bg-slate-50 dark:hover:bg-slate-800/70 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors"
            >
              <Icon
                icon="tabler:calendar-event"
                className="text-emerald-800 text-3xl"
              />
              <span>Activities</span>
              <Icon
                icon="tabler:external-link"
                className="w-3.5 h-3.5 text-slate-400"
              />
            </button>

            <button
              type="button"
              onClick={onOpenStatement}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#11161D] hover:bg-slate-50 dark:hover:bg-slate-800/70 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors"
            >
              <Icon
                icon="tabler:file-invoice"
                className="text-emerald-800 text-3xl"
              />
              <span>Statement</span>
              <Icon
                icon="tabler:external-link"
                className="w-3.5 h-3.5 text-slate-400"
              />
            </button>
          </div>

          <section className={`${cardClass} flex-1 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {getInitials(assignedPersonParts.name)}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] text-black dark:text-slate-400">
                  {account.is_customer
                    ? "Assigned Salesperson"
                    : account.is_supplier
                      ? "Assigned Purchaser"
                      : "Assigned Person"}
                </p>

                {isReadonly ? (
                  <>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                        {assignedPersonParts.name}
                      </span>
                      {onOpenSalespersonDetail && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSalespersonDetail(account.assign_person_id)
                          }
                          className="text-slate-400 hover:text-black dark:hover:text-slate-200"
                          title="View Salesperson"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-black dark:text-slate-400 truncate">
                      {assignedPersonParts.role}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={account.assign_person || "Select Person..."}
                      className={getInputClass("general.assign_person")}
                    />
                    <button
                      type="button"
                      onClick={() => setSalespersonModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Lookup Person"
                    >
                      <Icon icon="tabler:external-link" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MIDDLE ROW: Contacts (Left) | Business Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Contacts Card */}
        <section className={`${cardClass} lg:col-span-5 flex flex-col justify-between`}>
          <div>
            <div className={sectionHeaderClass}>
              <span className="flex items-center gap-2">
                <Icon
                  icon="tabler:users"
                  className="text-emerald-800 text-3xl"
                />
                Contacts
              </span>
            </div>

            {/* Primary / Secondary Switcher */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveContactTab("primary")}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  activeContactTab === "primary"
                    ? "bg-emerald-700 text-white dark:bg-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800/80 text-black dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Primary Contact
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveContactTab("secondary");
                  setSelectedSecondaryIdx(0);
                }}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  activeContactTab === "secondary"
                    ? "bg-emerald-700 text-white dark:bg-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800/80 text-black dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Secondary Contacts ({secondaryContacts.length})
              </button>
            </div>

            {activeContactTab === "secondary" && secondaryContacts.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {secondaryContacts.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSecondaryIdx(idx)}
                    className={`px-2 py-0.5 rounded text-[11px] border ${
                      selectedSecondaryIdx === idx
                        ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                        : "border-slate-200 dark:border-slate-800 text-black dark:text-slate-400"
                    }`}
                  >
                    {c.name || `Contact ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            {isReadonly ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200">
                    {getInitials(activeContact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black dark:text-slate-100 truncate">
                      {activeContact.name || "No contact name"}
                    </p>
                    <p className="text-[11px] text-black dark:text-slate-400 truncate">
                      {activeContact.job_title || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      icon="tabler:mail"
                      className="text-emerald-800 text-xl"
                    />
                    <span className="truncate">
                      {activeContact.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <Icon
                      icon="tabler:phone"
                      className="text-emerald-800 text-xl"
                    />
                    <span>
                      {activeContact.mobile || activeContact.phone || "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-black dark:text-slate-400 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={activeContact.name || ""}
                    onChange={(e) =>
                      updateContactAtIndex(activeContact, "name", e.target.value)
                    }
                    className={getInputClass("primaryContact.name")}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-black dark:text-slate-400 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={activeContact.job_title || ""}
                    onChange={(e) =>
                      updateContactAtIndex(
                        activeContact,
                        "job_title",
                        e.target.value,
                      )
                    }
                    className={getInputClass("primaryContact.job_title")}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-black dark:text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={activeContact.email || ""}
                    onChange={(e) =>
                      updateContactAtIndex(activeContact, "email", e.target.value)
                    }
                    className={getInputClass("primaryContact.email")}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-black dark:text-slate-400 mb-1">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={activeContact.mobile || ""}
                    onChange={(e) =>
                      updateContactAtIndex(
                        activeContact,
                        "mobile",
                        e.target.value,
                      )
                    }
                    className={getInputClass("primaryContact.mobile")}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Business Profile Card */}
        <section className={`${cardClass} lg:col-span-7 flex flex-col justify-between`}>
          <div>
            <div className={sectionHeaderClass}>
              <span className="flex items-center gap-2">
                <Icon
                  icon="tabler:briefcase"
                  className="text-emerald-800 text-3xl"
                />
                Business Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Segment */}
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon
                    icon="tabler:mail-opened"
                    className="text-emerald-800 text-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-black dark:text-slate-400">
                      Segment
                    </p>
                    {isReadonly ? (
                      <p className="text-sm font-semibold text-black dark:text-slate-100 truncate">
                        {segments.find((s) => s.id === account.segment_id)
                          ?.name || "—"}
                      </p>
                    ) : (
                      <SelectWithAddModal
                        disabled={isReadonly}
                        value={account.segment_id || ""}
                        onChange={(val) => updateField("segment_id", val)}
                        items={segments}
                        placeholder="Select Segment..."
                        apiEndpoint={`/api/setup/sales/segments?module=${activeModule}`}
                        payloadExtra={{ module_type: activeModule }}
                        onItemAdded={(newItem) =>
                          setSegments((prev) => [...prev, newItem])
                        }
                        className={getInputClass("general.segment_id")}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Territory */}
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon
                    icon="tabler:map"
                    className="text-emerald-800 text-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-black dark:text-slate-400">
                      Territory
                    </p>
                    {isReadonly ? (
                      <p className="text-sm font-semibold text-black dark:text-slate-100 truncate">
                        {territories.find((t) => t.id === account.territory_id)
                          ?.name || "—"}
                      </p>
                    ) : (
                      <SelectWithAddModal
                        disabled={isReadonly}
                        value={account.territory_id || ""}
                        onChange={(val) => updateField("territory_id", val)}
                        items={territories}
                        placeholder="Select Territory..."
                        apiEndpoint={`/api/setup/sales/territories?module=${activeModule}`}
                        payloadExtra={{ module_type: activeModule }}
                        onItemAdded={(newItem) =>
                          setTerritories((prev) => [...prev, newItem])
                        }
                        className={getInputClass("general.territory_id")}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Buying / Purchasing Group */}
              {(account.is_customer || account.is_crm_lead || account.is_supplier) && (
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon
                      icon="tabler:users-group"
                      className="text-emerald-800 text-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-black dark:text-slate-400">
                        {account.is_supplier
                          ? "Purchasing Group"
                          : "Buying Group"}
                      </p>
                      {isReadonly ? (
                        <p className="text-sm font-semibold text-black dark:text-slate-100 truncate">
                          {buyingGroups.find(
                            (b) => b.id === account.buying_group_id,
                          )?.name || "—"}
                        </p>
                      ) : (
                        <SelectWithAddModal
                          disabled={isReadonly}
                          value={account.buying_group_id || ""}
                          onChange={(val) =>
                            updateField("buying_group_id", val)
                          }
                          items={buyingGroups}
                          placeholder="Select Group..."
                          apiEndpoint="/api/setup/sales/buying_groups"
                          onItemAdded={(newItem) =>
                            setBuyingGroups((prev) => [...prev, newItem])
                          }
                          className={getInputClass("general.buying_group_id")}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ownership Type */}
              {(account.is_customer || account.is_crm_lead) && (
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon
                      icon="tabler:building-skyscraper"
                      className="text-emerald-800 text-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-black dark:text-slate-400">
                        Ownership Type
                      </p>
                      {isReadonly ? (
                        <p className="text-sm font-semibold text-black dark:text-slate-100 truncate">
                          {ownershipType.find(
                            (o) => o.id === account.ownership_type_id,
                          )?.name || "—"}
                        </p>
                      ) : (
                        <SelectWithAddModal
                          disabled={isReadonly}
                          value={account.ownership_type_id || ""}
                          onChange={(val) =>
                            updateField("ownership_type_id", val)
                          }
                          items={ownershipType}
                          placeholder="Select Ownership Type..."
                          apiEndpoint="/api/setup/sales/ownership_type"
                          onItemAdded={(newItem) =>
                            setOwnershipType((prev) => [...prev, newItem])
                          }
                          className={getInputClass("general.ownership_type_id")}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location Type Pills + Optional Anonymous Flag */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm text-black dark:text-slate-400 mr-1">
                  <Icon icon="tabler:user-pin" className="text-emerald-800 text-3xl" />
                  Location Type
                </span>

                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() =>
                    updatePrimaryAddress(
                      "is_billing",
                      !primaryAddress.is_billing,
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                    primaryAddress.is_billing
                      ? "bg-emerald-700 text-white dark:bg-emerald-600"
                      : "bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300"
                  } ${isReadonly ? "cursor-default" : "cursor-pointer"}`}
                >
                  Billing
                </button>

                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() =>
                    updatePrimaryAddress(
                      "is_shipping",
                      !primaryAddress.is_shipping,
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                    primaryAddress.is_shipping
                      ? "bg-emerald-700 text-white dark:bg-emerald-600"
                      : "bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300"
                  } ${isReadonly ? "cursor-default" : "cursor-pointer"}`}
                >
                  Shipping
                </button>

                {account.is_supplier && (
                  <button
                    type="button"
                    disabled={isReadonly}
                    onClick={() =>
                      updatePrimaryAddress(
                        "is_collection",
                        !primaryAddress.is_collection,
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                      primaryAddress.is_collection
                        ? "bg-emerald-700 text-white dark:bg-emerald-600"
                        : "bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300"
                    } ${isReadonly ? "cursor-default" : "cursor-pointer"}`}
                  >
                    Collection
                  </button>
                )}
              </div>

              {account.is_customer && (
                <label className="flex items-center gap-2 text-sm text-black dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadonly}
                    checked={!!account.anonymous_customer}
                    onChange={(e) =>
                      updateField("anonymous_customer", e.target.checked)
                    }
                    className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Anonymous Customer</span>
                </label>
              )}

              {account.is_supplier && (
                <label className="flex items-center gap-2 text-sm text-black dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadonly}
                    checked={!!account.anonymous_supplier}
                    onChange={(e) =>
                      updateField("anonymous_supplier", e.target.checked)
                    }
                    className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Anonymous Supplier</span>
                </label>
              )}
            </div>
          </div>
        </section>
      </div>

      

      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />
    </div>
  );
}

/* "use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "../../common/MasterDropdown";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";
import NumericTextInput from "@/components/ui/NumericTextInput";
import SelectWithAddModal from "../../common/SelectWithAddModal";

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

  const normalizeWebsite = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) return "";

    return trimmed.includes("://") ? trimmed : `http://${trimmed}`;
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
      "w-full border p-2 rounded text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-black dark:text-slate-400 cursor-not-allowed select-none`;
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
          // salesGroupRes,
          // purchaseGroupRes,
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

          // fetch("/api/setup/finance/sales-posting-groups"),
          // fetch("/api/setup/finance/purchase-posting-groups"),
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

        // if (salesGroupRes.ok) setSalesPostingGroups(await salesGroupRes.json());
        // if (purchaseGroupRes.ok)
        //   setPurchasePostingGroups(await purchaseGroupRes.json());
      } catch (err) {
        console.error("Error populating ledger configuration setups:", err);
      }
    }
    fetchSetupDropdowns();
  }, [activeModule]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
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
                placeholder="Business Name"
                disabled={isReadonly}
              />
              {errors["general.name"] && (
                <p className="text-red-500 text-sm mt-0.5">
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
                  type="Country"
                  value={primaryAddress.country || account.country || ""} //  || "United Kingdom"
                  displayFormat="name"
                  valueKey="code"
                  onChange={(val) => {
                    updatePrimaryAddress("country", val ?? "");
                    updateField("country", val ?? "");
                  }}
                  className={getInputClass("general.country")}
                  disabled={isReadonly}
                  // defaultFilter={(item) => item.country_id === 225}
                  defaultFilter={(item) =>
                    item.code === "UK" || item.country_id === 225
                  }
                />
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
                disabled={isReadonly}
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
                disabled={isReadonly}
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
                onBlur={(e) => {
                  updateField("website", normalizeWebsite(e.target.value));
                }}
                className={getInputClass("general.website")}
                placeholder="https://..."
                disabled={isReadonly}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Location Type
            </label>
            <div className="col-span-2">
              <div className="flex flex-wrap gap-4 text-sm font-medium p-2 mb-1">
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

          {account.is_customer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
                title="Used for editable settings in Orders"
              >
                Anonymous Customer
              </label>

              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-sm font-medium p-2 w-8">
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

          {account.is_supplier && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Anonymous Supplier
              </label>

              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-sm font-medium p-2 w-8">
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

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Segment
            </label>
            <div className="col-span-2">
              <SelectWithAddModal
                disabled={isReadonly}
                value={account.segment_id || ""}
                onChange={(val) => updateField("segment_id", val)}
                items={segments}
                placeholder="Select Segment..."
                apiEndpoint={`/api/setup/sales/segments?module=${activeModule}`}
                payloadExtra={{ module_type: activeModule }}
                onItemAdded={(newItem) =>
                  setSegments((prev) => [...prev, newItem])
                }
                className={getInputClass("general.segment_id")}
              />

              {errors["general.segment_id"] && (
                <p className="text-red-500 text-sm mt-0.5">
                  {errors["general.segment_id"]}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Territory
            </label>
            <div className="col-span-2">
              <SelectWithAddModal
                disabled={isReadonly}
                value={account.territory_id || ""}
                onChange={(val) => updateField("territory_id", val)}
                items={territories}
                placeholder="Select Territory..."
                apiEndpoint={`/api/setup/sales/territories?module=${activeModule}`}
                payloadExtra={{ module_type: activeModule }}
                onItemAdded={(newItem) =>
                  setTerritories((prev) => [...prev, newItem])
                }
                className={getInputClass("general.territory_id")}
              />
            </div>
          </div>

          {(account.is_customer || account.is_crm_lead) && (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ownership Type
                </label>
                <div className="col-span-2">
                  <SelectWithAddModal
                    disabled={isReadonly}
                    value={account.ownership_type_id || ""}
                    onChange={(val) => updateField("ownership_type_id", val)}
                    items={ownershipType}
                    placeholder="Select  Ownership Type..."
                    apiEndpoint={`/api/setup/sales/ownership_type`}
                    onItemAdded={(newItem) =>
                      setOwnershipType((prev) => [...prev, newItem])
                    }
                    className={getInputClass("general.ownership_type_id")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {account.is_crm_lead || account.is_customer
                    ? "Buying Group"
                    : "Purchasing Group"}
                </label>
                <div className="col-span-2">
                  <SelectWithAddModal
                    disabled={isReadonly}
                    value={account.buying_group_id || ""}
                    onChange={(val) => updateField("buying_group_id", val)}
                    items={buyingGroups}
                    placeholder="Select  Group..."
                    apiEndpoint={`/api/setup/sales/buying_groups`}
                    onItemAdded={(newItem) =>
                      setBuyingGroups((prev) => [...prev, newItem])
                    }
                    className={getInputClass("general.buying_group_id")}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {account.is_customer
                ? "Salesperson"
                : account.is_supplier
                  ? "Purchaser"
                  : "Assign Person"}
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
                className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-black"
              >
                <Icon icon="tabler:external-link" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Primary Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
} */

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          </div> */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          </div> */
}
{
  /* {(account.is_customer || account.is_crm_lead) && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          )} */
}
{
  /* {account.is_customer && (
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Credit Limit
              </label>
              <div className="col-span-2">
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  value={Number(account.credit_limit) || 0}
                  onChange={(val) => updateField("credit_limit", Number(val))}
                  disabled={isReadonly}
                  className={getInputClass("general.credit_limit")}
                />
              </div>
            </div>
          )} */
}
{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          </div> */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              </div> */
}
{
  /* <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 align-middle">
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
              </div> */
}
{
  /* <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              </div> */
}
{
  /* 

          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          </div> */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          </div> */
}

{
  /* <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
            </div> */
}

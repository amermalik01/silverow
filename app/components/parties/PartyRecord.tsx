// app/components/parties/PartyRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import GeneralTab, {
  type CompanyCurrency,
  type CustomerSummaryMetrics,
} from "./tabs/GeneralTab";
import FinanceTab, { type FinanceSummaryMetrics } from "./tabs/FinanceTab";

import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";
import PriceListTab, { PriceListDraft } from "./tabs/PriceListTab";
import PartyLedgerActivityTab from "./tabs/PartyLedgerActivityTab";
import NotesTab from "../shared/NotesTab";
import AttachmentsTab from "../shared/AttachmentsTab";

import PartyDetailHeader from "./PartyDetailHeader";

import { useLoader } from "@/app/context/LoaderContext";

import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";

import type {
  Party,
  PartyModule,
  PartyContactDraft,
  PartyAddressDraft,
} from "@/types/erp";
import Breadcrumbs from "../layout/shared/breadcrumb/BreadcrumbComp";
import { priceListsSchema } from "@/lib/validations/price-list.schema";
import RebateTab from "./tabs/rebates/RebateTab";

/* ============================================================
   VALIDATION MESSAGE HELPERS
============================================================ */

type ZodIssueLike = { code: string; message: string };

/** Response of GET /api/parties/[id]/metrics */
type PartyMetrics = {
  currencyCode: string | null;
  partySince: string | null;
  creditLimit: number;
  ordersThisYear: number;
  spendThisYear: number;
  lastActivityAt: string | null;
  outstanding: number;
  outstandingLcy: number;
  availableCredit: number | null;
  openInvoices: number;
  overdueInvoices: number;
  lastPayment: { amount: number; date: string | null } | null;
  lastInvoice: { amount: number; date: string | null } | null;
};

/** Party fields that are edited on the Finance tab. */
const FINANCE_FIELDS = new Set([
  "currency_id",
  "credit_limit",
  "posting_group",
  "sales_posting_group_id",
  "purchase_posting_group_id",
  "payment_terms",
  "payment_method",
  "finance_contact_person",
  "finance_email",
  "finance_phone",
  "finance_fax",
  "finance_alt_contact",
  "finance_alt_email",
  "gl_account_receivable",
  "gl_account_payable",
  "bank_account_name",
  "bank_sort_code",
  "bank_account_no",
  "bank_swift_bic",
  "bank_iban",
  "bank_name",
  "bank_address",
  "bank_address_2",
  "finance_charge",
  "insurance_charge",
]);

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  label: "Location name",
  address_1: "Address line 1",
  address_2: "Address line 2",
  city: "City",
  state: "County",
  postcode: "Postcode",
  country: "Country",
  email: "Email",
  phone: "Phone",
  mobile: "Mobile",
  website: "Website",
  job_title: "Job title",
  currency_id: "Currency",
  credit_limit: "Credit limit",
  posting_group: "Posting group",
  finance_email: "Finance email",
  finance_alt_email: "Alternative finance email",
  segment_id: "Segment",
  item_code: "Item code",
  uom_id: "Unit of measure",
  uom_name: "Unit of measure",
  item_id: "Item",
  offer_method: "Offer method",
  start_date: "Start date",
  end_date: "End date",
  standard_price: "Standard price",
  offered_price: "Offered price",
  min_order_qty: "Minimum order quantity",
  max_order_qty: "Maximum order quantity",
  volume_discounts: "Volume discounts",
  salesperson_name: "Salesperson",
};

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const text = field.replace(/_id$/, "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Field";
}

/** Which tab an error key belongs to (for the red dot on the tab). */
function errorKeyTab(key: string): string {
  if (key.startsWith("general.")) {
    return FINANCE_FIELDS.has(key.slice("general.".length)) ? "finance" : "general";
  }
  if (key.startsWith("contacts.")) return "contacts";
  if (key.startsWith("addresses.")) return "locations";
  if (key.startsWith("priceLists.")) return "price_list";
  return key.split(".")[0];
}

type Props = {
  id: string;
  module: PartyModule | "customer" | "supplier" | "finance";
  slug: string;
  isReadonly?: boolean;
};

export default function PartyRecord({
  id,
  module,
  slug,
  isReadonly: isReadonlyProp = false,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);

  // Current working state
  const [account, setAccount] = useState<Partial<Party>>({ id: "" });
  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);
  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);
  const [currencies, setCurrencies] = useState<CompanyCurrency[]>([]);

  const activeCurrencyCode =
    currencies.find((c) => c.id === account.currency_id)?.code || "GBP";

  const [initialAccount, setInitialAccount] = useState<Partial<Party>>({});
  const [initialContacts, setInitialContacts] = useState<PartyContactDraft[]>(
    [],
  );
  const [initialAddresses, setInitialAddresses] = useState<PartyAddressDraft[]>(
    [],
  );

  const [priceLists, setPriceLists] = useState<PriceListDraft[]>([]);
  const [initialPriceLists, setInitialPriceLists] = useState<PriceListDraft[]>(
    [],
  );

  const [ledgerSummary, setLedgerSummary] = useState({
    totalRemainingFCY: 0,
    totalRemainingLCY: 0,
    openCount: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /** Readable list for the error banner: "Locations › Head Office › City: …" */
  const [errorSummary, setErrorSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  /* Widgets on General / Finance tabs (from ledger activity + orders) */
  const [partyMetrics, setPartyMetrics] = useState<PartyMetrics | null>(null);

  const loadMetrics = async () => {
    const partyType = module === "supplier" ? "supplier" : "customer";
    try {
      const res = await fetch(
        `/api/parties/${id}/metrics?partyType=${partyType}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { metrics?: PartyMetrics };
      if (data.metrics) setPartyMetrics(data.metrics);
    } catch (err) {
      console.error("Failed to load party metrics:", err);
    }
  };

  const { show, hide } = useLoader();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      show("Fetching Record...");

      const partyType = module === "supplier" ? "supplier" : "customer";

      try {
        const [partyRes, currencyRes, summaryRes] = await Promise.all([
          fetch(`/api/parties/${id}`),
          fetch("/api/parties/currencies"),
          fetch(`/api/parties/${id}/ledger/summary?partyType=${partyType}`),
        ]);

        if (!partyRes.ok)
          throw new Error("Entity target footprint retrieval failed.");

        const data = await partyRes.json();
        const loadedAccount = data.account ?? {};
        const loadedContacts = data.contacts || [];
        const loadedAddresses = data.addresses || [];
        const loadedPriceLists = data.priceLists || [];

        // Set working state
        setAccount(loadedAccount);
        setContacts(loadedContacts);
        setAddresses(loadedAddresses);
        setPriceLists(loadedPriceLists);

        // Save initial snapshot for rollback capability
        setInitialAccount(loadedAccount);
        setInitialContacts(loadedContacts);
        setInitialAddresses(loadedAddresses);
        setInitialPriceLists(loadedPriceLists);

        if (currencyRes.ok) {
          const currencyData = await currencyRes.json();
          setCurrencies(currencyData);

          setAccount((prev) => {
            if (!prev.currency_id) {
              const gbpCurrency = currencyData.find(
                (c: CompanyCurrency) =>
                  c.code?.toUpperCase() === "GBP" || c.is_base,
              );
              if (gbpCurrency) {
                return { ...prev, currency_id: gbpCurrency.id };
              }
            }
            return prev;
          });
        }

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.summary) {
            setLedgerSummary(summaryData.summary);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load party record details.");
      } finally {
        setLoading(false);
        hide();
      }
    };
    loadData();
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, module]);

  const validateForm = (): boolean => {
    setFormErrors({});
    setErrorSummary([]);

    const structuredErrors: Record<string, string> = {};
    const summary: string[] = [];

    /*
     * Turns a Zod issue into a readable message. Raw type errors such as
     * "Invalid input: expected string, received null" become
     * "<Field> is required" / "<Field> has an invalid value".
     */
    const describe = (issue: ZodIssueLike, field: string): string => {
      if (issue.code === "invalid_type") {
        return /received (null|undefined)/i.test(issue.message)
          ? `${fieldLabel(field)} is required`
          : `${fieldLabel(field)} has an invalid value`;
      }
      return issue.message;
    };

    const add = (key: string, location: string, message: string) => {
      structuredErrors[key] = message;
      summary.push(`${location}: ${message}`);
    };

    /* General / Finance fields */
    const baseCheck = PartySchema.safeParse(account);
    if (!baseCheck.success) {
      baseCheck.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "");
        if (!field) return;
        const tab = FINANCE_FIELDS.has(field) ? "Finance" : "General";
        add(
          `general.${field}`,
          `${tab} › ${fieldLabel(field)}`,
          describe(issue, field),
        );
      });
    }

    /* Contacts */
    contacts.forEach((contact, idx) => {
      const contactCheck = PartyContactSchema.safeParse(contact);
      if (!contactCheck.success) {
        const row = contact.name?.trim() || `Contact ${idx + 1}`;
        contactCheck.error.issues.forEach((issue) => {
          const field = String(issue.path[0] ?? "");
          add(
            `contacts.${idx}.${field}`,
            `Contacts › ${row} › ${fieldLabel(field)}`,
            describe(issue, field),
          );
        });
      }
    });

    /* Locations */
    addresses.forEach((addr, idx) => {
      const addressCheck = PartyAddressSchema.safeParse(addr);
      if (!addressCheck.success) {
        const row = addr.label?.trim() || `Location ${idx + 1}`;
        addressCheck.error.issues.forEach((issue) => {
          const field = String(issue.path[0] ?? "");
          add(
            `addresses.${idx}.${field}`,
            `Locations › ${row} › ${fieldLabel(field)}`,
            describe(issue, field),
          );
        });
      }
    });

    /* Price lists */
    const priceListsCheck = priceListsSchema.safeParse(priceLists);
    if (!priceListsCheck.success) {
      priceListsCheck.error.issues.forEach((issue) => {
        const path = issue.path.map(String);
        const listIndex = Number(path[0]);
        const list = priceLists[listIndex] as unknown as
          | { name?: string | null; items?: { name?: string | null; item_code?: string | null }[] }
          | undefined;

        const parts = [
          "Price List",
          list?.name?.trim() || `Price list ${listIndex + 1}`,
        ];

        if (path[1] === "items" && path[2] !== undefined) {
          const item = list?.items?.[Number(path[2])];
          parts.push(
            item?.name || item?.item_code || `Item ${Number(path[2]) + 1}`,
          );
        }

        const field = path[path.length - 1] ?? "";
        if (field && Number.isNaN(Number(field))) parts.push(fieldLabel(field));

        add(`priceLists.${path.join(".")}`, parts.join(" › "), describe(issue, field));
      });
    }

    if (Object.keys(structuredErrors).length > 0) {
      setFormErrors(structuredErrors);
      setErrorSummary(summary);

      const keys = Object.keys(structuredErrors);
      const firstGeneral = keys.find((k) => k.startsWith("general."));

      if (firstGeneral) {
        setActiveTab(
          FINANCE_FIELDS.has(firstGeneral.slice("general.".length)) &&
            tabs.includes("finance")
            ? "finance"
            : "general",
        );
      } else if (keys.some((k) => k.startsWith("contacts."))) {
        setActiveTab("contacts");
      } else if (keys.some((k) => k.startsWith("addresses."))) {
        setActiveTab("locations");
      } else if (keys.some((k) => k.startsWith("priceLists."))) {
        setActiveTab("price_list");
      }
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/parties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, contacts, addresses, priceLists }),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Save operational error failure exception.",
        );

      // Refresh snapshot with saved response or updated local data
      const updatedAccount = result.account || account;
      setAccount(updatedAccount);
      setInitialAccount(updatedAccount);
      setInitialContacts(contacts);
      setInitialAddresses(addresses);
      setInitialPriceLists(priceLists);

      // Clear errors, exit edit mode & notify user
      setFormErrors({});
      setErrorSummary([]);
      setIsEditing(false);
      void loadMetrics();
      toast.success("Record saved successfully! ✅");
    } catch (err) {
      if (err instanceof Error) {
        setErrorSummary([]);
        setFormErrors({
          global: err.message || "An unexpected error occurred.",
        });
        toast.error(err.message || "Failed to save record");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Revert state back to latest saved snapshot
    setAccount(initialAccount);
    setContacts(initialContacts);
    setAddresses(initialAddresses);
    setPriceLists(initialPriceLists);
    setFormErrors({});
    setErrorSummary([]);
    setIsEditing(false);
  };

  /* ---------------- Widget values ---------------- */

  const metricsCurrencyCode =
    currencies.find((c) => String(c.id) === String(account.currency_id ?? ""))
      ?.code ||
    partyMetrics?.currencyCode ||
    "GBP";

  const formatMoney = (value: number) => {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: metricsCurrencyCode,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
      }).format(value || 0);
    } catch {
      return `${metricsCurrencyCode} ${(value || 0).toFixed(2)}`;
    }
  };

  const formatDay = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  /* Live credit limit from the form, so edits show immediately */
  const liveCreditLimit = Number(account.credit_limit) || 0;
  const outstandingValue = partyMetrics?.outstanding ?? 0;

  const summaryMetrics: CustomerSummaryMetrics | undefined = partyMetrics
    ? {
        customerSince: formatDay(partyMetrics.partySince),
        creditLimitFormatted:
          liveCreditLimit > 0 ? formatMoney(liveCreditLimit) : "No limit",
        totalOrdersThisYear: partyMetrics.ordersThisYear.toLocaleString("en-GB"),
        totalSpendThisYearFormatted: formatMoney(partyMetrics.spendThisYear),
        lastActivityDate: formatDay(partyMetrics.lastActivityAt),
        openOutstandingFormatted: formatMoney(outstandingValue),
      }
    : undefined;

  const financeMetrics: FinanceSummaryMetrics | undefined = partyMetrics
    ? {
        creditLimitFormatted:
          liveCreditLimit > 0 ? formatMoney(liveCreditLimit) : "No limit",
        outstandingFormatted: formatMoney(outstandingValue),
        availableCreditFormatted:
          liveCreditLimit > 0
            ? formatMoney(liveCreditLimit - outstandingValue)
            : "Unlimited",
        lastPaymentFormatted: partyMetrics.lastPayment
          ? formatMoney(partyMetrics.lastPayment.amount)
          : "—",
        lastPaymentDate: partyMetrics.lastPayment
          ? formatDay(partyMetrics.lastPayment.date)
          : "",
        lastInvoiceFormatted: partyMetrics.lastInvoice
          ? formatMoney(partyMetrics.lastInvoice.amount)
          : "—",
        lastInvoiceDate: partyMetrics.lastInvoice
          ? formatDay(partyMetrics.lastInvoice.date)
          : "",
        outstandingInvoicesCount: partyMetrics.openInvoices,
        overdueInvoicesCount: partyMetrics.overdueInvoices,
      }
    : undefined;

  // Combine parent force-readonly prop with internal edit mode state
  const effectiveReadonly = isReadonlyProp || !isEditing;

  // Base tabs
  const tabs = ["general"];

  // Show Finance tab right after General for Customer, Supplier, or Finance modules
  const isFinanceEligible =
    module === "customer" ||
    module === "supplier" ||
    module === "finance" ||
    account.is_customer ||
    account.is_supplier;

  if (isFinanceEligible) {
    tabs.push("finance");
  }

  tabs.push("contacts", "locations");

  const isCrmOrCustomer =
    module === "crm" ||
    module === "customer" ||
    account.is_crm_lead ||
    account.is_customer;

  tabs.push("price_list", "rebates", "activities", "notes", "attachments");

  // if (isFinanceEligible) {
  //   tabs.push("rebates");
  // }

  const redirectPath =
    module == "srm"
      ? `/${slug}/purchases/srm`
      : module == "supplier"
        ? `/${slug}/purchases/supplier`
        : module == "crm"
          ? `/${slug}/sales/crm`
          : `/${slug}/sales/customer`;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: account.is_customer
              ? "Customer"
              : account.is_supplier
                ? "Supplier"
                : account.is_crm_lead
                  ? "CRM Lead"
                  : account.is_srm_vendor
                    ? "SRM"
                    : "",
            href: `${redirectPath}`,
          },
          {
            label:
              (account.is_customer
                ? `${account.customer_code}`
                : account.is_supplier
                  ? `${account.supplier_code}`
                  : account.is_crm_lead
                    ? `${account.crm_code}`
                    : account.is_srm_vendor
                      ? `${account.srm_code}`
                      : "") || "",
          },
        ]}
      />
      {/* <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6"> */}
        <PartyDetailHeader
          party={account}
          currencyCode={activeCurrencyCode}
          outstandingBalance={ledgerSummary.totalRemainingFCY}
          openEntriesCount={ledgerSummary.openCount}
          lcyBalance={ledgerSummary.totalRemainingLCY}
          onOpenActivities={() => setActiveTab("activities")}
          onOpenFinance={() => setActiveTab("finance")}
          onPartyUpdated={(updatedAccount) => {
            setAccount((prev) => ({ ...prev, ...updatedAccount }));
            setInitialAccount((prev) => ({ ...prev, ...updatedAccount }));
          }}
        />
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        {Object.keys(formErrors).length > 0 && (
          <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
            <p className="font-semibold mb-1">
              Please fix the following validation errors:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {formErrors.global && <li>{formErrors.global}</li>}
              {errorSummary.length > 0
                ? errorSummary.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))
                : Object.entries(formErrors)
                    .filter(([key]) => key !== "global")
                    .map(([key, message]) => <li key={key}>{message}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
          {tabs.map((tab) => {
            const hasErrorInTab = Object.keys(formErrors).some((k) =>
              errorKeyTab(k) === tab,
            );
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`capitalize px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab
                    ? "border-emerald-600 text-emerald-600 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.replace("_", " ")}
                {hasErrorInTab && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="py-2 pt-6">
          {activeTab === "general" && (
            <GeneralTab
              account={account}
              setAccount={setAccount}
              contacts={contacts}
              setContacts={setContacts}
              addresses={addresses}
              setAddresses={setAddresses}
              errors={formErrors}
              currencies={currencies}
              isReadonly={effectiveReadonly}
              summaryMetrics={summaryMetrics}
              onOpenActivities={() => setActiveTab("activities")}
            />
          )}

          {activeTab === "finance" && (
            <FinanceTab
              account={account}
              setAccount={setAccount}
              isReadonly={effectiveReadonly}
              errors={formErrors}
              currencies={currencies}
              financeMetrics={financeMetrics}
            />
          )}

          {activeTab === "contacts" && (
            <ContactsTab
              contacts={contacts}
              setContacts={setContacts}
              isReadonly={effectiveReadonly}
              errors={formErrors}
              onRequestEdit={
                isReadonlyProp ? undefined : () => setIsEditing(true)
              }
              // onRequestEdit={() => setIsEditing(true)}
            />
          )}
          {activeTab === "locations" && (
            <AddressesTab
              addresses={addresses}
              setAddresses={setAddresses}
              isReadonly={effectiveReadonly}
              errors={formErrors}
              onRequestEdit={
                isReadonlyProp ? undefined : () => setIsEditing(true)
              }
              // onRequestEdit={() => setIsEditing(true)}
            />
          )}

          {activeTab === "price_list" && (
            <PriceListTab
              partyId={id}
              partyType={
                module === "supplier" || account.is_supplier
                  ? "supplier"
                  : "customer"
              }
              baseCurrencyId={account.currency_id || ""}
              priceLists={priceLists}
              setPriceLists={setPriceLists}
              isReadonly={effectiveReadonly}
              errors={formErrors}
              onRequestEdit={
                isReadonlyProp ? undefined : () => setIsEditing(true)
              }
            />
          )}

          {activeTab === "rebates" && (
            <RebateTab
              partyId={id}
              rebateType={module === "supplier" ? "PURCHASE" : "SALES"}
              baseCurrencyId={account.currency_id || ""}
              isReadonly={isReadonlyProp}
            />
          )}

          {activeTab === "activities" && (
            <PartyLedgerActivityTab
              partyId={id}
              partyType={
                module === "supplier" || account.is_supplier
                  ? "supplier"
                  : "customer"
              }
              currencyCode={activeCurrencyCode}
              slug={slug}
              sourceDocType=""
              onSummaryLoaded={setLedgerSummary}
            />
          )}
          {activeTab === "notes" && (
            <NotesTab
              module={module}
              recordId={id}
              readonly={effectiveReadonly}
              errors={formErrors}
              onRequestEdit={
                isReadonlyProp ? undefined : () => setIsEditing(true)
              }
            />
          )}
          {activeTab === "attachments" && (
            <AttachmentsTab
              module={module}
              recordId={id}
              readonly={effectiveReadonly}
              onRequestEdit={
                isReadonlyProp ? undefined : () => setIsEditing(true)
              }
            />
          )}
        </div>

        <div className="flex justify-end items-center gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
          {!isReadonlyProp && (
            <>
              {!isEditing ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    // variant="edit"
                    variant="save"
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="cancel"
                    onClick={() => router.back()}
                  >
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    variant="save"
                  >
                    {saving ? (
                      <>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>Save</>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="cancel"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

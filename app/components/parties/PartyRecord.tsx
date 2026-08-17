// app/components/parties/PartyRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import GeneralTab, { type CompanyCurrency } from "./tabs/GeneralTab";
import FinanceTab from "./tabs/FinanceTab";

import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";
import OpportunityCycleTab from "./tabs/OpportunityCycleTab";
// import ActivitiesTab from "../shared/ActivitiesTab";
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

type Props = {
  id: string;
  module: PartyModule | "customer" | "supplier" | "finance";
  isReadonly?: boolean;
};

export default function PartyRecord({
  id,
  module,
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

  // Snapshot states for rolling back on Cancel
  const [initialAccount, setInitialAccount] = useState<Partial<Party>>({});
  const [initialContacts, setInitialContacts] = useState<PartyContactDraft[]>(
    [],
  );
  const [initialAddresses, setInitialAddresses] = useState<PartyAddressDraft[]>(
    [],
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const { show, hide } = useLoader();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      show("Fetching Record...");
      try {
        const [partyRes, currencyRes] = await Promise.all([
          fetch(`/api/parties/${id}`),
          fetch("/api/parties/currencies"),
        ]);

        if (!partyRes.ok)
          throw new Error("Entity target footprint retrieval failed.");

        const data = await partyRes.json();
        const loadedAccount = data.account ?? {};
        const loadedContacts = data.contacts || [];
        const loadedAddresses = data.addresses || [];

        // Set working state
        setAccount(loadedAccount);
        setContacts(loadedContacts);
        setAddresses(loadedAddresses);

        // Save initial snapshot for rollback capability
        setInitialAccount(loadedAccount);
        setInitialContacts(loadedContacts);
        setInitialAddresses(loadedAddresses);

        // setAccount(data.account ?? {});
        // setContacts(data.contacts || []);
        // setAddresses(data.addresses || []);

        if (currencyRes.ok) {
          const currencyData = await currencyRes.json();
          setCurrencies(currencyData);
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
  }, [id]);

  const validateForm = (): boolean => {
    setFormErrors({});
    const structuredErrors: Record<string, string> = {};

    const baseCheck = PartySchema.safeParse(account);
    if (!baseCheck.success) {
      baseCheck.error.issues.forEach((issue) => {
        const fieldKey = issue.path[0];
        if (typeof fieldKey === "string" || typeof fieldKey === "number") {
          structuredErrors[`general.${fieldKey}`] = issue.message;
        }
      });
    }

    contacts.forEach((contact, idx) => {
      const contactCheck = PartyContactSchema.safeParse(contact);
      if (!contactCheck.success) {
        contactCheck.error.issues.forEach((issue) => {
          const fieldKey = issue.path[0];
          if (typeof fieldKey === "string" || typeof fieldKey === "number") {
            structuredErrors[`contacts.${idx}.${fieldKey}`] = issue.message;
          }
        });
      }
    });

    addresses.forEach((addr, idx) => {
      const addressCheck = PartyAddressSchema.safeParse(addr);
      if (!addressCheck.success) {
        addressCheck.error.issues.forEach((issue) => {
          const fieldKey = issue.path[0];
          if (typeof fieldKey === "string" || typeof fieldKey === "number") {
            structuredErrors[`addresses.${idx}.${fieldKey}`] = issue.message;
          }
        });
      }
    });

    if (Object.keys(structuredErrors).length > 0) {
      setFormErrors(structuredErrors);
      if (Object.keys(structuredErrors).some((k) => k.startsWith("general."))) {
        setActiveTab("general");
      } else if (
        Object.keys(structuredErrors).some((k) => k.startsWith("contacts."))
      ) {
        setActiveTab("contacts");
      } else {
        setActiveTab("locations");
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
        body: JSON.stringify({ account, contacts, addresses }),
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

      // Clear errors, exit edit mode & notify user
      setFormErrors({});
      setIsEditing(false);
      toast.success("Record saved successfully! ✅");
    } catch (err) {
      if (err instanceof Error) {
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
    setFormErrors({});
    setIsEditing(false);
  };

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

  // Standard shared tabs
  tabs.push("contacts", "locations");

  // const tabs = [
  //   "general",
  //   "finance",
  //   "contacts",
  //   "locations",
  //   "activities",
  //   "notes",
  //   "attachments",
  // ];

  const isCrmOrCustomer =
    module === "crm" ||
    module === "customer" ||
    account.is_crm_lead ||
    account.is_customer;

  if (isCrmOrCustomer) {
    tabs.splice(3, 0, "opportunities");
  }

  tabs.push("activities", "notes", "attachments");

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      {/* 1. Header with Conversion Buttons */}
      <PartyDetailHeader
        party={account}
        onPartyUpdated={(updatedAccount) => {
          setAccount((prev) => ({ ...prev, ...updatedAccount }));
          setInitialAccount((prev) => ({ ...prev, ...updatedAccount }));
        }}
        // onPartyUpdated={(updatedAccount) =>
        //   setAccount((prev) => ({ ...prev, ...updatedAccount }))
        // }
      />
      {/* Validation Errors display */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
          <p className="font-semibold mb-1">
            Please fix the following validation errors:
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs">
            {formErrors.global && <li>{formErrors.global}</li>}
            {Object.entries(formErrors)
              .filter(([key]) => key !== "global")
              .map(([key, message]) => (
                <li key={key}>
                  <span className="capitalize font-medium">
                    {key.replace(".", " ")}
                  </span>
                  : {message}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 2. Tab Navigation Menu */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
        {tabs.map((tab) => {
          const hasErrorInTab = Object.keys(formErrors).some((k) =>
            k.startsWith(`${tab}.`),
          );
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab}
              {hasErrorInTab && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Viewport Panels */}
      <div className="py-2">
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
          />
        )}

        {activeTab === "finance" && (
          <FinanceTab
            account={account}
            setAccount={setAccount}
            isReadonly={effectiveReadonly}
            errors={formErrors}
          />
        )}

        {activeTab === "contacts" && (
          <ContactsTab
            contacts={contacts}
            setContacts={setContacts}
            isReadonly={effectiveReadonly}
            errors={formErrors}
          />
        )}
        {activeTab === "locations" && (
          <AddressesTab
            addresses={addresses}
            setAddresses={setAddresses}
            isReadonly={effectiveReadonly}
            errors={formErrors}
          />
        )}

        {activeTab === "opportunities" && (
          <OpportunityCycleTab partyId={id} readonly={effectiveReadonly} />
        )}
        {/* <><ActivitiesTab module={module} recordId={id} /></> */}

        {activeTab === "activities" && (
          <PartyLedgerActivityTab
            partyId={id}
            partyType={
              module === "supplier" || account.is_supplier
                ? "supplier"
                : "customer"
            }
            currencyCode={activeCurrencyCode}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            module={module}
            recordId={id}
            readonly={effectiveReadonly}
          />
        )}
        {activeTab === "attachments" && (
          <AttachmentsTab
            module={module}
            recordId={id}
            readonly={effectiveReadonly}
          />
        )}
      </div>

      {/* Persistent Bottom Action Drawer */}
      <div className="flex justify-end items-center gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
        {!isReadonlyProp && (
          <>
            {!isEditing ? (
              /* VIEW MODE BUTTONS */
              <>
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                >
                  {/* <Icon icon="tabler:edit" className="w-4 h-4" /> */}
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="px-5 font-semibold text-zinc-700 hover:bg-zinc-50 bg-white dark:bg-slate-800 dark:text-zinc-200"
                >
                  Close
                </Button>
              </>
            ) : (
              /* EDIT MODE BUTTONS */
              <>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2"
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
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-5 font-semibold text-zinc-700 hover:bg-zinc-50 bg-white dark:bg-slate-800 dark:text-zinc-200"
                >
                  Cancel
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

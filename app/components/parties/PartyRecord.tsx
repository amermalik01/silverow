// app/components/parties/PartyRecord.tsx

"use client";

import { useEffect, useState } from "react";

import GeneralTab, { type CompanyCurrency } from "./tabs/GeneralTab";

import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";
import ActivitiesTab from "../shared/ActivitiesTab";
import NotesTab from "../shared/NotesTab";
import AttachmentsTab from "../shared/AttachmentsTab";

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
  module: PartyModule | "customer" | "supplier";
  isReadonly?: boolean;
};

export default function PartyRecord({ id, module, isReadonly = false }: Props) {
  const [activeTab, setActiveTab] = useState("general");
  const [account, setAccount] = useState<Partial<Party>>({ id: "" });
  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);
  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);
  const [currencies, setCurrencies] = useState<CompanyCurrency[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch core ledger parameters & currencies list concurrently
        const [partyRes, currencyRes] = await Promise.all([
          fetch(`/api/parties/${id}`),
          fetch("/api/parties/currencies")
        ]);

        if (!partyRes.ok) throw new Error("Entity target footprint retrieval failed.");
        
        const data = await partyRes.json();
        setAccount(data.account ?? {});
        setContacts(data.contacts || []);
        setAddresses(data.addresses || []);

        if (currencyRes.ok) {
          const currencyData = await currencyRes.json();
          setCurrencies(currencyData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
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
      // Auto-focus tab based on where the error occurred
      if (Object.keys(structuredErrors).some((k) => k.startsWith("general."))) {
        setActiveTab("general");
      } else if (
        Object.keys(structuredErrors).some((k) => k.startsWith("contacts."))
      ) {
        setActiveTab("contacts");
      } else {
        setActiveTab("addresses");
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

      alert("Changes saved securely! ✅");
    } catch (err) {
      if (err instanceof Error)
        setFormErrors({
          global: err.message || "An unexpected error occurred.",
        });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-500 text-sm py-12 justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Synchronizing profile indices...
      </div>
    );
  }

  const tabs = [
    "general",
    "contacts",
    "addresses",
    "activities",
    "notes",
    "attachments",
  ];
  if (module === "crm") tabs.splice(3, 0, "opportunities");

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">


      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
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

      
      {/* Tab Navigation Menu */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
        {tabs.map((tab) => {
          const hasErrorInTab = Object.keys(formErrors).some((k) =>
            k.startsWith(`${tab}.`),
          );
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
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

      {/* Tab Viewport Panels */}
      <div className="py-2">
        {activeTab === "general" && (
          <GeneralTab
            account={account}
            setAccount={setAccount}
            errors={formErrors}
            isReadonly={isReadonly}
            currencies={currencies}
          />
        )}
        {activeTab === "contacts" && (
          <ContactsTab
            contacts={contacts}
            setContacts={setContacts}
            errors={formErrors}
          />
        )}
        {activeTab === "addresses" && (
          <AddressesTab
            addresses={addresses}
            setAddresses={setAddresses}
            errors={formErrors}
          />
        )}
        {activeTab === "activities" && (
          <ActivitiesTab module={module} recordId={id} />
        )}
        {activeTab === "notes" && (
          <NotesTab module={module} recordId={id} readonly={isReadonly} />
        )}
        {activeTab === "attachments" && (
          <AttachmentsTab module={module} recordId={id} readonly={isReadonly} />
        )}
      </div>

      {/* Persistent Bottom Action Drawer */}
      {!isReadonly && (
        <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 transition-all text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/10 flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? "Commiting changes..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";

import ActivitiesTab from "../shared/ActivitiesTab";
import NotesTab from "../shared/NotesTab";
import AttachmentsTab from "../shared/AttachmentsTab";

import {
  Party,
  PartyModule,
  PartyDraft,
  PartyContactDraft,
  PartyAddressDraft,
} from "@/types/erp";

type Props = {
  id: string;
  module: PartyModule | "customer" | "supplier";
  isReadonly?: boolean;
};

export default function PartyRecord({ id, module, isReadonly = false }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  // const [account, setAccount] = useState<Partial<Party> | null>(null);
  const [account, setAccount] = useState<Partial<Party>>({
    id: "",
    type:
      module === "crm"
        ? "lead"
        : module === "srm"
          ? "vendor"
          : module === "supplier"
            ? "vendor"
            : "customer",
    status: "active",
  });

  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);

  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/parties/${id}`);

        const data = await res.json();

        setAccount(data.account ?? {});
        setContacts(data.contacts || []);
        setAddresses(data.addresses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!account) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/parties/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          account,
          contacts,
          addresses,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error);
      }

      alert("Updated Successfully ✅");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading record...</p>;
  }

  // if (!account) {
  //   return <p>Record not found</p>;
  // }

  const tabs = [
    "general",
    "contacts",
    "addresses",
    "activities",
    "notes",
    "attachments",
  ];

  if (module === "crm") {
    tabs.splice(3, 0, "opportunities");
  }

  return (
    <div className="space-y-6">

      <div className="flex gap-4 border-b pb-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize px-3 py-1 ${
              activeTab === tab ? "font-bold border-b-2 border-blue-600" : ""
            }`}
          >
            {tab}
          </button>
        ))}
      </div>


      {activeTab === "general" && (
        <GeneralTab
          account={account}
          setAccount={setAccount}
          isReadonly={isReadonly}
        />
      )}


      {activeTab === "contacts" && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}


      {activeTab === "addresses" && (
        <AddressesTab addresses={addresses} setAddresses={setAddresses} />
      )}


      {activeTab === "activities" && (
        <ActivitiesTab module={module} recordId={id} />
      )}


      {activeTab === "notes" && <NotesTab module={module} recordId={id} />}


      {activeTab === "attachments" && (
        <AttachmentsTab module={module} recordId={id} />
      )}


      {!isReadonly && (
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      )}
    </div>
  );
} */

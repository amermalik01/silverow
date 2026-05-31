// app/components/parties/PartyForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Party, PartyContactDraft, PartyAddressDraft } from "@/types/erp";
import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";
import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";
import type { CompanyCurrency } from "./tabs/GeneralTab";

type Props = {
  title: string;
  initialFlags: {
    is_crm_lead?: boolean;
    is_srm_vendor?: boolean;
    is_customer?: boolean;
    is_supplier?: boolean;
  };
  redirectPath: string;
};

export default function PartyForm({
  title,
  initialFlags,
  redirectPath,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "general" | "contacts" | "addresses"
  >("general");
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<CompanyCurrency[]>([]);

  const [account, setAccount] = useState<Partial<Party>>({
    name: "",
    status: "active",
    credit_limit: 0,
    is_crm_lead: initialFlags.is_crm_lead || false,
    is_srm_vendor: initialFlags.is_srm_vendor || false,
    is_customer: initialFlags.is_customer || false,
    is_supplier: initialFlags.is_supplier || false,
  });

  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);
  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);

  // Asynchronously query global currency settings directly inside mounting life-cycle
  useEffect(() => {
    async function fetchCurrencies() {
      try {
        const res = await fetch("/api/parties/currencies");
        if (res.ok) {
          const data = await res.json();
          setCurrencies(data);
        }
      } catch (err) {
        console.error("Error fetching system currencies client side:", err);
      }
    }
    fetchCurrencies();
  }, []);

  const handleFormSubmissionValidation = (): boolean => {
    setFormErrors({});
    const structuredErrors: Record<string, string> = {};

    // 1. Evaluate general corporate base parameters
    const baseCheck = PartySchema.safeParse(account);

    console.log("baseCheck ==== ", baseCheck);
    console.log("contacts ==== ", contacts);
    console.log("addresses ==== ", addresses);

    if (!baseCheck.success) {
      baseCheck.error.issues.forEach((issue) => {
        const fieldKey = issue.path[0];
        if (typeof fieldKey === "string" || typeof fieldKey === "number") {
          structuredErrors[`general.${fieldKey}`] = issue.message;
        }
      });
    }

    // 2. Validate multi-contact matrix
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

    // 3. Validate logical shipping and billing locations
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

    console.log("FormErrors ==== ", formErrors);

    if (Object.keys(structuredErrors).length > 0) {
      setFormErrors(structuredErrors);
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

  const handleSubmit = async () => {
    console.log("handleSubmit ==== ", handleSubmit);
    console.log(
      "handleFormSubmissionValidation ==== ",
      handleFormSubmissionValidation(),
    );
    if (!handleFormSubmissionValidation()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, contacts, addresses }),
      });

      const payload = await res.json();
      if (!res.ok)
        throw new Error(
          payload.error || "Persistence operation processing error.",
        );

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error)
        setFormErrors({
          global: err.message || "An unexpected error occurred.",
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500">
            Configure corporate identity configuration metrics securely.
          </p>
        </div>
      </div>

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

      {/* Tabs Layout */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(["general", "contacts", "addresses"] as const).map((tab) => {
          const matchingTabErrors = Object.keys(formErrors).some((k) =>
            k.startsWith(`${tab}.`),
          );
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-4 py-2.5 text-sm font-medium transition-all relative top-[1px] ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {tab}
              {matchingTabErrors && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="py-2">
        {activeTab === "general" && (
          <GeneralTab
            account={account}
            setAccount={setAccount}
            errors={formErrors}
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
      </div>

      <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => router.push(redirectPath)}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-sm"
        >
          {loading ? "Processing Ledger..." : "Save Record"}
        </button>
      </div>
    </div>
  );
}

/* "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  Party,
  PartyType,
  PartyContactDraft,
  PartyAddressDraft,
} from "@/types/erp";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";
import { PartySchema } from "@/lib/validations/party.schema";

type Props = {
  title: string;
  type: PartyType;
  redirectPath: string;
};

export default function PartyForm({ title, type, redirectPath }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("general");

  const [account, setAccount] = useState<Partial<Party>>({
    type,
    status: "active",
    is_billing: true,
    is_shipping: true,
  });

  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);
  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const validation = PartySchema.safeParse(account);

      if (!validation.success) {
        alert("Please fill required fields");
        return;
      }

      const res = await fetch("/api/parties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: {
            ...account,
            type,
          },
          contacts,
          addresses,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert(`${title} Created Successfully ✅`);

      router.push(redirectPath);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-semibold">{title}</h1>


      <div className="flex gap-4 border-b pb-2">
        {["general", "contacts", "addresses"].map((tab) => (
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
        <GeneralTab account={account} setAccount={setAccount} />
      )}

      {activeTab === "contacts" && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {activeTab === "addresses" && (
        <AddressesTab addresses={addresses} setAddresses={setAddresses} />
      )}


      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
} */

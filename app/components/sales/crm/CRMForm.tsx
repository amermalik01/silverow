// app/components/sales/crm/CRMForm.tsx

"use client";

import { useState } from "react";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";

import { CRMAccount, CRMContact, CRMAddress } from "@/types/crm";
import { Button } from "@/components/ui/button";

export default function CRMForm() {
  const [activeTab, setActiveTab] = useState("general");

  const [account, setAccount] = useState<CRMAccount>({
    name: "",
  });

  const [contacts, setContacts] = useState<CRMContact[]>([]);

  const [addresses, setAddresses] = useState<CRMAddress[]>([]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/sales/crm/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account,
          contacts,
          addresses,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      alert("CRM Created Successfully ✅");
    } catch (err) {
      console.error(err);
      // alert(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="py-6 space-y-6">
      {/* Tabs */}
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

      {/* Tab Content */}
      {activeTab === "general" && (
        <GeneralTab account={account} setAccount={setAccount} />
      )}

      {activeTab === "contacts" && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {activeTab === "addresses" && (
        <AddressesTab addresses={addresses} setAddresses={setAddresses} />
      )}

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}




  /* const handleSubmit = async () => {
    try {
      setLoading(true);

      // 1. CREATE ACCOUNT
      const accRes = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });

      const accountRes = await accRes.json();

      if (!accRes.ok) throw new Error(accountRes.message);

      const accountId = accountRes.id;

      // 2. PRIMARY CONTACT (from GeneralTab)
      if (account.contact_person) {
        await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: accountId,
            name: account.contact_person,
            email: account.cemail,
            phone: account.cphone,
            is_primary: true,
          }),
        });
      }

      // 3. PRIMARY ADDRESS (from GeneralTab)
      if (account.address_1) {
        await fetch("/api/crm/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: accountId,
            address_1: account.address_1,
            address_2: account.address_2,
            city: account.city,
            county: account.county,
            postcode: account.postcode,
            country_id: account.country_id,
            is_primary: true,
          }),
        });
      }

      // 4. EXTRA CONTACTS
      for (const c of contacts) {
        await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...c,
            account_id: accountId,
            is_primary: false,
          }),
        });
      }

      // 5. EXTRA ADDRESSES
      for (const a of addresses) {
        await fetch("/api/crm/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...a,
            account_id: accountId,
            is_primary: false,
          }),
        });
      }

      alert("CRM Created Successfully ✅");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }; */

/* "use client";

import { useState } from "react";
// import GeneralSection from "./GeneralSection";
// import ContactSection from "./ContactSection";
// import AddressSection from "./AddressSection";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";

export default function CRMForm() {
  const [activeTab, setActiveTab] = useState("general");

  const [account, setAccount] = useState<any>({});
  const [contacts, setContacts] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    crm_code: "",
    email: "",
    phone: "",

    contact_person: "",
    cemail: "",

    address_1: "",
    city: "",
  });

  const handleSubmit = async () => {
    // 1. create account
    const accRes = await fetch("/api/crm/accounts", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const account = await accRes.json();

    // 2. create primary contact
    await fetch("/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify({
        account_id: account.id,
        name: form.contact_person,
        email: form.cemail,
        is_primary: true,
      }),
    });

    // 3. create primary address
    await fetch("/api/crm/addresses", {
      method: "POST",
      body: JSON.stringify({
        account_id: account.id,
        address_1: form.address_1,
        city: form.city,
        is_primary: true,
      }),
    });
  };

  return (
    <div className="py-6 space-y-6">

      <div className="flex gap-4 border-b pb-2">
        {["general", "contacts", "addresses"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize ${activeTab === tab ? "font-bold border-b-2 border-blue-600" : ""}`}
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
    </div>
  );
} */

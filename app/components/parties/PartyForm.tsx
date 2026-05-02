// app/components/parties/PartyForm.tsx

"use client";

import { useState } from "react";

import type {
  Party,
  PartyType,
  PartyContactDraft,
  PartyAddressDraft,
} from "@/types/erp";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";

type Props = {
  title: string;
  type: PartyType;
  redirectPath: string;
};
// type Props = {
//   title: string;
//   type: "customer" | "supplier" | "lead";
//   redirectPath: string;
// };

export default function PartyForm({ title, type, redirectPath }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  const [account, setAccount] = useState<Partial<Party>>({
    name: "",
    type,
  });
  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);
  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/parties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: account as Partial<Party>,
          contacts,
          addresses,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert(`${title} Created Successfully ✅`);

      window.location.href = redirectPath;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <h1 className="text-xl font-semibold">{title}</h1>

      {/* TABS */}
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

      {/* TAB CONTENT */}
      {activeTab === "general" && (
        <GeneralTab account={account} setAccount={setAccount} />
      )}

      {activeTab === "contacts" && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {activeTab === "addresses" && (
        <AddressesTab addresses={addresses} setAddresses={setAddresses} />
      )}

      {/* ACTION */}
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
}

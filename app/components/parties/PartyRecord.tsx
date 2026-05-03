// app/components/parties/PartyRecord.tsx

"use client";

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

  const [account, setAccount] = useState<Partial<Party> | null>(null);

  const [contacts, setContacts] = useState<PartyContactDraft[]>([]);

  const [addresses, setAddresses] = useState<PartyAddressDraft[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/parties/${id}`);

        const data = await res.json();

        setAccount(data.account);
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

  if (!account) {
    return <p>Record not found</p>;
  }

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
      {/* TABS */}
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

      {/* GENERAL */}
      {activeTab === "general" && (
        <GeneralTab
          account={account}
          setAccount={setAccount}
          isReadonly={isReadonly}
        />
      )}

      {/* CONTACTS */}
      {activeTab === "contacts" && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}

      {/* ADDRESSES */}
      {activeTab === "addresses" && (
        <AddressesTab addresses={addresses} setAddresses={setAddresses} />
      )}

      {/* ACTIVITIES */}
      {activeTab === "activities" && (
        <ActivitiesTab module={module} recordId={id} />
      )}

      {/* NOTES */}
      {activeTab === "notes" && <NotesTab module={module} recordId={id} />}

      {/* ATTACHMENTS */}
      {activeTab === "attachments" && (
        <AttachmentsTab module={module} recordId={id} />
      )}

      {/* SAVE */}
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
}

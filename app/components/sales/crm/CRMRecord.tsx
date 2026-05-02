// app/components/sales/crm/CRMRecord.tsx

"use client";

import { useState, useEffect } from "react";

import GeneralTab from "./tabs/GeneralTab";
import ContactsTab from "./tabs/ContactsTab";
import AddressesTab from "./tabs/AddressesTab";

import OpportunitiesTab from "./tabs/OpportunitiesTab";
import ActivitiesTab from "./tabs/ActivitiesTab";
import NotesTab from "./tabs/NotesTab";
import AttachmentsTab from "./tabs/AttachmentsTab";

import { CRMAccount, CRMContact, CRMAddress } from "@/types/crm";

type Props = {
  id: string;
  isReadonly?: boolean;
};

export default function CRMRecord({ id, isReadonly = false }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  const [account, setAccount] = useState<CRMAccount | null>(null);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [addresses, setAddresses] = useState<CRMAddress[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // console.log('isReadonly ==== ',isReadonly);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/sales/crm/${id}`);

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

      const res = await fetch(`/api/sales/crm/${id}`, {
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

      if (!res.ok) throw new Error(result.error);

      alert("CRM Updated Successfully ✅");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading CRM record...</p>;
  }

  if (!account) {
    return <p>CRM record not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* TABS */}

      <div className="flex gap-4 border-b pb-2 flex-wrap">
        {[
          "general",
          "contacts",
          "addresses",
          "opportunities",
          "activities",
          "notes",
          "attachments",
        ].map((tab) => (
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

      {activeTab === "opportunities" && (
        <OpportunitiesTab partyId={account.id} />
      )}

      {activeTab === "activities" && (
        <ActivitiesTab module="crm_lead" recordId={account.id} />
      )}

      {activeTab === "notes" && (
        <NotesTab module="crm_lead" recordId={account.id} />
      )}

      {activeTab === "attachments" && (
        <AttachmentsTab module="crm_lead" recordId={account.id} />
      )}

      {!isReadonly && (
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {saving ? "Saving..." : "Update CRM"}
          </button>
        </div>
      )}
    </div>
  );
}

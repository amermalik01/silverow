// app/components/setup/inventory/warehouses/WarehouseRecord.tsx

"use client";

import { useEffect, useState } from "react";
import FormEngine from "@/app/components/common/FormEngine";

import GeneralTab from "./tabs/GeneralTab";
import LocationsTab from "./tabs/LocationsTab";
import ContactsTab from "./tabs/ContactsTab";

import {
  Warehouse,
  WarehouseLocation,
  WarehouseContact,
} from "@/types/warehouse";

type Props = {
  id: string;
};

export default function WarehouseRecord({ id }: Props) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [contacts, setContacts] = useState<WarehouseContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [w, l, c] = await Promise.all([
        fetch(`/api/setup/warehouses/${id}`).then((r) => r.json()),
        fetch(`/api/setup/warehouses/${id}/locations`).then((r) => r.json()),
        fetch(`/api/setup/warehouses/${id}/contacts`).then((r) => r.json()),
      ]);

      setWarehouse(w);
      setLocations(l);
      setContacts(c);
      setLoading(false);
    };

    load();
  }, [id]);

  const handleSave = async () => {
    if (!warehouse) return;

    await fetch(`/api/setup/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouse,
        locations,
        contacts,
      }),
    });

    alert("Warehouse Updated ✅");
  };

  const tabs = [
    {
      key: "general",
      label: "General",
      render: ({
        record,
        setRecord,
      }: {
        record: Warehouse;
        setRecord: (val: Warehouse | ((prev: Warehouse) => Warehouse)) => void;
      }) => (
        <GeneralTab
          warehouse={record}
          setWarehouse={setRecord}
          locations={locations}
        />
      ),
    },
    {
      key: "locations",
      label: "Locations",
      render: () => (
        <LocationsTab
          warehouseId={id}
          locations={locations}
          setLocations={setLocations}
        />
      ),
    },
    {
      key: "contacts",
      label: "Contacts",
      render: () => (
        <ContactsTab
          warehouseId={id}
          contacts={contacts}
          setContacts={setContacts}
        />
      ),
    },
  ];

  return (
    <FormEngine
      record={warehouse}
      setRecord={setWarehouse}
      tabs={tabs}
      onSave={handleSave}
      loading={loading}
    />
  );
}

/* "use client";

import { useEffect, useState } from "react";
import {
  Warehouse,
  WarehouseLocation,
  WarehouseContact,
} from "@/types/warehouse";

import GeneralTab from "./tabs/GeneralTab";
import LocationsTab from "./tabs/LocationsTab";
import ContactsTab from "./tabs/ContactsTab";

type Props = {
  id: string;
};

export default function WarehouseRecord({ id }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [contacts, setContacts] = useState<WarehouseContact[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/setup/warehouses/${id}`);
      const data = await res.json();

      setWarehouse(data);
      setLoading(false);
    };

    const loadLocations = async () => {
      const res = await fetch(`/api/setup/warehouses/${id}/locations`);
      setLocations(await res.json());
    };

    const loadContacts = async () => {
      const res = await fetch(`/api/setup/warehouses/${id}/contacts`);
      setContacts(await res.json());
    };

    load();
    loadLocations();
    loadContacts();
  }, [id]);

  if (loading) return <p>Loading warehouse...</p>;
  if (!warehouse) return <p>Warehouse not found</p>;

  return (
    <div className="space-y-6">

      <div className="flex gap-4 border-b pb-2">
        {["general", "locations", "contacts"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize px-3 py-1 ${
              activeTab === tab ? "border-b-2 border-blue-600 font-bold" : ""
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <GeneralTab warehouse={warehouse} setWarehouse={setWarehouse} />
      )}

      {activeTab === "locations" && (
        <LocationsTab
          warehouseId={id}
          locations={locations}
          setLocations={setLocations}
        />
      )}

      {activeTab === "contacts" && (
        <ContactsTab
          warehouseId={id}
          contacts={contacts}
          setContacts={setContacts}
        />
      )}
    </div>
  );
}
 */

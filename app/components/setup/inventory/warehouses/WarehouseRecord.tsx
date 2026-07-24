// app/components/setup/inventory/warehouses/WarehouseRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  id?: string;
  isReadOnly?: boolean;
};

const initialWarehouseState: Partial<Warehouse> = {
  name: "",
  type: "DISTRIBUTION",
  status: 1,
  is_default: false,
  country: "United Kingdom",
  unit_of_measure: "Pcs",
  cost_frequency: "Weekly",
  e_dispatch_email: false,
};

export default function WarehouseRecord({ id, isReadOnly = false }: Props) {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(
    id ? null : (initialWarehouseState as Warehouse),
  );

  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [contacts, setContacts] = useState<WarehouseContact[]>([]);
  // const [loading, setLoading] = useState(true);

  const [loading, setLoading] = useState(Boolean(id));
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const [warehouse_res, location_res, contact_res] = await Promise.all([
          fetch(`/api/setup/warehouses/${id}`).then((r) => r.json()),
          fetch(`/api/setup/warehouses/${id}/locations`).then((r) => r.json()),
          fetch(`/api/setup/warehouses/${id}/contacts`).then((r) => r.json()),
        ]);

        setWarehouse(warehouse_res);
        setLocations(Array.isArray(location_res) ? location_res : []);
        setContacts(Array.isArray(contact_res) ? contact_res : []);
      } catch (err) {
        console.error("Error loading warehouse record:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async () => {
    if (isReadOnly || !warehouse) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      const url = id ? `/api/setup/warehouses/${id}` : `/api/setup/warehouses`;
      const method = id ? "PUT" : "POST";

      const payload = id
        ? { warehouse, locations, contacts }
        : { ...warehouse, locations, contacts };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed");

      setSaveStatus("success");

      // Redirect after creation or show feedback after update
      if (!id) {
        const createdId = result.id || result.warehouse?.id;
        if (createdId) {
          router.push(`/${slug}/setup/inventory/warehouses/${createdId}/edit`);
        } else {
          router.push(`/${slug}/setup/inventory/warehouses`);
        }
        router.refresh();
      } else {
        setTimeout(() => setSaveStatus("idle"), 3000);
      }

      setSaveStatus("success");
      alert("Warehouse details saved successfully.");
    } catch (err) {
      console.error("Failed to save warehouse:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }

    /* try {
      const res = await fetch(`/api/setup/warehouses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse,
          locations,
          contacts,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      alert("Warehouse details saved successfully.");
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    } */
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
          isReadOnly={isReadOnly}
        />
      ),
    },
    {
      key: "contacts",
      label: "Other Contacts",
      render: () => (
        <ContactsTab
          warehouseId={id || ""}
          contacts={contacts}
          setContacts={setContacts}
          isReadOnly={isReadOnly}
        />
      ),
    },
    {
      key: "locations",
      label: "Storage Locations",
      render: () => (
        <LocationsTab
          warehouseId={id || ""}
          locations={locations}
          setLocations={setLocations}
          isReadOnly={isReadOnly}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {saveStatus === "success" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md font-medium">
          ✓ Warehouse records saved successfully
        </div>
      )}
      {saveStatus === "error" && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md font-medium">
          ✕ Failed to save warehouse records. Please check input data.
        </div>
      )}

      <FormEngine
        record={warehouse}
        setRecord={setWarehouse}
        tabs={tabs}
        onSave={isReadOnly ? undefined : handleSave}
        loading={loading || saving}
      />
    </div>
  );
}
// onSave={handleSave}
// loading={loading || saveStatus === "saving"}

/* 
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
} */

// app/components/setup/inventory/warehouses/tabs/LocationForm.tsx

"use client";

import { useState } from "react";
import { WarehouseLocation, WarehouseLocationType } from "@/types/warehouse";

type LocationFormData = Partial<WarehouseLocation>;

type Props = {
  warehouseId: string;
  parentId?: string | null;
  onSuccess: (loc: WarehouseLocation) => void;
  existing?: LocationFormData;
};

export const LOCATION_TYPES: WarehouseLocationType[] = [
  "WAREHOUSE",
  "ZONE",
  "AISLE",
  "RACK",
  "SHELF",
  "BIN",
  "DEPOT",
];

export default function LocationForm({
  warehouseId,
  parentId = null,
  onSuccess,
  existing,
}: Props) {

  const [form, setForm] = useState({
    title: existing?.title || "",
    type: "BIN" as WarehouseLocation["type"],
    code: existing?.code || "",
    city: existing?.city || "",
    capacity: existing?.capacity || ("" as string | number),
  });

  const handleSubmit = async () => {
    const method = existing ? "PUT" : "POST";
    const url = existing
      ? `/api/setup/warehouses/${warehouseId}/locations/${existing.id}`
      : `/api/setup/warehouses/${warehouseId}/locations`;

    const payload = {
      ...form,
      parent_id: parentId ?? null,
      capacity: form.capacity === "" ? null : Number(form.capacity),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    onSuccess(data);
  };

  return (
    <div className="border p-4 rounded space-y-2">
      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="border p-2 w-full"
      />

      <select
        value={form.type}
        onChange={(e) =>
          setForm({
            ...form,
            type: e.target.value as WarehouseLocation["type"],
          })
        }
        className="border p-2 w-full"
      >
        {LOCATION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <input
        placeholder="Code"
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="City"
        value={form.city}
        onChange={(e) => setForm({ ...form, city: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Capacity"
        value={form.capacity}
        onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        className="border p-2 w-full"
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {existing ? "Update" : "Create"}
      </button>
    </div>
  );
}

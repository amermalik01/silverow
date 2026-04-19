// app/components/setup/inventory/warehouses/tabs/ContactForm.tsx

"use client";

import { useState } from "react";
import {
  WarehouseContact,
  WarehouseContactType,
} from "@/types/warehouse";

type ContactFormData = Partial<WarehouseContact>;

type Props = {
  warehouseId: string;
  onSuccess: (c: WarehouseContact) => void;
  existing?: ContactFormData;
};

const CONTACT_TYPES: WarehouseContactType[] = [
  "MANAGER",
  "SUPERVISOR",
  "DELIVERY",
  "BILLING",
];

export default function ContactForm({
  warehouseId,
  onSuccess,
  existing,
}: Props) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    job_title: existing?.job_title || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    mobile: existing?.mobile || "",
    type: (existing?.type || "MANAGER") as WarehouseContactType,
    status: existing?.status ?? 1,
  });

  const handleSubmit = async () => {
    if (!form.name) {
      alert("Name is required");
      return;
    }

    const method = existing ? "PUT" : "POST";

    const url = existing
      ? `/api/setup/warehouses/${warehouseId}/contacts/${existing.id}`
      : `/api/setup/warehouses/${warehouseId}/contacts`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error saving contact");
      return;
    }

    onSuccess(data);
  };

  return (
    <div className="border p-4 rounded space-y-2">
      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Job Title"
        value={form.job_title}
        onChange={(e) => setForm({ ...form, job_title: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Mobile"
        value={form.mobile}
        onChange={(e) => setForm({ ...form, mobile: e.target.value })}
        className="border p-2 w-full"
      />

      <select
        value={form.type}
        onChange={(e) =>
          setForm({
            ...form,
            type: e.target.value as WarehouseContactType,
          })
        }
        className="border p-2 w-full"
      >
        {CONTACT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: Number(e.target.value) })
        }
        className="border p-2 w-full"
      >
        <option value={1}>Active</option>
        <option value={0}>Inactive</option>
      </select>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {existing ? "Update" : "Create"}
      </button>
    </div>
  );
}
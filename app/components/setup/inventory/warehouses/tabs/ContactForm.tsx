// app/components/setup/inventory/warehouses/tabs/ContactForm.tsx

"use client";

import { useState } from "react";
import { WarehouseContact } from "@/types/warehouse";

type Props = {
  warehouseId: string;
  onSuccess: (c: WarehouseContact) => void;
  onClose: () => void;
  existing?: Partial<WarehouseContact>;
  isReadOnly?: boolean;
};

export default function ContactForm({
  warehouseId,
  onSuccess,
  onClose,
  existing,
  isReadOnly = false,
}: Props) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    job_title: existing?.job_title || "",
    direct_line: existing?.direct_line || "",
    mobile: existing?.mobile || "",
    telephone: existing?.telephone || "",
    fax: existing?.fax || "",
    email: existing?.email || "",
    location_name: existing?.location_name || "",
    address_line_1: existing?.address_line_1 || "",
    address_line_2: existing?.address_line_2 || "",
    city: existing?.city || "",
    county: existing?.county || "",
    postcode: existing?.postcode || "",
    country: existing?.country || "United Kingdom",
  });

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!form.name) return alert("Contact Name is required.");

    const method = existing?.id ? "PUT" : "POST";
    const url = existing?.id
      ? `/api/setup/warehouses/${warehouseId}/contacts/${existing.id}`
      : `/api/setup/warehouses/${warehouseId}/contacts`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      onSuccess(data);
    } else {
      alert("Failed to save contact.");
    }
  };

  const inputClass = `w-full px-2 py-1 rounded border text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    isReadOnly
      ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
      : "bg-white border-slate-300 text-slate-900"
  }`;

  const labelClass = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h4 className="font-semibold text-slate-800 text-xs">
          {isReadOnly ? "Contact Details" : existing?.id ? "Edit Contact" : "Add Contact"}
        </h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs">
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="space-y-3 col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>
              Contact Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Job Title</label>
            <input
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Direct Line</label>
            <input
              value={form.direct_line}
              onChange={(e) => setForm({ ...form, direct_line: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Telephone</label>
            <input
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Fax</label>
            <input
              value={form.fax}
              onChange={(e) => setForm({ ...form, fax: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-3"></div>

        <div className="space-y-3 col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Location Name</label>
            <input
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Address Line 1</label>
            <input
              value={form.address_line_1}
              onChange={(e) => setForm({ ...form, address_line_1: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Address Line 2</label>
            <input
              value={form.address_line_2}
              onChange={(e) => setForm({ ...form, address_line_2: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>County</label>
              <input
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Postcode</label>
              <input
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium"
        >
          Cancel
        </button>
        {!isReadOnly && (
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium shadow-sm"
          >
            {existing?.id ? "Update Contact" : "Save Contact"}
          </button>
        )}
      </div>
    </div>
  );
}

/* "use client";

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
} */
// app/components/setup/inventory/warehouses/tabs/LocationForm.tsx

"use client";

import { useState } from "react";
import { WarehouseLocation } from "@/types/warehouse";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

type Props = {
  warehouseId: string;
  onSuccess: (loc: WarehouseLocation) => void;
  onClose: () => void;
  existing?: Partial<WarehouseLocation>;
  isReadOnly?: boolean;
};

export default function LocationForm({
  warehouseId,
  onSuccess,
  onClose,
  existing,
  isReadOnly = false,
}: Props) {
  const [form, setForm] = useState({
    title: existing?.title || "",
    parent_id: existing?.parent_id || "",
    start_date: existing?.start_date || "",
    unit_of_measure: existing?.unit_of_measure || "Pcs",
    cost_frequency: existing?.cost_frequency || "Weekly",
    currency: existing?.currency || "GBP",
    cost: existing?.cost || "",
    comments: existing?.comments || "",
  });

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!form.title) return alert("Storage Location Title is required.");

    const method = existing?.id ? "PUT" : "POST";
    const url = existing?.id
      ? `/api/setup/warehouses/${warehouseId}/locations/${existing.id}`
      : `/api/setup/warehouses/${warehouseId}/locations`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      onSuccess(data);
    } else {
      alert("Failed to save location.");
    }
  };

  const inputClass = `w-full col-span-8 px-2 py-1 rounded border text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    isReadOnly
      ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
      : "bg-white border-slate-300 text-slate-900"
  }`;

  const labelClass = "block text-xs font-medium text-slate-600 mb-1 col-span-4";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <h4 className="font-semibold text-slate-800 text-xs">
          {isReadOnly
            ? "Storage Location Details"
            : existing?.id
              ? "Edit Storage Location"
              : "Add Storage Location"}
        </h4>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>
              Storage Location <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>Parent Storage Location</label>
            <input
              value={form.parent_id || ""}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              disabled={isReadOnly}
              placeholder="Select Parent Storage Location"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>
              Start Date <span className="text-rose-500">*</span>
            </label>
            {/* <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            /> */}
            <DatePicker
              value={form.start_date ? parseISO(form.start_date) : undefined}
              onChange={(date) =>
                setForm({
                  ...form,
                  start_date: date ? format(date, "yyyy-MM-dd") : "",
                })
              }
              disabled={isReadOnly}
              containerClassName="col-span-8"
              className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1 rounded text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>
              Unit of Measure <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.unit_of_measure}
              onChange={(e) =>
                setForm({ ...form, unit_of_measure: e.target.value })
              }
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>
              Cost Frequency <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.cost_frequency}
              onChange={(e) =>
                setForm({ ...form, cost_frequency: e.target.value })
              }
              disabled={isReadOnly}
              className={inputClass}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annually">Annually</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelClass}>Currency</label>
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-12 items-center gap-2">
              <label className={labelClass}>Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-2">
            <label className={labelClass}>Comments</label>
            <textarea
              rows={2}
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        {!isReadOnly && (
          <Button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium shadow-sm"
          >
            {existing?.id ? "Update Location" : "Save Location"}
          </Button>
        )}
        <Button
          onClick={onClose}
          className="px-4 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* "use client";

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

      <Button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {existing ? "Update" : "Create"}
      </Button>
    </div>
  );
} */

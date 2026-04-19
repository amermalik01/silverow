// app/components/setup/inventory/warehouses/WarehouseForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { warehouseSchema } from "@/lib/validations/warehouse.schema";
import { z } from "zod";
import { getZodErrorMessages } from "@/lib/utils/zodError";

type WarehouseFormType = {
  name: string;
  type: string;
  status: number;

  currency_id?: string;
  storage_type_id?: string;
};

export default function WarehouseForm({ id }: { id?: string }) {
  const router = useRouter();

  const [form, setForm] = useState<WarehouseFormType>({
    name: "",
    type: "DISTRIBUTION",
    status: 1,
  });

  const [loading, setLoading] = useState(false);

  // 🔥 Load for edit
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const res = await fetch(`/api/setup/warehouses/${id}`);
      const data = await res.json();

      setForm({
        name: data.name,
        type: data.type,
        status: data.status,
      });
    };

    load();
  }, [id]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const validated = warehouseSchema.parse(form);

      const url = id ? `/api/setup/warehouses/${id}` : `/api/setup/warehouses`;

      const method = id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      router.push(`/inventory/warehouses`);
      router.refresh();
    } catch (err) {
      const messages = getZodErrorMessages(err);
      alert(messages.join("\n"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Warehouse Name"
        className="border p-2 w-full"
      />

      <select
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
        className="border p-2 w-full"
      >
        <option value="DISTRIBUTION">Distribution</option>
        <option value="STORE">Store</option>
        <option value="TRANSIT">Transit</option>
        <option value="COLD_STORAGE">Cold Storage</option>
      </select>

      <select
        value={form.status}
        onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
        className="border p-2 w-full"
      >
        <option value={1}>Active</option>
        <option value={0}>Inactive</option>
      </select>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? "Saving..." : id ? "Update Warehouse" : "Create Warehouse"}
      </button>
    </div>
  );
}

// app/components/setup/inventory/warehouses/WarehouseForm.tsx

// app/components/setup/inventory/warehouses/WarehouseForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { warehouseSchema } from "@/lib/validations/warehouse.schema";
import { getZodErrorMessages } from "@/lib/utils/zodError";
import { Button } from "@/components/ui/button";

type WarehouseFormType = {
  name: string;
  type: string;
  status: number;
  currency_id?: string;
  storage_type_id?: string;
};

export default function WarehouseForm({ id }: { id?: string }) {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [form, setForm] = useState<WarehouseFormType>({
    name: "",
    type: "DISTRIBUTION",
    status: 1,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/setup/warehouses/${id}`);
        const data = await res.json();

        setForm({
          name: data.name || "",
          type: data.type || "DISTRIBUTION",
          status: data.status ?? 1,
        });
      } catch (err) {
        setErrorMessage("Failed to load warehouse records.");
      }
    };

    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

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
      if (!res.ok) throw new Error(result.error || "Failed to save warehouse.");

      router.push(`/${slug}/setup/inventory/warehouses`);
      router.refresh();
    } catch (err) {
      const messages = getZodErrorMessages(err);
      setErrorMessage(messages.length > 0 ? messages.join(" | ") : "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-2xl">
      {errorMessage && (
        <div className="mb-6 p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold capitalize text-slate-600 mb-1.5">
            Warehouse Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Central Fulfillment Hub"
            className="w-full px-3.5 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold capitalize text-slate-600 mb-1.5">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3.5 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
            >
              <option value="DISTRIBUTION">Distribution</option>
              <option value="STORE">Store</option>
              <option value="TRANSIT">Transit</option>
              <option value="COLD_STORAGE">Cold Storage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold capitalize text-slate-600 mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
              className="w-full px-3.5 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <Button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : id ? "Update Warehouse" : "Create Warehouse"}
          </Button>
          <Button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

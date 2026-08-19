// app/components/setup/inventory/uoms/UOMForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UOMFormData } from "@/types/inventory";
import { Button } from "@/components/ui/button";

type Props = {
  id?: string;
};

export default function UOMForm({ id }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<UOMFormData>({
    code: "",
    name: "",
    uom_type: 1,
    decimal_places: 2,
    status: 1,
  });

  useEffect(() => {
    const loadUOM = async () => {
      const res = await fetch(`/api/setup/inventory/uoms/${id}`);

      const result = await res.json();

      setForm(result);
    };
    if (id) {
      loadUOM();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);

    try {
      e.preventDefault();

      const method = id ? "PUT" : "POST";

      const url = id
        ? `/api/setup/inventory/uoms/${id}`
        : "/api/setup/inventory/uoms";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      router.push(`../`);
    } catch (err) {
      console.log("error ===", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block mb-1">Code</label>

        <input
          value={form.code}
          onChange={(e) =>
            setForm({
              ...form,
              code: e.target.value,
            })
          }
          required
          className="border p-2 w-full"
        />
      </div>

      <div>
        <label className="block mb-1">Name</label>

        <input
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          required
          className="border p-2 w-full"
        />
      </div>

      <div>
        <label className="block mb-1">Type</label>

        <select
          value={form.uom_type}
          onChange={(e) =>
            setForm({
              ...form,
              uom_type: Number(e.target.value),
            })
          }
          className="border p-2 w-full"
        >
          <option value={1}>Quantity</option>

          <option value={2}>Weight</option>

          <option value={3}>Volume</option>

          <option value={4}>Length</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Decimal Places</label>

        <input
          type="number"
          value={form.decimal_places}
          onChange={(e) =>
            setForm({
              ...form,
              decimal_places: Number(e.target.value),
            })
          }
          className="border p-2 w-full"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? "Saving..." : id ? "Update UOM" : "Create UOM"}
      </Button>
    </form>
  );
}

// app/components/setup/inventory/brands/BrandForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandForm as BrandFormType } from "@/types/inventory";
import { Button } from "@/components/ui/button";

type Props = {
  id?: string;
};

export default function BrandForm({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<BrandFormType>({
    code: "",
    code_prefix: "",
    name: "",
    status: 1,
  });

  useEffect(() => {
    const loadBrand = async () => {
      const res = await fetch(`/api/setup/inventory/brands/${id}`);

      const result = await res.json();

      setForm(result);
    };
    if (id) {
      loadBrand();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);

    try {
      e.preventDefault();

      const method = id ? "PUT" : "POST";

      const url = id
        ? `/api/setup/inventory/brands/${id}`
        : "/api/setup/inventory/brands";

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
      <input
        placeholder="Code"
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
        className="border p-2 w-full"
      />

      <input
        placeholder="Code Prefix"
        value={form.code_prefix}
        onChange={(e) =>
          setForm({
            ...form,
            code_prefix: e.target.value,
          })
        }
        className="border p-2 w-full"
      />

      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="border p-2 w-full"
      />

      <Button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? "Saving..." : id ? "Update Brand" : "Create Brand"}
      </Button>
    </form>
  );
}

// app/components/setup/inventory/categories/CategoryForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryOption } from "@/types/inventory";

type Props = {
  id?: string;
};

export default function CategoryForm({ id }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    code: "",
    code_prefix: "",
    name: "",
    description: "",
    parent_id: "",
    status: 1,
  });

  const [parents, setParents] = useState<CategoryOption[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParents = async () => {
      const res = await fetch("/api/setup/inventory/categories");

      const result = await res.json();

      setParents(result);
    };

    const loadCategory = async () => {
      const res = await fetch(`/api/setup/inventory/categories/${id}`);

      const result = await res.json();

      // setForm(result);
      setForm({
        ...result,
        parent_id: result.parent_id ?? "",
        description: result.description ?? "",
      });
    };

    loadParents();

    if (id) {
      loadCategory();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);

    try {
      e.preventDefault();

      const method = id ? "PUT" : "POST";

      const url = id
        ? `/api/setup/inventory/categories/${id}`
        : "/api/setup/inventory/categories";

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
          className="border p-2 w-full"
        />
      </div>

      <div>
        <label className="block mb-1">Code Prefix</label>

        <input
          value={form.code_prefix}
          onChange={(e) =>
            setForm({
              ...form,
              code_prefix: e.target.value,
            })
          }
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
        <label className="block mb-1">Parent Category</label>

        <select
          value={form.parent_id || ""}
          onChange={(e) =>
            setForm({
              ...form,
              parent_id: e.target.value,
            })
          }
          className="border p-2 w-full"
        >
          <option value="">None</option>

          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1">Description</label>

        <textarea
          value={form.description || ""}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          className="border p-2 w-full"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {loading ? "Saving..." : id ? "Update Category" : "Create Category"}
      </button>
    </form>
  );
}

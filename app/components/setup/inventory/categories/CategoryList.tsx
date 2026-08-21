// app/components/setup/inventory/categories/CategoryList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

type Category = {
  id: string;
  code: string;
  name: string;
  parent_name?: string;
  status: number;
};

export default function CategoryList() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const res = await fetch("/api/setup/inventory/categories");

      const result = await res.json();

      setData(result);

      setLoading(false);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this category?",
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/setup/inventory/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      // remove from UI (no full reload)
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log("Delete error:", err);
      alert("Failed to delete record");
    }
  };

  return (
    <div className="space-y-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Categories</h2>

        {/* <Link
          href="./categories/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Category
        </Link> */}

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href="./categories/new">
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border text-left">
          <thead>
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Name</th>
              <th className="p-2">Parent</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.code}</td>

                <td className="p-2">
                  <Link
                    href={`./categories/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">{row.parent_name || "-"}</td>

                <td className="p-2">
                  {row.status === 1 ? "Active" : "Inactive"}
                </td>

                <td className="p-2 space-x-2">
                  <Link
                    href={`./categories/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    Edit
                  </Link>

                  <Button
                    onClick={() => handleDelete(row.id)}
                    variant="cancel"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

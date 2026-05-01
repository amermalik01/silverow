// app/components/setup/inventory/brands/BrandList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/types/inventory";

export default function BrandList() {
  const [data, setData] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const res = await fetch("/api/setup/inventory/brands");

      const result = await res.json();

      setData(result);

      setLoading(false);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this brand?",
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/setup/inventory/brands/${id}`, {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Brands</h2>

        <Link
          href="./brands/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Brand
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border text-left">
          <thead>
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Prefix</th>
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.code}</td>

                <td className="p-2">{row.code_prefix}</td>

                <td className="p-2">
                  <Link
                    href={`./brands/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">
                  {row.status === 1 ? "Active" : "Inactive"}
                </td>

                <td className="p-2 space-x-2">
                  <Link
                    href={`./brands/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(row.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

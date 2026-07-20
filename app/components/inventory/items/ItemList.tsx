// app/components/inventory/items/ItemList.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ItemListRow } from "@/types/inventory";

export default function ItemList() {
  const [data, setData] = useState<ItemListRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/inventory/items");

      if (!res.ok) {
        throw new Error("Failed to load items");
      }

      const result: ItemListRow[] = await res.json();

      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      item.item_code.toLowerCase().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      (item.barcode || "").toLowerCase().includes(keyword)
    );
  });

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this item?");

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/inventory/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-80"
        />

        <Link
          href="./items/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Item
        </Link>
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="">
            <tr>
              <th className="p-3 text-left">Code</th>

              <th className="p-3 text-left">Barcode</th>

              <th className="p-3 text-left">Name</th>

              <th className="p-3 text-left">Category</th>

              <th className="p-3 text-left">Brand</th>

              <th className="p-3 text-left">Type</th>

              <th className="p-3 text-left">Status</th>

              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              filteredData.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.item_code}</td>

                  <td className="p-3">{row.barcode || "-"}</td>

                  <td className="p-3">
                    <Link href={`./items/${row.id}`} className="text-blue-600">
                      {row.name}
                    </Link>
                  </td>

                  <td className="p-3">{row.category_name || "-"}</td>

                  <td className="p-3">{row.brand_name || "-"}</td>

                  <td className="p-3">{row.item_type_label}</td>

                  <td className="p-3">{row.status_label}</td>

                  <td className="p-3 flex gap-3">
                    <Link href={`./items/${row.id}`} className="text-blue-600">
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

            {!loading && filteredData.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && <div className="p-4">Loading...</div>}
      </div>
    </div>
  );
}

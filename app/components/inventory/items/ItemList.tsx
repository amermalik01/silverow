// app/components/inventory/items/ItemList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

import { ItemListRow } from "@/types/inventory";

export default function ItemList() {
  const [data, setData] = useState<ItemListRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [page, debouncedSearch]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
      });

      const res = await fetch(`/api/inventory/items?${params}`);

      if (!res.ok) {
        throw new Error("Failed to load items");
      }

      const result = await res.json();
      
      // Handle both array response or paginated object structure
      if (Array.isArray(result)) {
        setData(result);
        setTotalRecords(result.length);
      } else {
        setData(result.data || []);
        setTotalRecords(result.total || 0);
      }
    } catch (err) {
      console.error("Failed to acquire records: ", err);
    } finally {
      setLoading(false);
    }
  };

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
      setTotalRecords((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error deleting item: ", err);
    }
  };

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div className="space-y-6 container mx-auto p-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Inventory / Items
          </h2>
          <p className="text-xs text-slate-500">
            Manage your master inventory items, uoms, pricing, and valuation tracking.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href="./items/new">
            <Icon icon="solar:add-circle-linear" width={16} height={16} />
            Create New Item
          </Link>
        </Button>
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center">
        <input
          type="text"
          placeholder="Search by code, barcode, or item description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 bg-transparent p-2 rounded-lg w-full md:w-1/2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* Main Table Grid */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Barcode</th>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-slate-500 animate-pulse"
                  >
                    Querying inventory database, please wait...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-slate-500 font-medium"
                  >
                    No items found matching search parameters.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                      {row.item_code}
                    </td>
                    <td className="p-3 text-slate-500">{row.barcode || "—"}</td>
                    <td className="p-3 font-medium">
                      <Link
                        href={`./items/${row.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {row.category_name || "—"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {row.brand_name || "—"}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.item_type_label || "Inventory"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block capitalize ${
                          row.status_label?.toLowerCase() === "active" || row.status === 1
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {row.status_label || "Active"}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs space-x-2">
                      <Link
                        href={`./items/${row.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        View
                      </Link>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <Link
                        href={`./items/${row.id}/edit`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Edit
                      </Link>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Dynamic Pagination Footer */}
          {!loading && totalRecords > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="text-slate-500 font-medium">
                Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalRecords} total items)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* "use client";

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
} */

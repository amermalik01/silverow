// app/components/inventory/items/ItemList.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getItemCellRenderers } from "./ItemCellRenderers";
import { ItemListing } from "@/lib/services/inventory/Items.service";

type Props = {
  slug: string;
};

export default function ItemList({ slug }: Props) {
  // 1. Cell renderers registry
  const cellRenderers = getItemCellRenderers(slug);

  // 2. Cell dispatcher
  const renderRowCell = (row: ItemListing, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // 3. Data Fetcher
  const fetchItems = async (
    params: FetchParams,
  ): Promise<FetchResponse<ItemListing>> => {
    const res = await fetch("/api/inventory/items/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // 4. Configuration APIs
  const columnsConfigApi = {
    get: async (moduleKey: string): Promise<ColumnConfig[]> => {
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
    save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
      await fetch("/api/table-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, configs }),
      });
    },
    reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
      await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
        method: "POST",
      });
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
  };

  return (
    <div className="space-y-4 ">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Inventory / Items</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage inventory items, categories, brands, and product
            configurations
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/inventory/items/new`}>
            +
            Create
          </Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<ItemListing>
          moduleKey="inventory_items"
          fetchApi={fetchItems}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

/* "use client";

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
    <div className="space-y-6  p-4">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
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
            +
            Create
          </Link>
        </Button>
      </div>


      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center">
        <input
          type="text"
          placeholder="Search by code, barcode, or item description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 bg-transparent p-2 rounded-lg w-full md:w-1/2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />
      </div>


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
                      <Button
                        onClick={() => handleDelete(row.id)}
                        variant="cancel"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

  
          {!loading && totalRecords > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="text-slate-500 font-medium">
                Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalRecords} total items)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Previous
                </Button>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} */

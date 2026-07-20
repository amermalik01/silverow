// app/components/shared/modals/ItemLookupModal.tsx

"use client";

import { useEffect, useState } from "react";

export type ItemLookupRecord = {
  id: string;
  item_code: string;
  barcode?: string;
  name: string;
  description?: string;
  item_type: number;
  standard_cost?: number;
  standard_sales_price?: number;
  purchase_gl_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;
  base_uom_id?: string;
  category_name?: string;
  brand_name?: string;
  item_type_name?: string;
  stock_tracking?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ItemLookupRecord) => void;
};

type ApiResponse = {
  data: ItemLookupRecord[];

  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function ItemLookupModal({ open, onClose, onSelect }: Props) {
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<ItemLookupRecord[]>([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    item_code: "",
    barcode: "",
    name: "",
    item_type: "",
    category: "",
  });

  /**
   * =========================================
   * LOAD ITEMS
   * =========================================
   */

  const loadItems = async (page = pagination.page) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      params.append("page", String(page));

      params.append("limit", String(pagination.limit));

      const res = await fetch(`/api/lookups/items?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load items");
      }

      const json: ApiResponse = await res.json();

      setItems(json.data || []);

      setPagination(json.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================================
   * INITIAL LOAD
   * =========================================
   */

  useEffect(() => {
    if (open) {
      loadItems(1);
    }
  }, [open]);

  /**
   * =========================================
   * PAGE CHANGE
   * =========================================
   */

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) {
      return;
    }

    loadItems(page);
  };

  /**
   * =========================================
   * FORMAT ITEM TYPE
   * =========================================
   */

  const getItemTypeName = (type: number) => {
    switch (type) {
      case 1:
        return "Inventory";

      case 2:
        return "Service";

      case 3:
        return "Non Inventory";

      case 4:
        return "Raw Material";

      case 5:
        return "Finished Goods";

      case 6:
        return "Asset";

      default:
        return "Unknown";
    }
  };

  /**
   * =========================================
   * CLOSE
   * =========================================
   */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white text-black rounded-xl shadow-xl w-[95%] max-w-7xl p-6 max-h-[90vh] overflow-auto">
        {/* HEADER */}

        <div className="flex justify-between items-center mb-6 bg-gray-50">
          <h2 className="text-xl font-semibold text-black">Item Lookup</h2>

          <button
            onClick={onClose}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* FILTERS */}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <input
            placeholder="Search..."
            value={filters.search}
            onChange={(e) =>
              setFilters({
                ...filters,
                search: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            placeholder="Item Code"
            value={filters.item_code}
            onChange={(e) =>
              setFilters({
                ...filters,
                item_code: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            placeholder="Barcode"
            value={filters.barcode}
            onChange={(e) =>
              setFilters({
                ...filters,
                barcode: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            placeholder="Item Name"
            value={filters.name}
            onChange={(e) =>
              setFilters({
                ...filters,
                name: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <select
            value={filters.item_type}
            onChange={(e) =>
              setFilters({
                ...filters,
                item_type: e.target.value,
              })
            }
            className="border rounded p-2"
          >
            <option value="">All Types</option>

            <option value="1">Inventory</option>

            <option value="2">Service</option>

            <option value="3">Non Inventory</option>

            <option value="4">Raw Material</option>

            <option value="5">Finished Goods</option>

            <option value="6">Asset</option>
          </select>

          <input
            placeholder="Category"
            value={filters.category}
            onChange={(e) =>
              setFilters({
                ...filters,
                category: e.target.value,
              })
            }
            className="border rounded p-2"
          />
        </div>

        {/* ACTIONS */}

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => loadItems(1)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>

          <button
            onClick={() => {
              setFilters({
                search: "",
                item_code: "",
                barcode: "",
                name: "",
                item_type: "",
                category: "",
              });

              setTimeout(() => {
                loadItems(1);
              }, 0);
            }}
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}

        <div className="overflow-auto border rounded px-2 pb-10">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Code</th>

                <th className="p-2 text-left">Name</th>

                <th className="p-2 text-left">Barcode</th>

                <th className="p-2 text-left">Type</th>

                <th className="p-2 text-left">Category</th>

                <th className="p-2 text-right">Cost</th>

                <th className="p-2 text-right">Sales Price</th>

                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{item.item_code}</td>

                  <td className="p-2">
                    <div className="font-medium">{item.name}</div>

                    {item.description && (
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    )}
                  </td>

                  <td className="p-2">{item.barcode || "-"}</td>

                  <td className="p-2">
                    {item.item_type_name || getItemTypeName(item.item_type)}
                  </td>

                  <td className="p-2">{item.category_name || "-"}</td>

                  <td className="p-2 text-right">
                    {Number(item.standard_cost || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right">
                    {Number(item.standard_sales_price || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      onClick={() => {
                        onSelect(item);

                        onClose();
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-600">
            Showing page {pagination.page} of {pagination.totalPages}
            {" · "}
            Total: {pagination.total}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <button
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

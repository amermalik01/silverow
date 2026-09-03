// app/components/shared/modals/ItemLookupModal.tsx

// app/components/shared/modals/ItemLookupModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export type ItemLookupRecord = {
  id: string;
  item_code: string;
  barcode?: string;
  name: string;
  description?: string;
  item_type?: number;
  standard_cost?: number;
  standard_sales_price?: number;
  inventory_gl_id?: string;
  purchase_gl_id?: string;
  vat_product_group_id?: string;
  sales_gl_id?: string;
  cogs_gl_id?: string;
  base_uom_id?: string;
  base_uom_name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect?: (item: ItemLookupRecord) => void;
  onSelectMultiple?: (items: ItemLookupRecord[]) => void;
  itemType?: string | number;
  multiple?: boolean;
};

export default function ItemLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  itemType,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemLookupRecord[]>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, ItemLookupRecord>>(new Map());

  // Search terms & debounce
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  // Reset selections when modal re-opens
  useEffect(() => {
    if (open) {
      setSelectedItemsMap(new Map());
      setSearchTerm("");
      setPage(1);
    }
  }, [open]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (itemType !== undefined && itemType !== null && itemType !== "") {
        params.append("item_type", itemType.toString());
      }
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/lookups/items?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load items");
      }

      const json = await res.json();
      setItems(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, itemType, page, limit]);

  // Reset page to 1 on new search term
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debounced term changes
  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, fetchItems]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setPage(1);
  };

  // Selection handlers
  const toggleSelectItem = (item: ItemLookupRecord) => {
    setSelectedItemsMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (newMap.has(item.id)) {
        newMap.delete(item.id);
      } else {
        newMap.set(item.id, item);
      }
      return newMap;
    });
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selectedItemsMap.has(item.id));
  }, [items, selectedItemsMap]);

  const toggleSelectAllCurrentPage = () => {
    setSelectedItemsMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (isAllCurrentPageSelected) {
        items.forEach((item) => newMap.delete(item.id));
      } else {
        items.forEach((item) => newMap.set(item.id, item));
      }
      return newMap;
    });
  };

  const handleConfirmMultiSelect = () => {
    const selectedList = Array.from(selectedItemsMap.values());
    if (onSelectMultiple) {
      onSelectMultiple(selectedList);
    }
    onClose();
  };

  const handleSingleSelect = (item: ItemLookupRecord) => {
    if (onSelect) {
      onSelect(item);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:box" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Item{multiple ? "s" : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* SEARCH BAR & SUMMARY */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Type to search code, barcode, item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <span className="flex items-center gap-1 text-xs text-[#103701] dark:text-slate-300">
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
                />
                Searching...
              </span>
            )}
            {multiple && selectedItemsMap.size > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#103701]/10 text-[#103701] dark:bg-slate-800 dark:text-slate-200 font-medium border border-[#103701]/20 dark:border-slate-700">
                {selectedItemsMap.size} item(s) selected
              </span>
            )}
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                {multiple && (
                  <th className="p-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      className="rounded border-slate-300 text-[#103701] focus:ring-[#103701] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-2.5 text-left font-semibold">Item Code</th>
                <th className="p-2.5 text-left font-semibold">Barcode</th>
                <th className="p-2.5 text-left font-semibold">Item Name</th>
                <th className="p-2.5 text-left font-semibold">Base UOM</th>
                <th className="p-2.5 text-right font-semibold">Std Cost</th>
                <th className="p-2.5 text-right font-semibold">Sales Price</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="text-center py-12 text-slate-500"
                  >
                    No items found matching your query
                  </td>
                </tr>
              )}

              {loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="text-center py-12 text-slate-500"
                  >
                    Loading items...
                  </td>
                </tr>
              )}

              {items.map((item) => {
                const isSelected = selectedItemsMap.has(item.id);

                return (
                  <tr
                    key={item.id}
                    onClick={() => multiple && toggleSelectItem(item)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#103701]/5 dark:bg-slate-800/80"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {multiple && (
                      <td
                        className="p-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item)}
                          className="rounded border-slate-300 text-[#103701] focus:ring-[#103701] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {item.item_code}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {item.barcode || "—"}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {item.base_uom_name || "—"}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                      {item.standard_cost !== undefined &&
                      item.standard_cost !== null
                        ? Number(item.standard_cost).toFixed(2)
                        : "—"}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                      {item.standard_sales_price !== undefined &&
                      item.standard_sales_price !== null
                        ? Number(item.standard_sales_price).toFixed(2)
                        : "—"}
                    </td>
                    <td
                      className="p-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        onClick={() => handleSingleSelect(item)}
                        className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
            items
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-12 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-left" className="text-base" />
              </Button>
              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                disabled={page >= pagination.totalPages || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-right" className="text-base" />
              </Button>
            </div>

            {multiple && (
              <Button
                disabled={selectedItemsMap.size === 0}
                onClick={handleConfirmMultiSelect}
                className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-8 px-4 text-xs rounded transition disabled:opacity-50"
              >
                Add Selected ({selectedItemsMap.size})
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  vat_product_group_id?: string;
  sales_gl_id?: string;
  inventory_gl_id?: string;
  base_uom_id?: string;
  base_uom_name?: string;
  category_name?: string;
  brand_name?: string;
  item_type_name?: string;
  stock_tracking?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ItemLookupRecord) => void;
  onSelectMultiple?: (items: ItemLookupRecord[]) => void;
  multiple?: boolean;
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

const initialFilterState = {
  search: "",
  item_code: "",
  barcode: "",
  name: "",
  item_type: "",
};

export default function ItemLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemLookupRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<ItemLookupRecord[]>(
    [],
  );

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  const [filters, setFilters] = useState(initialFilterState);

  // Core Data Fetcher
  const loadItems = useCallback(
    async (pageToLoad = 1, currentFilters = filters) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });

        params.append("page", String(pageToLoad));
        params.append("limit", String(pagination.limit));

        const res = await fetch(`/api/lookups/items?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load items");

        const json: ApiResponse = await res.json();
        setItems(json.data || []);
        setPagination(
          json.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
        );
      } catch (err) {
        console.error("Error fetching items:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    if (open) {
      setFilters(initialFilterState);
      setSelectedRecords([]);
      loadItems(1, initialFilterState);
    }
  }, [open]);

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadItems(newPage, filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilterState);
    loadItems(1, initialFilterState);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadItems(1, filters);
    }
  };

  const getItemTypeName = (type: number) => {
    switch (type) {
      case 1:
        return "Inventory";
      case 2:
        return "Service";
      case 3:
        return "Non-Inventory";
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

  const handleToggleRow = (item: ItemLookupRecord) => {
    if (selectedRecords.some((i) => i.id === item.id)) {
      setSelectedRecords((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setSelectedRecords((prev) => [...prev, item]);
    }
  };

  const handleSelectAllOnPage = () => {
    const allSelected = items.every((i) =>
      selectedRecords.some((r) => r.id === i.id),
    );
    if (allSelected) {
      setSelectedRecords((prev) =>
        prev.filter((r) => !items.some((i) => i.id === r.id)),
      );
    } else {
      setSelectedRecords((prev) => {
        const uniqueNew = items.filter((i) => !prev.some((r) => r.id === i.id));
        return [...prev, ...uniqueNew];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selectedRecords);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Select Item(s)
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Look up items, services, or raw materials in system inventory
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          onKeyDown={handleKeyDown}
          className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5"
        >
          <input
            placeholder="Search keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <input
            placeholder="Item Code"
            value={filters.item_code}
            onChange={(e) =>
              setFilters({ ...filters, item_code: e.target.value })
            }
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <input
            placeholder="Barcode"
            value={filters.barcode}
            onChange={(e) =>
              setFilters({ ...filters, barcode: e.target.value })
            }
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <input
            placeholder="Item Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <select
            value={filters.item_type}
            onChange={(e) =>
              setFilters({ ...filters, item_type: e.target.value })
            }
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="1">Inventory</option>
            <option value="2">Service</option>
            <option value="3">Non Inventory</option>
            <option value="4">Raw Material</option>
            <option value="5">Finished Goods</option>
            <option value="6">Asset</option>
          </select>

          <div className="flex gap-1.5">
            <Button
              onClick={() => loadItems(1, filters)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
            <Button
              onClick={handleResetFilters}
              className="px-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition flex items-center justify-center bg-white cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10 backdrop-blur-xs">
              <tr>
                {multiple && (
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        items.length > 0 &&
                        items.every((i) =>
                          selectedRecords.some((r) => r.id === i.id),
                        )
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-32">Item Code</th>
                <th className="p-3">Name & Description</th>
                <th className="p-3 w-28">Barcode</th>
                <th className="p-3 w-28">Type</th>
                <th className="p-3 text-right w-24">Cost</th>
                <th className="p-3 text-right w-28">Sales Price</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="p-10 text-center font-normal text-slate-400 italic"
                  >
                    Loading items catalog...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="p-10 text-center font-normal text-slate-400 italic"
                  >
                    No matching items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isChecked = selectedRecords.some(
                    (r) => r.id === item.id,
                  );
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (multiple) {
                          handleToggleRow(item);
                        } else {
                          onSelect(item);
                          onClose();
                        }
                      }}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        isChecked
                          ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                          : ""
                      }`}
                    >
                      {multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(item)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {item.item_code}
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-medium text-slate-800">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {item.barcode || "-"}
                      </td>
                      <td className="p-3 font-sans">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                          {item.item_type_name ||
                            getItemTypeName(item.item_type)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {Number(item.standard_cost || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-slate-900">
                        {Number(item.standard_sales_price || 0).toFixed(2)}
                      </td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => {
                              onSelect(item);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition cursor-pointer"
                          >
                            Select
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium">
            {multiple && (
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded mr-2">
                {selectedRecords.length} Selected
              </span>
            )}
            Showing{" "}
            {items.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} Records
          </div>

          <div className="flex items-center gap-3">
            {multiple && (
              <div className="flex gap-1.5 border-r pr-3 border-slate-200">
                <Button
                  onClick={handleSubmitBatch}
                  disabled={selectedRecords.length === 0}
                  variant="save"
                  // className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Add Selected
                </Button>
                <Button
                  onClick={onClose}
                  variant="cancel"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="flex gap-1">
              <Button
                onClick={() => changePage(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded-lg text-xs disabled:opacity-40 transition cursor-pointer"
              >
                ‹ Prev
              </Button>
              <div className="border border-slate-200 bg-white font-mono px-3 py-1 rounded-lg text-xs text-slate-700 flex items-center font-bold">
                {pagination.page} / {pagination.totalPages || 1}
              </div>
              <Button
                onClick={() => changePage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded-lg text-xs disabled:opacity-40 transition cursor-pointer"
              >
                Next ›
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} */

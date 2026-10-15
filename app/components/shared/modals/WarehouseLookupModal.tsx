// app/components/shared/modals/WarehouseLookupModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export type WarehouseLookupRecord = {
  id: string;
  code: string;
  name: string;
  type?: string;
  status?: number;
  primary_location_name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect?: (warehouse: WarehouseLookupRecord) => void;
  onSelectMultiple?: (warehouses: WarehouseLookupRecord[]) => void;
  type?: string;
  multiple?: boolean;
};

export default function WarehouseLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  type,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseLookupRecord[]>([]);
  const [selectedWarehousesMap, setSelectedWarehousesMap] = useState<Map<string, WarehouseLookupRecord>>(new Map());

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
      setSelectedWarehousesMap(new Map());
      setSearchTerm("");
      setPage(1);
    }
  }, [open]);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (type) params.append("type", type);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/lookups/warehouses?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load warehouses");
      }

      const json = await res.json();
      setWarehouses(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, page, limit]);

  // Reset page to 1 on new search term
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debounced term changes
  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open, fetchWarehouses]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setPage(1);
  };

  // Selection handlers
  const toggleSelectWarehouse = (warehouse: WarehouseLookupRecord) => {
    setSelectedWarehousesMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (newMap.has(warehouse.id)) {
        newMap.delete(warehouse.id);
      } else {
        newMap.set(warehouse.id, warehouse);
      }
      return newMap;
    });
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (warehouses.length === 0) return false;
    return warehouses.every((wh) => selectedWarehousesMap.has(wh.id));
  }, [warehouses, selectedWarehousesMap]);

  const toggleSelectAllCurrentPage = () => {
    setSelectedWarehousesMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (isAllCurrentPageSelected) {
        warehouses.forEach((wh) => newMap.delete(wh.id));
      } else {
        warehouses.forEach((wh) => newMap.set(wh.id, wh));
      }
      return newMap;
    });
  };

  const handleConfirmMultiSelect = () => {
    const selectedList = Array.from(selectedWarehousesMap.values());
    if (selectedList.length === 0) return;

    if (onSelectMultiple) {
      onSelectMultiple(selectedList);
    }
    onClose();
  };

  const handleSelectWarehouse = (warehouse: WarehouseLookupRecord) => {
    if (onSelect) {
      onSelect(warehouse);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-warehouse" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Warehouse{multiple ? "s" : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Type to search code, warehouse name, location..."
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
                <Icon icon="tabler:loader-2" className="animate-spin text-base" /> Searching...
              </span>
            )}
            {multiple && selectedWarehousesMap.size > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#103701]/10 text-[#103701] dark:bg-slate-800 dark:text-slate-200 font-medium border border-[#103701]/20 dark:border-slate-700">
                {selectedWarehousesMap.size} warehouse(s) selected
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
                <th className="p-2.5 text-left font-semibold">Warehouse Code</th>
                <th className="p-2.5 text-left font-semibold">Warehouse Name</th>
                <th className="p-2.5 text-left font-semibold">Type</th>
                <th className="p-2.5 text-left font-semibold">Primary Location</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={multiple ? 6 : 5} className="text-center py-12 text-slate-500">
                    No warehouses found matching your query
                  </td>
                </tr>
              )}

              {loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={multiple ? 6 : 5} className="text-center py-12 text-slate-500">
                    Loading warehouses...
                  </td>
                </tr>
              )}

              {warehouses.map((wh) => {
                const isSelected = selectedWarehousesMap.has(wh.id);

                return (
                  <tr
                    key={wh.id}
                    onClick={() => multiple && toggleSelectWarehouse(wh)}
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
                          onChange={() => toggleSelectWarehouse(wh)}
                          className="rounded border-slate-300 text-[#103701] focus:ring-[#103701] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {wh.code}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {wh.name}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 capitalize">
                      {wh.type || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {wh.primary_location_name || "—"}
                    </td>
                    <td
                      className="p-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        onClick={() => handleSelectWarehouse(wh)}
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
            Showing {warehouses.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total} warehouses
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
                disabled={selectedWarehousesMap.size === 0}
                onClick={handleConfirmMultiSelect}
                className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-8 px-4 text-xs rounded transition disabled:opacity-50"
              >
                Add Selected ({selectedWarehousesMap.size})
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* "use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export type WarehouseLookupRecord = {
  id: string;
  code: string;
  name: string;
  type?: string;
  status?: number;
  primary_location_name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (warehouse: WarehouseLookupRecord) => void;
  type?: string;
};

export default function WarehouseLookupModal({
  open,
  onClose,
  onSelect,
  type,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseLookupRecord[]>([]);

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

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (type) params.append("type", type);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/lookups/warehouses?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load warehouses");
      }

      const json = await res.json();
      setWarehouses(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, page, limit]);

  // Reset page to 1 on new search term
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debounced term changes
  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open, fetchWarehouses]);

  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        

        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-warehouse" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Warehouse
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>


        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Type to search code, warehouse name, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {loading && (
              <span className="flex items-center gap-1 text-[#103701] dark:text-slate-300">
                <Icon icon="tabler:loader-2" className="animate-spin text-base" /> Searching...
              </span>
            )}
          </div>
        </div>


        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="p-2.5 text-left font-semibold">Warehouse Code</th>
                <th className="p-2.5 text-left font-semibold">Warehouse Name</th>
                <th className="p-2.5 text-left font-semibold">Type</th>
                <th className="p-2.5 text-left font-semibold">Primary Location</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No warehouses found matching your query
                  </td>
                </tr>
              )}

              {loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    Loading warehouses...
                  </td>
                </tr>
              )}

              {warehouses.map((wh) => (
                <tr
                  key={wh.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {wh.code}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {wh.name}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400 capitalize">
                    {wh.type || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {wh.primary_location_name || "—"}
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      onClick={() => {
                        onSelect(wh);
                        onClose();
                      }}
                      className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {warehouses.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total} warehouses
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
          </div>
        </div>

      </div>
    </div>
  );
} */

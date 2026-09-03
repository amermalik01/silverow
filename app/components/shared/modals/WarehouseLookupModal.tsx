// app/components/shared/modals/WarehouseLookupModal.tsx

"use client";

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
        
        {/* HEADER */}
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

        {/* TABLE DATA */}
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
          </div>
        </div>

      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type WarehouseLookupRecord = {
  id: string;
  code: string;
  name: string;
  type: string;

  primary_location_name?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Props = {
  open: boolean;

  onClose: () => void;

  onSelect: (warehouse: WarehouseLookupRecord) => void;
};

const DEFAULT_FILTERS = {
  search: "",
  code: "",
  name: "",
  type: "",
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export default function WarehouseLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseLookupRecord[]>([]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);

  const fetchWarehouses = useCallback(
    async (
      targetPage = 1,
      currentLimit = pagination.limit,
      currentFilters = filters,
    ) => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (currentFilters.search) {
          params.append("search", currentFilters.search);
        }

        if (currentFilters.code) {
          params.append("code", currentFilters.code);
        }

        if (currentFilters.name) {
          params.append("name", currentFilters.name);
        }

        if (currentFilters.type) {
          params.append("type", currentFilters.type);
        }

        params.append("page", targetPage.toString());
        params.append("limit", currentLimit.toString());

        const res = await fetch(`/api/lookups/warehouses?${params.toString()}`);

        if (!res.ok) {
          throw new Error("Failed to load warehouses");
        }

        const json = await res.json();

        setWarehouses(json.data || []);

        if (json.pagination) {
          setPagination(json.pagination);
        } else {
          setPagination({
            ...DEFAULT_PAGINATION,
            page: targetPage,
            limit: currentLimit,
          });
        }
      } catch (err) {
        console.error("Failed to load warehouses:", err);
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    if (open) {
      fetchWarehouses(1);
    }
  }, [open]);

  const handleSearch = () => {
    fetchWarehouses(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setWarehouses([]);

    setPagination({
      ...DEFAULT_PAGINATION,
      limit: pagination.limit,
    });

    fetchWarehouses(1, pagination.limit, DEFAULT_FILTERS);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && !loading) {
      fetchWarehouses(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      limit: newLimit,
    }));

    fetchWarehouses(1, newLimit);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Select Warehouse
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-md hover:bg-slate-200/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            placeholder="Search"
            value={filters.search}
            onChange={(e) =>
              setFilters({
                ...filters,
                search: e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />

          <input
            placeholder="Warehouse Code"
            value={filters.code}
            onChange={(e) =>
              setFilters({
                ...filters,
                code: e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />

          <input
            placeholder="Warehouse Name"
            value={filters.name}
            onChange={(e) =>
              setFilters({
                ...filters,
                name: e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />

          <select
            value={filters.type}
            onChange={(e) =>
              setFilters({
                ...filters,
                type: e.target.value,
              })
            }
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          >
            <option value="">All Types</option>
            <option value="STORE">Store</option>
            <option value="DISTRIBUTION">Distribution</option>
            <option value="TRANSIT">Transit</option>
            <option value="CONSIGNMENT">Consignment</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 px-4 py-2 bg-slate-100/60 border-b border-slate-200">
          <Button
            onClick={handleSearch}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-1.5 rounded flex items-center gap-1 shadow-sm transition"
          >
            <Search className="h-3 w-3" />
            Search
          </Button>

          <Button
            onClick={handleReset}
            className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-2">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="p-3 w-32">Code</th>
                <th className="p-3">Warehouse Name</th>
                <th className="p-3 w-36">Type</th>
                <th className="p-3 w-48">Primary Location</th>
                <th className="p-3 text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Retrieving warehouse registries...
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No warehouses match defined filter constraints.
                  </td>
                </tr>
              ) : (
                warehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="p-3 font-bold text-slate-900 tracking-tight">
                      {warehouse.code || "—"}
                    </td>
                    <td className="p-3 font-sans font-medium text-slate-800">
                      {warehouse.name || "—"}
                    </td>
                    <td className="p-3">{warehouse.type || "—"}</td>
                    <td className="p-3 font-sans font-normal">
                      {warehouse.primary_location_name || "—"}
                    </td>
                    <td
                      className="p-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        onClick={() => {
                          onSelect(warehouse);
                          onClose();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition"
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium text-[11px]">
            Showing{" "}
            {warehouses.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of{" "}
            <span className="font-bold text-slate-800">{pagination.total}</span>{" "}
            entries
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span>Show</span>

              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>

              <span className="px-2 text-[11px] font-bold text-slate-700">
                {pagination.page} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 */
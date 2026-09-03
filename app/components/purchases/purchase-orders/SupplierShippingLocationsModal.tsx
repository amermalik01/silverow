// app/components/purchases/purchase-orders/SupplierShippingLocationsModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export type SupplierShippingLocationItem = {
  id: string;
  location_code?: string;
  name: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
  is_shipping?: boolean;
  is_billing?: boolean;
};

type Props = {
  open: boolean;
  supplierId?: string | null;
  onClose: () => void;
  onSelect: (location: SupplierShippingLocationItem) => void;
};

export default function SupplierShippingLocationsModal({
  open,
  supplierId,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<SupplierShippingLocationItem[]>(
    [],
  );

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

  const fetchLocations = useCallback(async () => {
    if (!supplierId) return;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(
        `/api/purchase-orders/suppliers/${supplierId}/locations?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load supplier shipping locations");
      }

      const json = await res.json();
      setLocations(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supplierId, debouncedSearch, page, limit]);

  // Reset page to 1 on new search term or supplier change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, supplierId]);

  // Re-fetch when open, supplierId, page, limit, or debounced term changes
  useEffect(() => {
    if (open && supplierId) {
      fetchLocations();
    }
  }, [open, supplierId, fetchLocations]);

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
            <Icon icon="tabler:map-pin" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Supplier Shipping Location
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
              placeholder="Type to search code, address, city, postcode..."
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
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
                />{" "}
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="p-2.5 text-left font-semibold">
                  Location / Label
                </th>
                <th className="p-2.5 text-left font-semibold">
                  Address Line 1
                </th>
                <th className="p-2.5 text-left font-semibold">
                  Address Line 2
                </th>
                <th className="p-2.5 text-left font-semibold">City</th>
                <th className="p-2.5 text-left font-semibold">County</th>
                <th className="p-2.5 text-left font-semibold">Postcode</th>
                <th className="p-2.5 text-left font-semibold">Country</th>
                <th className="p-2.5 text-center font-semibold">Type</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && locations.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No locations found matching your query
                  </td>
                </tr>
              )}

              {loading && locations.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    Loading shipping locations...
                  </td>
                </tr>
              )}

              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {loc.location_code || loc.name}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.address_1 || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.address_2 || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.city || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.county || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.postcode || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {loc.country || "—"}
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {loc.is_primary && (
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          Primary
                        </span>
                      )}
                      {loc.is_shipping && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          Shipping
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      onClick={() => {
                        onSelect(loc);
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
            Showing {locations.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
            locations
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
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1  w-12 text-xs focus:outline-none"
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

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export type SupplierLocationItem = {
  id: string;
  location_code?: string;
  name: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
};

type Props = {
  open: boolean;
  supplierId?: string;
  onClose: () => void;
  onSelect: (location: SupplierLocationItem) => void;
};

export default function SupplierShippingLocationsModal({
  open,
  supplierId,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<SupplierLocationItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && supplierId) {
      fetchLocations();
    }
  }, [open, supplierId]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/purchase-orders/suppliers/${supplierId}/locations`,
      );

      if (!res.ok) {
        throw new Error("Failed to load supplier locations");
      }

      const json = await res.json();
      setLocations(json.data || []);
    } catch (err) {
      console.error(err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name?.toLowerCase().includes(search.toLowerCase()) ||
      loc.location_code?.toLowerCase().includes(search.toLowerCase()) ||
      loc.city?.toLowerCase().includes(search.toLowerCase()) ||
      loc.postcode?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-auto p-6">
      <div className="bg-white dark:bg-slate-900 text-black dark:text-white rounded-xl shadow-xl w-full max-w-4xl p-4">

        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">Select Shipping Location</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg font-bold"
          >
            ✕
          </button>
        </div>


        <div className="py-3 border-b">
          <input
            type="text"
            placeholder="Search location code, name, city, or postcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-xs dark:bg-slate-800 dark:border-slate-700"
          />
        </div>


        <div className="overflow-auto max-h-[450px] my-2">
          <table className="w-full text-xs table-fixed border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 border-b">
              <tr>
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Location Name</th>
                <th className="border p-2 text-left">Address</th>
                <th className="border p-2 text-left">City</th>
                <th className="border p-2 text-left">Postcode</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredLocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    {!supplierId
                      ? "Please select a supplier first"
                      : "No additional shipping locations found"}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    Loading locations...
                  </td>
                </tr>
              )}

              {filteredLocations.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <td className="border p-2 font-mono font-medium">
                    {loc.location_code || "—"}
                  </td>
                  <td className="border p-2 font-medium">{loc.name}</td>
                  <td className="border p-2 text-gray-600 dark:text-gray-300">
                    {[loc.address_1, loc.address_2]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="border p-2">{loc.city || "—"}</td>
                  <td className="border p-2">{loc.postcode || "—"}</td>
                  <td className="border p-2 text-center">
                    <Button
                      onClick={() => {
                        onSelect(loc);
                        onClose();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition text-xs"
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
 */

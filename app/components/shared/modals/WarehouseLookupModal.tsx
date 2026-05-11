// app/components/shared/modals/WarehouseLookupModal.tsx
// app/components/shared/modals/WarehouseLookupModal.tsx

"use client";

import { useEffect, useState } from "react";

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

export default function WarehouseLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  /**
   * =========================================================
   * STATES
   * =========================================================
   */

  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState<
    WarehouseLookupRecord[]
  >([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  /**
   * =========================================================
   * FILTERS
   * =========================================================
   */

  const [filters, setFilters] = useState({
    search: "",
    code: "",
    name: "",
    type: "",
  });

  /**
   * =========================================================
   * LOAD
   * =========================================================
   */

  const loadWarehouses = async (
    pageNumber = pagination.page,
  ) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      /**
       * PAGINATION
       */

      params.append(
        "page",
        String(pageNumber),
      );

      params.append(
        "limit",
        String(pagination.limit),
      );

      /**
       * FILTERS
       */

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (value) {
            params.append(key, value);
          }
        },
      );

      const res = await fetch(
        `/api/lookups/warehouses?${params.toString()}`,
      );

      const json = await res.json();

      setWarehouses(json.data || []);

      setPagination(
        json.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================================================
   * EFFECT
   * =========================================================
   */

  useEffect(() => {
    if (open) {
      loadWarehouses(1);
    }
  }, [open]);

  /**
   * =========================================================
   * CLOSE
   * =========================================================
   */

  if (!open) return null;

  /**
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white text-black rounded-xl shadow-xl w-[95%] max-w-6xl p-6 max-h-[90vh] overflow-auto">
        {/* HEADER */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black bg-gray-50">
            Warehouse Lookup
          </h2>

          <button
            onClick={onClose}
            className="border px-3 py-1 rounded"
          >
            Close
          </button>
        </div>

        {/* FILTERS */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            placeholder="Search"
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
            placeholder="Code"
            value={filters.code}
            onChange={(e) =>
              setFilters({
                ...filters,
                code: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            placeholder="Name"
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
            value={filters.type}
            onChange={(e) =>
              setFilters({
                ...filters,
                type: e.target.value,
              })
            }
            className="border rounded p-2"
          >
            <option value="">
              All Types
            </option>

            <option value="STORE">
              Store
            </option>

            <option value="DISTRIBUTION">
              Distribution
            </option>

            <option value="TRANSIT">
              Transit
            </option>

            <option value="CONSIGNMENT">
              Consignment
            </option>
          </select>
        </div>

        {/* ACTIONS */}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => loadWarehouses(1)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search
          </button>

          <button
            onClick={() => {
              setFilters({
                search: "",
                code: "",
                name: "",
                type: "",
              });

              setTimeout(() => {
                loadWarehouses(1);
              }, 0);
            }}
            className="border px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}

        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">
                  Code
                </th>

                <th className="p-2 text-left">
                  Name
                </th>

                <th className="p-2 text-left">
                  Type
                </th>

                <th className="p-2 text-left">
                  Primary Location
                </th>

                <th className="p-2 text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center"
                  >
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                warehouses.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center"
                    >
                      No warehouses found
                    </td>
                  </tr>
                )}

              {!loading &&
                warehouses.map((wh) => (
                  <tr
                    key={wh.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-2 font-medium">
                      {wh.code}
                    </td>

                    <td className="p-2">
                      {wh.name}
                    </td>

                    <td className="p-2">
                      {wh.type}
                    </td>

                    <td className="p-2">
                      {wh.primary_location_name ||
                        "-"}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          onSelect(wh);

                          onClose();
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
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
          <div className="text-sm text-gray-600">
            Total: {pagination.total}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() =>
                loadWarehouses(
                  pagination.page - 1,
                )
              }
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm">
              Page {pagination.page} of{" "}
              {pagination.totalPages}
            </span>

            <button
              disabled={
                pagination.page >=
                pagination.totalPages
              }
              onClick={() =>
                loadWarehouses(
                  pagination.page + 1,
                )
              }
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

/* "use client";

import { useEffect, useState } from "react";

export type WarehouseLookupRecord = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type Props = {
  open: boolean;

  onClose: () => void;

  onSelect: (warehouse: WarehouseLookupRecord) => void;
};

export default function WarehouseLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseLookupRecord[]>([]);

  const [filters, setFilters] = useState({
    search: "",
    code: "",
    name: "",
  });

  const loadWarehouses = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });

      const res = await fetch(`/api/lookups/warehouses?${params.toString()}`);

      const json = await res.json();

      setWarehouses(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadWarehouses();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[95%] max-w-5xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Warehouse Lookup</h2>

          <button onClick={onClose} className="border px-3 py-1 rounded">
            Close
          </button>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            placeholder="Search"
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
            placeholder="Code"
            value={filters.code}
            onChange={(e) =>
              setFilters({
                ...filters,
                code: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            placeholder="Name"
            value={filters.name}
            onChange={(e) =>
              setFilters({
                ...filters,
                name: e.target.value,
              })
            }
            className="border rounded p-2"
          />
        </div>

        <div className="mb-4">
          <button
            onClick={loadWarehouses}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search
          </button>
        </div>



        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Code</th>

                <th className="p-2 text-left">Name</th>

                <th className="p-2 text-left">Type</th>

                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center">
                    No warehouses found
                  </td>
                </tr>
              )}

              {warehouses.map((wh) => (
                <tr key={wh.id} className="border-t">
                  <td className="p-2">{wh.code}</td>

                  <td className="p-2">{wh.name}</td>

                  <td className="p-2">{wh.type}</td>

                  <td className="p-2 text-center">
                    <button
                      onClick={() => {
                        onSelect(wh);
                        onClose();
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Select
                    </button>
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
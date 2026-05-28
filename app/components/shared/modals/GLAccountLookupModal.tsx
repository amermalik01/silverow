// app/components/shared/modals/GLAccountLookupModal.tsx

"use client";

import { useEffect, useState } from "react";

export type GLAccountLookupRecord = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_name?: string | null;
};

type Props = {
  open: boolean;

  onClose: () => void;

  onSelect: (account: GLAccountLookupRecord) => void;
};

type ApiResponse = {
  data: GLAccountLookupRecord[];

  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function GLAccountLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<GLAccountLookupRecord[]>([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    code: "",
    name: "",
    account_type: "",
  });

  /**
   * =========================================
   * LOAD
   * =========================================
   */

  const loadAccounts = async (page = pagination.page) => {
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

      const res = await fetch(`/api/lookups/gl-accounts?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load accounts");
      }

      const json: ApiResponse = await res.json();

      setAccounts(json.data || []);

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
      loadAccounts(1);
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

    loadAccounts(page);
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
          <h2 className="text-xl font-semibold text-black">G/L Account Lookup</h2>

          <button
            onClick={onClose}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* FILTERS */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
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

          <input
            placeholder="Account Type"
            value={filters.account_type}
            onChange={(e) =>
              setFilters({
                ...filters,
                account_type: e.target.value,
              })
            }
            className="border rounded p-2"
          />
        </div>

        {/* ACTIONS */}

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => loadAccounts(1)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>

          <button
            onClick={() => {
              setFilters({
                search: "",
                code: "",
                name: "",
                account_type: "",
              });

              setTimeout(() => {
                loadAccounts(1);
              }, 0);
            }}
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}

        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Code</th>

                <th className="p-2 text-left">Name</th>

                <th className="p-2 text-left">Account Type</th>

                <th className="p-2 text-left">Parent</th>

                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No accounts found
                  </td>
                </tr>
              )}

              {accounts.map((acc) => (
                <tr key={acc.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{acc.code}</td>

                  <td className="p-2">{acc.name}</td>

                  <td className="p-2">{acc.account_type}</td>

                  <td className="p-2">{acc.parent_name || "-"}</td>

                  <td className="p-2 text-center">
                    <button
                      onClick={() => {
                        onSelect(acc);

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
          <div className="text-sm text-gray-600">
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

/* "use client";

import { useEffect, useState } from "react";

export type GLAccountLookupRecord = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};

type Props = {
  open: boolean;

  onClose: () => void;

  onSelect: (
    account: GLAccountLookupRecord,
  ) => void;
};

export default function GLAccountLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<
    GLAccountLookupRecord[]
  >([]);

  const [filters, setFilters] = useState({
    search: "",
    code: "",
    name: "",
    account_type: "",
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });

      const res = await fetch(
        `/api/lookups/gl-accounts?${params.toString()}`,
      );

      const json = await res.json();

      setAccounts(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[95%] max-w-6xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            G/L Account Lookup
          </h2>

          <button
            onClick={onClose}
            className="border px-3 py-1 rounded"
          >
            Close
          </button>
        </div>



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

          <input
            placeholder="Type"
            value={filters.account_type}
            onChange={(e) =>
              setFilters({
                ...filters,
                account_type:
                  e.target.value,
              })
            }
            className="border rounded p-2"
          />
        </div>

        <div className="mb-4">
          <button
            onClick={loadAccounts}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search
          </button>
        </div>



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

                <th className="p-2 text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                accounts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center"
                    >
                      No accounts found
                    </td>
                  </tr>
                )}

              {accounts.map((acc) => (
                <tr
                  key={acc.id}
                  className="border-t"
                >
                  <td className="p-2">
                    {acc.code}
                  </td>

                  <td className="p-2">
                    {acc.name}
                  </td>

                  <td className="p-2">
                    {acc.account_type}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      onClick={() => {
                        onSelect(acc);
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
} */

// app/components/shared/modals/GLAccountLookupModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Check, Search, RotateCcw } from "lucide-react";

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
  // Overloaded to support returning single elements or arrays depending on structural scope
  onSelect: (account: GLAccountLookupRecord) => void;
  onSelectMultiple?: (accounts: GLAccountLookupRecord[]) => void;
  multiple?: boolean;
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
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<GLAccountLookupRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<
    GLAccountLookupRecord[]
  >([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50, // Matches the legacy system pagination limit shown in the screenshot
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    code: "",
    name: "",
    account_type: "",
  });

  const loadAccounts = async (page = pagination.page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      params.append("page", String(page));
      params.append("limit", String(pagination.limit));

      const res = await fetch(`/api/lookups/gl-accounts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load accounts");

      const json: ApiResponse = await res.json();
      setAccounts(json.data || []);
      setPagination(json.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAccounts(1);
      setSelectedRecords([]); // Reset local buffer on opening
    }
  }, [open]);

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    loadAccounts(page);
  };

  const handleToggleRow = (acc: GLAccountLookupRecord) => {
    if (selectedRecords.some((item) => item.id === acc.id)) {
      setSelectedRecords((prev) => prev.filter((item) => item.id !== acc.id));
    } else {
      setSelectedRecords((prev) => [...prev, acc]);
    }
  };

  const handleSelectAllOnPage = () => {
    const allSelected = accounts.every((acc) =>
      selectedRecords.some((r) => r.id === acc.id),
    );
    if (allSelected) {
      // De-select all items currently visible on this specific page
      setSelectedRecords((prev) =>
        prev.filter((r) => !accounts.some((acc) => acc.id === r.id)),
      );
    } else {
      // Select all items currently visible on this page safely
      setSelectedRecords((prev) => {
        const uniqueNew = accounts.filter(
          (acc) => !prev.some((r) => r.id === acc.id),
        );
        // ADDED THE SPREAD OPERATOR (...) HERE TO FLATTEN THE ARRAY
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Block Row */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Select G/L No.(s)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-sans text-sm font-medium transition"
          >
            ✕
          </button>
        </div>

        {/* Filter Input Control Board Panels */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            placeholder="Global search keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-slate-200 rounded px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="Filter by G/L No..."
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
            className="border border-slate-200 rounded px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="Filter by Account Name..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border border-slate-200 rounded px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <div className="flex gap-1.5">
            <button
              onClick={() => loadAccounts(1)}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1 shadow-sm"
            >
              <Search className="h-3 w-3" /> Search
            </button>
            <button
              onClick={() => {
                setFilters({
                  search: "",
                  code: "",
                  name: "",
                  account_type: "",
                });
                setTimeout(() => loadAccounts(1), 0);
              }}
              className="px-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded transition flex items-center justify-center"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Core Matrix Ledger Sheet Row */}
        <div className="flex-1 overflow-auto px-2 pb-10">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {multiple && (
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        accounts.length > 0 &&
                        accounts.every((acc) =>
                          selectedRecords.some((r) => r.id === acc.id),
                        )
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-32">G/L No.</th>
                <th className="p-3">Name</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 4 : 3}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Querying balance metrics lines...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 4 : 3}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No active charts discovered inside general ledger context.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isChecked = selectedRecords.some(
                    (item) => item.id === acc.id,
                  );
                  return (
                    <tr
                      key={acc.id}
                      onClick={() => multiple && handleToggleRow(acc)}
                      className={`hover:bg-slate-50 border-b border-slate-100 transition cursor-pointer ${isChecked ? "bg-emerald-50/40 hover:bg-emerald-50/70" : ""}`}
                    >
                      {multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(acc)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-bold text-slate-900 tracking-tight">
                        {acc.code}
                      </td>
                      <td className="p-3 font-sans text-slate-700 font-normal">
                        {acc.name}
                      </td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onSelect(acc);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold rounded shadow-sm transition"
                          >
                            Select
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Dual Footer Controls block matching legacy lookups */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium font-sans">
            {multiple && (
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mr-2">
                {selectedRecords.length} Selected
              </span>
            )}
            Showing{" "}
            {accounts.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} Records
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Multi-Batch execution actions */}
            {multiple && (
              <div className="flex gap-1.5 border-r pr-3 border-slate-200">
                <button
                  onClick={handleSubmitBatch}
                  disabled={selectedRecords.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Selection
                </button>
                <button
                  onClick={onClose}
                  className="border border-slate-200 bg-white hover:bg-slate-50 font-medium text-xs px-3 py-1.5 rounded transition"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex gap-1">
              <button
                onClick={() => changePage(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded text-xs disabled:opacity-40 transition"
              >
                ‹ Prev
              </button>
              <div className="border border-slate-200 bg-white font-mono px-3 py-1 rounded text-xs text-slate-700 flex items-center font-bold">
                {pagination.page} / {pagination.totalPages}
              </div>
              <button
                onClick={() => changePage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded text-xs disabled:opacity-40 transition"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* 
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

  useEffect(() => {
    if (open) {
      loadAccounts(1);
    }
  }, [open]);

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) {
      return;
    }

    loadAccounts(page);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white text-black rounded-xl shadow-xl w-[95%] max-w-7xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6 bg-gray-50">
          <h2 className="text-xl font-semibold text-black">
            G/L Account Lookup
          </h2>

          <button
            onClick={onClose}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>

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
 */

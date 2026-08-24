// app/components/shared/modals/GLAccountLookupModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GLAccountLookupRecord = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  description?: string;
  parent_name?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
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
    limit: 50,
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
      setPagination(
        json.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAccounts(1);
      setSelectedRecords([]);
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
      setSelectedRecords((prev) =>
        prev.filter((r) => !accounts.some((acc) => acc.id === r.id)),
      );
    } else {
      setSelectedRecords((prev) => {
        const uniqueNew = accounts.filter(
          (acc) => !prev.some((r) => r.id === acc.id),
        );
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Select G/L Account(s)
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Search and select general ledger posting accounts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            placeholder="Global search keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <input
            placeholder="Filter by G/L No..."
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <input
            placeholder="Filter by Account Name..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />

          <div className="flex gap-1.5">
            <Button
              onClick={() => loadAccounts(1)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
            <Button
              onClick={() => {
                setFilters({
                  search: "",
                  code: "",
                  name: "",
                  account_type: "",
                });
                setTimeout(() => loadAccounts(1), 0);
              }}
              className="px-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition flex items-center justify-center bg-white"
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
                <th className="p-3 w-36">G/L No.</th>
                <th className="p-3">Account Name</th>
                <th className="p-3 w-32">Type</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 5 : 4}
                    className="p-10 text-center font-normal text-slate-400 italic"
                  >
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 5 : 4}
                    className="p-10 text-center font-normal text-slate-400 italic"
                  >
                    No active G/L accounts discovered.
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
                      onClick={() => {
                        if (multiple) {
                          handleToggleRow(acc);
                        } else {
                          onSelect(acc);
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
                            onChange={() => handleToggleRow(acc)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {acc.code}
                      </td>
                      <td className="p-3 text-slate-800 font-sans font-medium">
                        {acc.name}
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px]">
                        {acc.account_type || "-"}
                      </td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => {
                              onSelect(acc);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition"
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
            {accounts.length > 0
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
                  // className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded-lg text-xs disabled:opacity-40 transition"
              >
                ‹ Prev
              </Button>
              <div className="border border-slate-200 bg-white font-mono px-3 py-1 rounded-lg text-xs text-slate-700 flex items-center font-bold">
                {pagination.page} / {pagination.totalPages || 1}
              </div>
              <Button
                onClick={() => changePage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold px-2.5 py-1 rounded-lg text-xs disabled:opacity-40 transition"
              >
                Next ›
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

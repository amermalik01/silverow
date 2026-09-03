// app/components/shared/modals/SalespersonLookupModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export type Employee = {
  id: string;
  employee_code: string;
  display_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status: string;
  hire_date?: string;
  designation?: string;
  employment_type?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
  onSelect?: (salesperson: Employee) => void;
  onSelectMultiple?: (salespersons: Employee[]) => void;
  status?: string;
};

export default function SalespersonLookupModal({
  open,
  onClose,
  multiple = false,
  onSelect,
  onSelectMultiple,
  status = "active",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [salespersons, setSalespersons] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

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

  const fetchSalespersons = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (status) params.append("status", status);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/lookups/salespersons?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load salespersons");
      }

      const json = await res.json();
      const records = Array.isArray(json) ? json : json.data || [];
      setSalespersons(records);
      setPagination({
        total: json.pagination?.total || records.length || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page, limit]);

  // Reset page to 1 on new search term
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, status or debounced term changes
  useEffect(() => {
    if (open) {
      fetchSalespersons();
    } else {
      // Clear selections when closing modal
      setSelectedEmployees([]);
    }
  }, [open, fetchSalespersons]);

  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  // Selection Logic
  const handleToggleRow = (emp: Employee) => {
    if (selectedEmployees.some((item) => item.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((item) => item.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
    }
  };

  const handleSelectAllCurrentPage = () => {
    const isAllSelected =
      salespersons.length > 0 &&
      salespersons.every((e) => selectedEmployees.some((s) => s.id === e.id));

    if (isAllSelected) {
      setSelectedEmployees((prev) =>
        prev.filter((s) => !salespersons.some((e) => e.id === s.id))
      );
    } else {
      setSelectedEmployees((prev) => {
        const novel = salespersons.filter(
          (e) => !prev.some((s) => s.id === e.id)
        );
        return [...prev, ...novel];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedEmployees);
    }
    onClose();
  };

  if (!open) return null;

  const isAllPageSelected =
    salespersons.length > 0 &&
    salespersons.every((e) => selectedEmployees.some((s) => s.id === e.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:user-check" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              {multiple ? "Select Salesperson(s)" : "Select Salesperson"}
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
              placeholder="Type to search code, name, email..."
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
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                {multiple && (
                  <th className="p-2.5 text-center font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAllCurrentPage}
                      className="cursor-pointer rounded border-slate-300 text-emerald-700 accent-[#103701] dark:accent-emerald-600"
                    />
                  </th>
                )}
                <th className="p-2.5 text-left font-semibold">Employee Code</th>
                <th className="p-2.5 text-left font-semibold">Display Name</th>
                <th className="p-2.5 text-left font-semibold">Email</th>
                <th className="p-2.5 text-left font-semibold">Contact / Mobile</th>
                <th className="p-2.5 text-center font-semibold">Status</th>
                {!multiple && (
                  <th className="p-2.5 text-center font-semibold">Action</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && salespersons.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 6 : 7}
                    className="text-center py-12 text-slate-500"
                  >
                    No salespersons found matching your query
                  </td>
                </tr>
              )}

              {loading && salespersons.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 6 : 7}
                    className="text-center py-12 text-slate-500"
                  >
                    Loading salespersons...
                  </td>
                </tr>
              )}

              {salespersons.map((person) => {
                const isChecked = selectedEmployees.some(
                  (s) => s.id === person.id
                );

                return (
                  <tr
                    key={person.id}
                    onClick={() => multiple && handleToggleRow(person)}
                    className={`transition-colors ${
                      multiple ? "cursor-pointer" : ""
                    } ${
                      isChecked
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40"
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
                          checked={isChecked}
                          onChange={() => handleToggleRow(person)}
                          className="cursor-pointer rounded border-slate-300 text-emerald-700 accent-[#103701] dark:accent-emerald-600"
                        />
                      </td>
                    )}
                    <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {person.employee_code}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {person.display_name}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {person.email || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono">
                      {person.mobile || person.phone || "—"}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          person.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {person.status}
                      </span>
                    </td>
                    {!multiple && (
                      <td
                        className="p-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          onClick={() => {
                            if (onSelect) onSelect(person);
                            onClose();
                          }}
                          className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                        >
                          Select
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {multiple && (
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                {selectedEmployees.length} Selected
              </span>
            )}
            <span>
              Showing {salespersons.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
              {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
              salespersons
            </span>
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
              <div className="flex items-center gap-2 ml-2">
                <Button
                  onClick={handleSubmitBatch}
                  disabled={selectedEmployees.length === 0}
                  className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-8 px-3 text-xs rounded transition disabled:opacity-50"
                >
                  Add Selection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
/* "use client";

import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Employee {
  id: string;
  employee_code: string;
  display_name: string;
  email: string;
  designation?: string;
  employment_type?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
  onSelect?: (salesperson: Employee) => void;
  onSelectMultiple?: (salespersons: Employee[]) => void;
}

export default function SalespersonLookupModal({
  open,
  onClose,
  multiple = false,
  onSelect,
  onSelectMultiple,
}: ModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Local Filtering Controls Hooks
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        display_name: searchName,
        email: searchEmail,
        all: "true", // Pull complete database records array matching lookups framework
      }).toString();

      const res = await fetch(`/api/lookups/salespersons?${query}`);
      if (!res.ok)
        throw new Error("Failed fetching salesperson entities matrix");

      const json = await res.json();
      // Handle array extracting whether server wraps payload data explicitly
      setEmployees(Array.isArray(json) ? json : json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, searchName, searchEmail]);

  if (!open) return null;

  const handleToggleRow = (emp: Employee) => {
    if (selectedEmployees.some((item) => item.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((item) => item.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
    }
  };

  const handleSelectAll = () => {
    const isAllSelected =
      employees.length > 0 &&
      employees.every((e) => selectedEmployees.some((s) => s.id === e.id));
    if (isAllSelected) {
      setSelectedEmployees((prev) =>
        prev.filter((s) => !employees.some((e) => e.id === s.id)),
      );
    } else {
      setSelectedEmployees((prev) => {
        const novel = employees.filter((e) => !prev.some((s) => s.id === e.id));
        return [...prev, ...novel];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedEmployees);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden font-sans">

        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="margin-0 text-xs font-bold text-slate-900">
            Select Salesperson(s) Reference
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-lg bg-none border-none cursor-pointer"
          >
            ×
          </button>
        </div>

 
        <div className="p-3.5 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Filter by Display Name..."
            className="w-full border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
          />
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Filter by Email Address..."
            className="w-full border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button
              onClick={fetchEmployees}
              className="bg-[#093009] text-white px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1 transition-colors hover:bg-emerald-900"
            >
              <Search className="h-3 w-3" /> Search
            </Button>
            <Button
              onClick={() => {
                setSearchName("");
                setSearchEmail("");
              }}
              className="border border-slate-200 bg-white text-slate-600 px-2.5 py-1.5 rounded flex items-center gap-1 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>


        <div className="flex-1 overflow-auto px-2 pb-10">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-[#093009] text-white font-bold sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={
                        employees.length > 0 &&
                        employees.every((e) =>
                          selectedEmployees.some((s) => s.id === e.id),
                        )
                      }
                      onChange={handleSelectAll}
                      className="cursor-pointer rounded border-slate-300 text-emerald-700"
                    />
                  )}
                </th>
                <th className="p-2.5">Employee No.</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Job Title</th>
                <th className="p-2.5">Employment Type</th>
                {!multiple && (
                  <th className="p-2.5 text-center w-24">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 6 : 7}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Retrieving structural system arrays...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 6 : 7}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isChecked = selectedEmployees.some(
                    (s) => s.id === emp.id,
                  );
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => multiple && handleToggleRow(emp)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? "bg-emerald-50/60" : ""}`}
                    >
                      <td
                        className="p-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={multiple ? isChecked : false}
                          disabled={!multiple}
                          onChange={() => handleToggleRow(emp)}
                          className="disabled:opacity-0 cursor-pointer rounded border-slate-300 text-emerald-700"
                        />
                      </td>
                      <td className="p-2.5 text-slate-500 font-bold">
                        {emp.employee_code}
                      </td>
                      <td className="p-2.5 font-sans font-semibold text-slate-900">
                        {emp.display_name}
                      </td>
                      <td className="p-2.5 text-blue-600 font-sans">
                        {emp.email}
                      </td>
                      <td className="p-2.5 font-sans text-slate-600">
                        {emp.designation || "-"}
                      </td>
                      <td className="p-2.5 font-sans text-slate-500">
                        {emp.employment_type || "-"}
                      </td>
                      {!multiple && (
                        <td
                          className="p-2.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => {
                              if (onSelect) onSelect(emp);
                              onClose();
                            }}
                            className="bg-emerald-700 text-white rounded shadow-sm hover:bg-emerald-800"
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

   
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="font-medium text-slate-500">
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mr-1.5">
              {selectedEmployees.length} Elements Selected
            </span>
            | Total Records Count: {employees.length}
          </div>
          <div className="flex gap-1.5">
            {multiple && (
              <Button
                onClick={handleSubmitBatch}
                disabled={selectedEmployees.length === 0}
                variant="save"
                // className="bg-[#093009] text-white font-bold px-4 py-1.5 rounded shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
              >
                Add Selection
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} */

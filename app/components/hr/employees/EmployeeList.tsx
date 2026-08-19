// app/components/hr/employees/EmployeeList.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getEmployeeCellRenderers } from "./EmployeeCellRenderers";
import { Employee } from "@/types/hr/employee";

type Props = {
  slug: string;
};

export default function EmployeeList({ slug }: Props) {
  // 1. Cell renderers registry
  const cellRenderers = getEmployeeCellRenderers(slug);

  // 2. Cell dispatcher
  const renderRowCell = (row: Employee, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // 3. Server Data Fetcher
  const fetchEmployees = async (
    params: FetchParams
  ): Promise<FetchResponse<Employee>> => {
    const res = await fetch("/api/hr/employees/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // 4. Configuration APIs
  const columnsConfigApi = {
    get: async (moduleKey: string): Promise<ColumnConfig[]> => {
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
    save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
      await fetch("/api/table-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, configs }),
      });
    },
    reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
      await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
        method: "POST",
      });
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
  };

  return (
    <div className="space-y-4 container mx-auto p-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">HR / Employees</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage employee profiles, designations, departments, and user access
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/hr/employees/new`}>+ Create</Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<Employee>
          moduleKey="hr_employees"
          fetchApi={fetchEmployees}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

type Employee = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  mobile?: string;
  status: string;
  department_name?: string;
  designation_name?: string;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function EmployeeList() {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        status,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/hr/employees?${params}`);
      const json = await res.json();

      setData(json.data || json.rows || []);
      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error("Error loading employees context mapping:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page counter tracking on filter updates
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Handle updates to queries
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      load();
    }, 300); // 300ms debounce buffer

    return () => clearTimeout(delayDebounce);
  }, [search, status, page]);

  return (
    <div className="space-y-6 container mx-auto p-4">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employees
          </h1>
          <p className="text-xs  text-slate-500">
            Manage internal workflows and organization records.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href="./employees/new">
            +
            Create
          </Link>
        </Button>

      </div>


      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-md bg-white dark:bg-slate-900 border">
        <div className="w-full md:w-1/3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="border border-slate-300 rounded p-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-full md:w-auto flex gap-4 justify-end items-center">
          <label className="text-xs text-slate-600 font-medium whitespace-nowrap">
            Status:
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>


      {loading ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-xs font-medium text-slate-500 animate-pulse">
            Fetching records...
          </p>
        </div>
      ) : (
        <div className="border-slate-200 dark:border-slate-800 border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {row.employee_code}
                      </td>
                      <td className="p-3 font-medium  text-slate-600 dark:text-slate-400">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="p-3  text-slate-600 dark:text-slate-400">
                        {row.department_name || "—"}
                      </td>
                      <td className="p-3  text-slate-600 dark:text-slate-400">
                        {row.designation_name || "—"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col text-xs">
                          <span className="text-slate-700">{row.email}</span>
                          <span className="text-slate-400">{row.mobile}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            row.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`./employees/${row.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 font-medium underline text-xs"
                        >
                          Manage Record
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

  
          <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-slate-500 font-medium">
              Showing page <b>{pagination.page}</b> of{" "}
              <b>{pagination.totalPages || 1}</b> ({pagination.total} total
              rows)
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
              >
                Previous
              </Button>
              <Button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages || loading}
                className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} */

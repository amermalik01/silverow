// app/components/parties/PartyList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

type Party = {
  id: string;
  name: string;
  crm_code?: string;
  srm_code?: string;
  customer_code?: string;
  supplier_code?: string;
  is_crm_lead: boolean;
  is_srm_vendor: boolean;
  is_customer: boolean;
  is_supplier: boolean;
  email?: string;
  phone?: string;
  status: string;
};

type Props = {
  title: string;
  roleFlag: "is_crm_lead" | "is_srm_vendor" | "is_customer" | "is_supplier";
  basePath: string;
};

export default function PartyList({ title, roleFlag, basePath }: Props) {
  const [data, setData] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const limit = 10;

  // Debounce search inputs to protect database performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page context back to first frame on search change
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search: debouncedSearch,
          role: roleFlag,
        });

        const res = await fetch(`/api/parties?${params}`);
        if (!res.ok) throw new Error("Network error encountered.");

        const result = await res.json();
        setData(result.data || []);
        setTotalRecords(result.total || 0);
      } catch (err) {
        console.error("Failed to acquire records: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page, debouncedSearch, roleFlag]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  const resolveDisplayCode = (row: Party) => {
    if (roleFlag === "is_crm_lead") return row.crm_code || "PENDING";
    if (roleFlag === "is_srm_vendor") return row.srm_code || "PENDING";
    if (roleFlag === "is_customer") return row.customer_code || "UNASSIGNED";
    if (roleFlag === "is_supplier") return row.supplier_code || "UNASSIGNED";
    return "N/A";
  };

  return (
    <div className="space-y-6 container mx-auto p-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-slate-500">
            Manage directory records and system visibility configurations.
          </p>
        </div>

        <Button
  asChild
  size="sm"
  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
>
  <Link href={`${basePath}/new`}>
    <Icon icon="solar:add-circle-linear" width={16} height={16} />
    Create New Account
  </Link>
</Button>
        {/* <Link
          href={`${basePath}/new`}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow transition-colors"
        >
          + Create New Account
        </Link> */}
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex items-center">
        <input
          type="text"
          placeholder="Search by code, corporate name, email, or telephone string..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 bg-transparent p-2 rounded-lg w-full md:w-1/2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* Main UI Data Matrix Grid */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="overflow-auto">
          <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3">Reference Code</th>
                <th className="p-3">Corporate Identity Name</th>
                <th className="p-3">Email Access Line</th>
                <th className="p-3">Primary Contact Phone</th>
                <th className="p-3">Active Roles</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action Options</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-slate-500 animate-pulse"
                  >
                    Querying system ledger database, please wait...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-slate-500 font-medium"
                  >
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                      {resolveDisplayCode(row)}
                    </td>
                    <td className="p-3 font-medium">
                      <Link
                        href={`${basePath}/${row.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {row.email || "—"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {row.phone || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {row.is_crm_lead && (
                          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            CRM
                          </span>
                        )}
                        {row.is_srm_vendor && (
                          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            SRM
                          </span>
                        )}
                        {row.is_customer && (
                          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Cust
                          </span>
                        )}
                        {row.is_supplier && (
                          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Vend
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block capitalize ${
                          row.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs space-x-2">
                      <Link
                        href={`${basePath}/${row.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        View
                      </Link>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <Link
                        href={`${basePath}/${row.id}/edit`}
                        className="text-emerald-600 hover:underline font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Dynamic Pagination Element */}
          {!loading && totalRecords > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="text-slate-500 font-medium">
                Showing page <b>{page}</b> of <b>{totalPages}</b> (
                {totalRecords} total index references tracked)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 font-medium text-slate-700 dark:text-slate-200 transition-opacity"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Party = {
  id: string;

  name: string;

  crm_code?: string;
  srm_code?: string;
  customer_code?: string;
  supplier_code?: string;

  email?: string;
  phone?: string;

  type: string;
  status: string;
};

type Props = {
  title: string;
  module: "crm" | "srm";

  typeFilter: string[]; // ["lead","customer"] OR ["supplier"]

  basePath: string; // "/crm" or "/purchases/srm"
};

export default function PartyList({
  title,
  module,
  typeFilter,
  basePath,
}: Props) {
  const [data, setData] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");

  const [totalRecords, setTotalRecords] = useState(0);

  const limit = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        type: typeFilter.join(","),
      });

      const res = await fetch(`/api/parties?${params}`);

      const result = await res.json();

      setData(result.data);
      setTotal(result.total);

      setTotalRecords(result?.total || 0);

      setLoading(false);
    };
    loadData();
  }, [page, search]);

  const totalPages = Math.ceil(total / limit);

  const getCode = (row: Party) => {
    if (module === "crm") return row.crm_code;
    if (module === "srm") return row.srm_code;
    return row.customer_code;
  };

  return (
    <div className="space-y-6 container mx-auto p-4">
   
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <Link
          href={`${basePath}/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New
        </Link>
      </div>


      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />
      </div>


      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
              <tr>
                <th className="p-2 text-left whitespace-nowrap">Code</th>
                <th className="p-2 text-left whitespace-nowrap">Name</th>
                <th className="p-2 text-left whitespace-nowrap">Email</th>
                <th className="p-2 text-left whitespace-nowrap">Phone</th>
                <th className="p-2 text-left whitespace-nowrap">Type</th>
                <th className="p-2 text-left whitespace-nowrap">Status</th>
                <th className="p-2 text-left whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    Loading List...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No record found
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-2">{getCode(row)}</td>

                    <td className="p-2">
                      <Link
                        href={`${basePath}/${row.id}`}
                        className="text-blue-600"
                      >
                        {row.name}
                      </Link>
                    </td>

                    <td className="p-2">{row.email}</td>
                    <td className="p-2">{row.phone}</td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.status}</td>

                    <td className="p-2">
                      <Link
                        href={`${basePath}/${row.id}`}
                        className="text-blue-600"
                      >
                        View
                      </Link>{" "}
                      |{" "}
                      <Link
                        href={`${basePath}/${row.id}/edit`}
                        className="text-green-600"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>


          {!loading && totalRecords > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="text-gray-500">
                Showing page <b>{page}</b> of <b>{totalPages}</b> (
                {totalRecords} total orders)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} */

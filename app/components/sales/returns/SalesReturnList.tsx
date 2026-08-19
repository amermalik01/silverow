// /app/components/sales/returns/SalesReturnList.tsx

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface ReturnListItem {
  id: string;
  return_no: string;
  customer_name: string | null;
  original_invoice_no: string | null;
  return_date: string;
  total_amount: string | number;
  status: "OPEN" | "POSTED" | "CANCELLED";
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export default function SalesReturnList({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 1. Local State Fields
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [limit, setLimit] = useState(
    parseInt(searchParams.get("limit") || "10", 10),
  );

  const [data, setData] = useState<{
    returns: ReturnListItem[];
    pagination: PaginationMeta;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // 2. Centralized URL Query Router Parameter Sync Engine
  const updateFilters = (
    newSearch: string,
    newStatus: string,
    newPage: number,
    newLimit: number,
  ) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newStatus !== "ALL") params.set("status", newStatus);
    if (newPage > 1) params.set("page", String(newPage));
    if (newLimit !== 10) params.set("limit", String(newLimit));

    startTransition(() => {
      router.push(`/${slug}/sales/returns?${params.toString()}`);
    });
  };

  // 3. Complete Linter-Safe API Execution Pipeline
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Placing state mutations safely inside the running execution block
      // instead of raw synchronous declaration on root effect layer lines
      setLoading(true);

      try {
        const apiParams = new URLSearchParams(searchParams.toString());
        const res = await fetch(
          `/api/sales/sales-returns?${apiParams.toString()}`,
        );
        const resData = await res.json();

        if (isMounted && resData.success) {
          setData({ returns: resData.returns, pagination: resData.pagination });
        }
      } catch (err) {
        console.error("Error updating component datasets:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Sync state values instantly if a user resets browser states or hits back buttons
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStatus(searchParams.get("status") || "ALL");
    setLimit(parseInt(searchParams.get("limit") || "10", 10));
  }, [searchParams]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "POSTED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="space-y-6 container mx-auto p-4">
      {/* Top Heading Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Sales Returns & Credit Notes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer return vouchers and financial credit memos
          </p>
        </div>
        {/* <Link
          href={`/${slug}/sales/returns/new`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium transition shadow-sm text-center"
        >
          + Log Sales Return
        </Link> */}

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/returns/new`}>
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
      </div>

      {/* Advanced Filter Toolbar Control Strip */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* <div className="bg-white p-4 border rounded-lg shadow-sm "></div> */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by return number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && updateFilters(search, status, 1, limit)
            }
            className="w-full text-xs border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Status Dropdown Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters(search, e.target.value, 1, limit);
            }}
            className="text-xs border px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open (Draft)</option>
            <option value="POSTED">Posted (Issued)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Row Limit Control Filter */}
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = parseInt(e.target.value, 10);
              setLimit(newLimit);
              updateFilters(search, status, 1, newLimit);
            }}
            className="text-xs border px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value={10}>10 records / page</option>
            <option value={25}>25 records / page</option>
            <option value={50}>50 records / page</option>
          </select>

          {/* Explicit Multi-Search Action Button Trigger */}
          <Button
            onClick={() => updateFilters(search, status, 1, limit)}
            disabled={loading || isPending}
            className="bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400 px-4 py-2 rounded-md text-xs font-medium transition"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Grid Table Display Box */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          {(loading || isPending) && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center text-xs font-semibold text-gray-500 z-10">
              Refreshing Returns Directory...
            </div>
          )}

          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">
                  Return Document No
                </th>
                <th className="p-3 text-left whitespace-nowrap">Client Name</th>
                <th className="p-3 text-left whitespace-nowrap">
                  Original Invoice Ref
                </th>
                <th className="p-3 text-left whitespace-nowrap">
                  Date Authenticated
                </th>
                <th className="p-3 w-32">Status</th>
                <th className="p-3 text-right w-40">Credit Value</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {data?.returns.length ? (
                data.returns.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-blue-600">
                      <Link
                        href={`/${slug}/sales/returns/${item.id}`}
                        className="hover:underline"
                      >
                        {item.return_no}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {item.customer_name || (
                        <span className="text-gray-400 italic">
                          Casual Walk-In
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-500">
                      {item.original_invoice_no || (
                        <span className="text-gray-300 font-serif">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(item.return_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] tracking-wider px-2 py-0.5 rounded-full font-bold border capitalize ${getStatusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-gray-900">
                      ${Number(item.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-400 italic"
                  >
                    No credit notes or returns matching search conditions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Sales-Order Matched Complete Dynamic Pagination Footer Control Hub */}
          {data && data.pagination.totalPages > 0 && (
            <div className="bg-gray-50 border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div>
                Displaying records{" "}
                <span className="font-semibold">
                  {(currentPage - 1) * data.pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold">
                  {Math.min(
                    currentPage * data.pagination.limit,
                    data.pagination.totalRecords,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {data.pagination.totalRecords}
                </span>{" "}
                matching logs
              </div>

              <div className="flex items-center space-x-1.5">
                {/* First Page Button */}
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => updateFilters(search, status, 1, limit)}
                  className="px-2.5 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  &laquo;
                </button>

                {/* Prev Page Button */}
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() =>
                    updateFilters(search, status, currentPage - 1, limit)
                  }
                  className="px-2.5 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Prev
                </button>

                {/* Dynamic Page Index Spans */}
                {Array.from(
                  { length: data.pagination.totalPages },
                  (_, i) => i + 1,
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === data.pagination.totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 text-gray-400 text-xs">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() =>
                            updateFilters(search, status, p, limit)
                          }
                          className={`px-3 py-1 border text-xs font-medium rounded transition ${
                            p === currentPage
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}

                {/* Next Page Button */}
                <button
                  disabled={
                    currentPage >= data.pagination.totalPages || loading
                  }
                  onClick={() =>
                    updateFilters(search, status, currentPage + 1, limit)
                  }
                  className="px-2.5 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Next
                </button>

                {/* Last Page Button */}
                <button
                  disabled={
                    currentPage >= data.pagination.totalPages || loading
                  }
                  onClick={() =>
                    updateFilters(
                      search,
                      status,
                      data.pagination.totalPages,
                      limit,
                    )
                  }
                  className="px-2.5 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  &raquo;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

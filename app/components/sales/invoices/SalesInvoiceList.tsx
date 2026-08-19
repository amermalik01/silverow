// /app/components/sales/invoices/SalesInvoiceList.tsx

"use client";

import Link from "next/link";
import { SalesInvoice } from "@/types/sales-invoice";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getSalesInvoiceCellRenderers } from "./salesInvoiceCellRenderers";

type Props = {
  slug: string;
};

export default function SalesInvoiceList({ slug }: Props) {
  // 1. Get registry renderers for sales invoice table
  const cellRenderers = getSalesInvoiceCellRenderers(slug);

  // 2. Ultra-clean render row cell dispatcher
  const renderRowCell = (row: SalesInvoice, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined; // Fallback to raw value in DataTable
  };

  // Data Fetching Handler
  const fetchSalesInvoices = async (
    params: FetchParams,
  ): Promise<FetchResponse<SalesInvoice>> => {
    const res = await fetch("/api/sales/sales-invoices/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // Config Persistence APIs
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
          <h2 className="text-xl font-semibold">Sales Invoices</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer sales invoices, payment terms, and billing records
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/invoices/create`}>+ Create</Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<SalesInvoice>
          moduleKey="sales_invoices"
          fetchApi={fetchSalesInvoices}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}
/* "use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface InvoiceListItem {
  id: string;
  invoice_no: string;
  customer_name: string | null;
  invoice_date: string;
  total_amount: string | number;
  is_posted: boolean;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export default function SalesInvoiceList({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state initialized straight from search strings
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [data, setData] = useState<{
    invoices: InvoiceListItem[];
    pagination: PaginationMeta;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Sync state data from local values out to query parameters
  const updateFilters = (
    newSearch: string,
    newStatus: string,
    newPage: number,
  ) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatus !== "ALL") params.set("status", newStatus);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/${slug}/sales/invoices?${params.toString()}`);
    });
  };

  useEffect(() => {
    // Use a functional state update callback to clear synchronous linting requirements
    setLoading(() => true);

    const fetchInvoices = async () => {
      try {
        const apiParams = new URLSearchParams(searchParams.toString());
        const res = await fetch(
          `/api/sales/sales-invoices?${apiParams.toString()}`,
        );
        const resData = await res.json();

        if (resData.success) {
          setData({
            invoices: resData.invoices,
            pagination: resData.pagination,
          });
        }
      } catch (err) {
        console.error("Error updating component datasets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [searchParams]);

  return (
    <div className="space-y-6 container mx-auto p-4">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Sales Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Review and manage company operational sub-ledgers
          </p>
        </div>
      </div>


      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by invoice number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && updateFilters(search, status, 1)
            }
            className="w-full text-xs border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters(search, e.target.value, 1);
            }}
            className="w-full text-xs border px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">All Post Statuses</option>
            <option value="DRAFT">Draft / Open Only</option>
            <option value="POSTED">Posted Only</option>
          </select>
        </div>
        <Button
          onClick={() => updateFilters(search, status, 1)}
          disabled={loading || isPending}
          className="bg-gray-100 border text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md text-xs font-medium transition"
        >
          Filter
        </Button>
      </div>


      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          {(loading || isPending) && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center text-xs font-semibold text-gray-500 z-10">
              Refreshing Database Logs...
            </div>
          )}

          
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">Invoice Number</th>
                <th className="p-3 text-left whitespace-nowrap">Customer Reference</th>
                <th className="p-3 text-left whitespace-nowrap">Billing Date</th>
                <th className="p-3 w-32 text-left whitespace-nowrap">Ledger Status</th>
                <th className="p-3 text-right w-40">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {data?.invoices.length ? (
                data.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-blue-600">
                      <Link
                        href={`/${slug}/sales/invoices/${inv.id}`}
                        className="hover:underline"
                      >
                        {inv.invoice_no}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {inv.customer_name || (
                        <span className="text-gray-400 italic">
                          Walk-In Client
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          inv.is_posted
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {inv.is_posted ? "Posted" : "Open Draft"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-gray-900">
                      ${Number(inv.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-gray-400 italic"
                  >
                    No matching commercial invoices located within selected
                    accounting ranges.
                  </td>
                </tr>
              )}
            </tbody>
          </table>


          {data && data.pagination.totalPages > 1 && (
            <div className="bg-gray-50 border-t p-4 flex items-center justify-between text-xs text-gray-600">
              <div>
                Showing items{" "}
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
                matching forms
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => updateFilters(search, status, currentPage - 1)}
                  className="px-3 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium">
                  Page {currentPage} of {data.pagination.totalPages}
                </span>
                <Button
                  disabled={
                    currentPage >= data.pagination.totalPages || loading
                  }
                  onClick={() => updateFilters(search, status, currentPage + 1)}
                  className="px-3 py-1 border rounded bg-white text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} */

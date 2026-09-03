// /app/components/sales/orders/SalesOrderList.tsx

"use client";

import Link from "next/link";
import { SalesOrder } from "@/types/sales-order";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getSalesOrderCellRenderers } from "./salesOrderCellRenderers";

type Props = {
  slug: string;
};

export default function SalesOrderList({ slug }: Props) {
  // 1. Get registry renderers for sales order table
  const cellRenderers = getSalesOrderCellRenderers(slug);

  // 2. Ultra-clean render row cell dispatcher
  const renderRowCell = (row: SalesOrder, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined; // Fallback to raw value in DataTable
  };

  // Data Fetching Handler
  const fetchSalesOrders = async (
    params: FetchParams,
  ): Promise<FetchResponse<SalesOrder>> => {
    const res = await fetch("/api/sales/sales-orders/listing", {
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
    <div className="space-y-4 ">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Sales Orders</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer sales orders, dispatches, and invoicing
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/orders/new`}>
            + Create
          </Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<SalesOrder>
          moduleKey="sales_orders"
          fetchApi={fetchSalesOrders}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

/* "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

type Props = {
  slug: string;
};

type SalesOrderRow = {
  id: string;
  order_no: string;
  order_date: string;
  customer_name?: string;
  status: string;
  invoice_status?: string;
  total_amount: number;
  invoiced_amount?: number;
  ordered_qty?: number;
  shipped_qty?: number;
  invoiced_qty?: number;
  remaining_qty?: number;
  sales_invoice_id?: string;
};

export default function SalesOrderList({ slug }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesOrderRow[]>([]);

  // Filter & Pagination States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [page, status, startDate, endDate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        status,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/sales/sales-orders?${params.toString()}`);
      const json = await res.json();

      setRows(json.rows || []);
      setTotalPages(json.meta?.totalPages || 1);
      setTotalRecords(json.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const renderStatusBadge = (value?: string) => {
    if (!value) return null;

    let className =
      "px-2 py-0.5 rounded text-xs font-medium inline-block w-fit whitespace-nowrap";

    switch (value) {
      case "OPEN":
        className +=
          " bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
        break;
      case "RELEASED":
        className +=
          " bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
        break;
      case "PARTIAL_SHIPPED":
      case "PARTIALLY_SHIPPED":
        className +=
          " bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
        break;
      case "SHIPPED":
      case "INVOICED":
      case "CLOSED":
        className +=
          " bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
        break;
      case "CANCELLED":
        className +=
          " bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
        break;
      default:
        className +=
          " bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }

    return <span className={className}>{value}</span>;
  };

  return (
    <div className="space-y-6  p-4">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Sales Orders</h2>
          <p className="text-xs text-gray-500">
            Manage customer orders, shipments and invoices
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/orders/new`}>
            +
            Create
          </Link>
        </Button>
      </div>


      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex gap-2 md:col-span-1"
        >
          <input
            type="text"
            placeholder="Search Order No or Customer..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="border rounded p-2 text-xs w-full dark:bg-slate-800 text-black dark:text-white"
          />
          <button
            type="submit"
            className="bg-gray-100 dark:bg-slate-800 text-black dark:text-white px-3 py-2 rounded text-xs hover:bg-gray-200"
          >
            Go
          </button>
        </form>

        <div>
          <select
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded p-2 text-xs w-full dark:bg-slate-800 text-black dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RELEASED">Released</option>
            <option value="PARTIALLY_SHIPPED">Partially Shipped</option>
            <option value="SHIPPED">Shipped</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>



        <div className="flex items-center gap-2 md:col-span-2">
          <DatePicker
            value={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
            onChange={(date) => {
              setStartDate(date ? format(date, "yyyy-MM-dd") : "");
              setPage(1);
            }}
            placeholder="Start date"
            className="w-full"
          />

          <span className="text-xs text-gray-400 shrink-0">to</span>

          <DatePicker
            value={endDate ? new Date(`${endDate}T00:00:00`) : undefined}
            onChange={(date) => {
              setEndDate(date ? format(date, "yyyy-MM-dd") : "");
              setPage(1);
            }}
            placeholder="End date"
            className="w-full"
          />
        </div>
      </div>


      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">Order No</th>
                <th className="p-3 text-left whitespace-nowrap">Date</th>
                <th className="p-3 text-left whitespace-nowrap">Customer</th>
                <th className="p-3 text-left whitespace-nowrap">Status</th>
                <th className="p-3 text-right whitespace-nowrap">Ordered</th>
                <th className="p-3 text-right whitespace-nowrap">Shipped</th>
                <th className="p-3 text-right whitespace-nowrap">Invoiced</th>
                <th className="p-3 text-right whitespace-nowrap">Remaining</th>
                <th className="p-3 text-right whitespace-nowrap">Total</th>
                <th className="p-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    Loading sales orders...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No sales orders found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-3 font-medium text-blue-600 dark:text-blue-400">
                      <Link href={`/${slug}/sales/orders/${row.id}`}>
                        {row.order_no}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(row.order_date).toLocaleDateString()}
                    </td>
                    <td className="p-3 max-w-[200px] truncate">
                      {row.customer_name}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {renderStatusBadge(row.status)}
                        {row.invoice_status &&
                          renderStatusBadge(row.invoice_status)}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {Number(row.ordered_qty || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-green-600 dark:text-green-400">
                      {Number(row.shipped_qty || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-purple-600 dark:text-purple-400">
                      {Number(row.invoiced_qty || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-medium text-amber-600">
                      {Number(row.remaining_qty || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {Number(row.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-3 justify-center items-center">
                        <Link
                          href={`/${slug}/sales/orders/${row.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        {row.status !== "CLOSED" &&
                          row.status !== "CANCELLED" && (
                            <Link
                              href={`/${slug}/sales/orders/${row.id}/shipment`}
                              className="text-green-600 hover:underline"
                            >
                              Ship
                            </Link>
                          )}
                        {row.sales_invoice_id ? (
                          <Link
                            href={`/${slug}/sales/invoices/${row.sales_invoice_id}`}
                            className="text-purple-600 hover:underline"
                          >
                            View Invoice
                          </Link>
                        ) : (
                          row.status !== "CANCELLED" && (
                            <Link
                              href={`/${slug}/sales/orders/${row.id}`}
                              className="text-orange-600 hover:underline"
                            >
                              Invoice
                            </Link>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

    
        {!loading && totalRecords > 0 && (
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-gray-500">
              Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalRecords}{" "}
              total orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium"
              >
                Previous
              </Button>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border rounded bg-white dark:bg-slate-800 disabled:opacity-50 font-medium"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} */

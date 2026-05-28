// /app/components/sales/orders/SalesOrderList.tsx

"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/sales/sales-orders");

      const json = await res.json();

      setRows(json.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (value?: string, type?: "status" | "invoice") => {
    if (!value) return null;

    let className = "px-2 py-1 rounded text-xs font-medium inline-block";

    switch (value) {
      case "OPEN":
        className += " bg-blue-100 text-blue-700";
        break;

      case "PARTIAL_SHIPPED":
      case "PARTIAL_INVOICED":
        className += " bg-yellow-100 text-yellow-700";
        break;

      case "SHIPPED":
      case "INVOICED":
      case "CLOSED":
        className += " bg-green-100 text-green-700";
        break;

      case "CANCELLED":
        className += " bg-red-100 text-red-700";
        break;

      default:
        className += " bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sales Orders</h2>

          <p className="text-sm text-gray-500">
            Manage customer orders, shipments and invoices
          </p>
        </div>

        <Link
          href={`/${slug}/sales/orders/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Sales Order
        </Link>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-black">
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

              <th className="p-3 text-right whitespace-nowrap">Invoiced Amt</th>

              <th className="p-3 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-500">
                  No sales orders found
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={11} className="p-8 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{row.order_no}</td>

                <td className="p-3">{row.order_date}</td>

                <td className="p-3">{row.customer_name}</td>

                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {renderStatusBadge(row.status)}

                    {renderStatusBadge(row.invoice_status, "invoice")}
                  </div>
                </td>

                <td className="p-3 text-right">
                  {Number(row.ordered_qty || 0).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(row.shipped_qty || 0).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(row.invoiced_qty || 0).toFixed(2)}
                </td>

                <td className="p-3 text-right font-medium">
                  {Number(row.remaining_qty || 0).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(row.total_amount || 0).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(row.invoiced_amount || 0).toFixed(2)}
                </td>

                <td className="p-3">
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link
                      href={`/${slug}/sales/orders/${row.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/${slug}/sales/orders/${row.id}/shipment`}
                      className="text-green-600 hover:underline"
                    >
                      Ship
                    </Link>

                    {row.invoice_status !== "INVOICED" && (
                      <Link
                        href={`/${slug}/sales/orders/${row.id}`}
                        className="text-orange-600 hover:underline"
                      >
                        Invoice
                      </Link>
                    )}

                    {row.sales_invoice_id && (
                      <Link
                        href={`/${slug}/sales/invoices/${row.sales_invoice_id}`}
                        className="text-purple-600 hover:underline"
                      >
                        View Invoice
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

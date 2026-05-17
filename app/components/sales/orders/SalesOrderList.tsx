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

  total_amount: number;
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/${slug}/sales/orders/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Sales Order
        </Link>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Order No</th>

              <th className="p-3 text-left">Date</th>

              <th className="p-3 text-left">Customer</th>

              <th className="p-3 text-left">Status</th>

              <th className="p-3 text-right">Total</th>

              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No sales orders found
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.order_no}</td>

                <td className="p-3">{row.order_date}</td>

                <td className="p-3">{row.customer_name}</td>

                <td className="p-3">{row.status}</td>

                <td className="p-3 text-right">
                  {Number(row.total_amount || 0).toFixed(2)}
                </td>

                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Link
                      href={`/${slug}/sales/orders/${row.id}`}
                      className="text-blue-600"
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/${slug}/sales/orders/${row.id}/shipment`}
                      className="text-green-600"
                    >
                      Ship
                    </Link>
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

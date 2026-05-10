// app/components/purchases/purchase-orders/PurchaseOrderList.tsx

"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { PurchaseOrder } from "@/types/purchase-order";

import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  const [data, setData] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="rounded border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Purchase Orders</h2>

        <Link
          href={`/${slug}/purchases/purchase-orders/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Order
        </Link>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2">Order No</th>

            <th className="p-2">Date</th>

            <th className="p-2">Status</th>

            <th className="p-2">Total</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="p-2">
                <Link
                  href={`/${slug}/purchases/purchase-orders/${row.id}`}
                  className="text-blue-600"
                >
                  {row.order_no || "Draft"}
                </Link>
              </td>

              <td className="p-2">{row.order_date}</td>

              <td className="p-2">
                <PurchaseOrderStatusBadge status={row.status} />
              </td>

              <td className="p-2 text-right">
                {Number(row.total_amount || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

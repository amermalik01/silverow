// app/components/purchases/purchase-orders/PurchaseOrderList.tsx

"use client";

import Link from "next/link";

import { useCallback, useEffect, useState } from "react";

import { PurchaseOrder } from "@/types/purchase-order";

import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";

type Props = {
  slug: string;
};

type ApiResponse = {
  success: boolean;
  data: PurchaseOrder[];
};

export default function PurchaseOrderList({
  slug,
}: Props) {
  const [data, setData] = useState<PurchaseOrder[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /**
   * =========================================================
   * LOAD DATA
   * =========================================================
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      const res = await fetch("/api/purchase-orders", {
        cache: "no-store",
      });

      const json: ApiResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json?.success === false
            ? "Failed to load purchase orders"
            : "Unexpected error",
        );
      }

      setData(json.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase orders",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <div className="rounded border p-6">
        Loading purchase orders...
      </div>
    );
  }

  /**
   * =========================================================
   * ERROR
   * =========================================================
   */
  if (error) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-6 text-red-600">
        {error}
      </div>
    );
  }

  /**
   * =========================================================
   * UI
   * =========================================================
   */
  return (
    <div className="rounded border bg-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Purchase Orders
          </h2>

          <p className="text-sm text-gray-500">
            Manage supplier purchase orders
          </p>
        </div>

        <Link
          href={`/${slug}/purchases/purchase-orders/create`}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Order
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b p-2 text-left">
                Order No
              </th>

              <th className="border-b p-2 text-left">
                Supplier
              </th>

              <th className="border-b p-2 text-left">
                Date
              </th>

              <th className="border-b p-2 text-left">
                Status
              </th>

              <th className="border-b p-2 text-right">
                Total
              </th>

              <th className="border-b p-2 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {!data.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  No purchase orders found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2">
                    <Link
                      href={`/${slug}/purchases/purchase-orders/${row.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.order_no || "Draft"}
                    </Link>
                  </td>

                  <td className="p-2">
                    {row.supplier_name || "-"}
                  </td>

                  <td className="p-2">
                    {row.order_date}
                  </td>

                  <td className="p-2">
                    <PurchaseOrderStatusBadge
                      status={row.status}
                    />
                  </td>

                  <td className="p-2 text-right">
                    {Number(
                      row.total_amount || 0,
                    ).toFixed(2)}
                  </td>

                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/${slug}/purchases/purchase-orders/${row.id}`}
                        className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        View
                      </Link>

                      {row.status === "open" && (
                        <Link
                          href={`/${slug}/purchases/purchase-orders/${row.id}/receive`}
                          className="rounded border border-green-600 px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                        >
                          Receive
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* "use client";

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
} */

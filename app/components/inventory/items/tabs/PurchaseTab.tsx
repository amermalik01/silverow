// app/components/inventory/items/tabs/PurchaseTab.tsx

"use client";

import { useEffect, useState } from "react";

type PurchasePrice = {
  id: string;
  uom_id: string;
  uom_name?: string | null;
  price: number;
  vendor_id?: string | null;
  vendor_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Props = {
  itemId: string;
};

export default function PurchaseTab({ itemId }: Props) {
  const [data, setData] = useState<PurchasePrice[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/items/${itemId}/purchase-prices`);

      const result = await res.json();

      setData(result || []);
    } catch (err) {
      console.error("PurchaseTab error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h2 className="text-lg font-semibold">Purchase Setup</h2>

        <p className="text-sm text-gray-500">
          Manage item purchase cost by UOM and vendor
        </p>
      </div>

      {/* TABLE */}

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">UOM</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Vendor</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No purchase prices found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.uom_name || row.uom_id}</td>

                  <td className="p-3">{row.price}</td>

                  <td className="p-3">
                    {row.vendor_name || row.vendor_id || "-"}
                  </td>

                  <td className="p-3">{row.start_date ?? "-"}</td>

                  <td className="p-3">{row.end_date ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}

      <p className="text-sm text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}

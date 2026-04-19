// app/components/setup/inventory/warehouses/WarehouseList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: number;
};

export default function WarehouseList() {
  const [data, setData] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  //   const loadData = async () => {
  //     setLoading(true);
  //     const res = await fetch("/api/setup/warehouses");
  //     const result = await res.json();
  //     setData(result);
  //     setLoading(false);
  //   };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const res = await fetch("/api/setup/warehouses");
      const result = await res.json();
      setData(result);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Warehouses</h2>

        <Link
          href="./warehouses/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Warehouse
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border text-left">
          <thead>
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.code}</td>

                <td className="p-2">
                  <Link
                    href={`./warehouses/${row.id}`}
                    className="text-blue-600"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.status}</td>

                <td className="p-2">
                  <Link
                    href={`./warehouses/${row.id}`}
                    className="text-blue-600"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

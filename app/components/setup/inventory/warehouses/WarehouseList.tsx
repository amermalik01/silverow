// app/components/setup/inventory/warehouses/WarehouseList.tsx

// app/components/setup/inventory/warehouses/WarehouseList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: number;
};

export default function WarehouseList() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/setup/warehouses");
        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Failed to fetch warehouses", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusBadge = (status: number) => {
    return status === 1 ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Inactive
      </span>
    );
  };

  const formatType = (type: string) => {
    return type.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Warehouses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage storage locations, transit hubs, and distribution centers
          </p>
        </div>

        <Link
          href={`/${slug}/setup/inventory/warehouses/new`}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-md shadow-sm transition-colors"
        >
          <span>+</span> New Warehouse
        </Link>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
          Loading warehouses...
        </div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No warehouses found. Click <strong className="text-slate-700">+ New Warehouse</strong> to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600 font-semibold">
                    {row.code || "—"}
                  </td>

                  <td className="px-6 py-3.5 font-medium text-slate-900">
                    <Link
                      href={`/${slug}/setup/inventory/warehouses/${row.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>

                  <td className="px-6 py-3.5 text-slate-600">
                    {formatType(row.type)}
                  </td>

                  <td className="px-6 py-3.5">
                    {getStatusBadge(row.status)}
                  </td>

                  <td className="px-6 py-3.5 text-right font-medium">
                    <Link
                      href={`/${slug}/setup/inventory/warehouses/${row.id}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// app/components/setup/inventory/uoms/UOMList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UOM } from "@/types/inventory";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export default function UOMList() {
  const [data, setData] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const res = await fetch("/api/setup/inventory/uoms");

      const result = await res.json();

      setData(result);

      setLoading(false);
    };

    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this Unit of measure?",
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/setup/inventory/uom/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      // remove from UI (no full reload)
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log("Delete error:", err);
      alert("Failed to delete record");
    }
  };

  const getTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return "Quantity";

      case 2:
        return "Weight";

      case 3:
        return "Volume";

      case 4:
        return "Length";

      default:
        return "-";
    }
  };

  return (
    <div className="space-y-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-semibold">UOMs</h2>

        {/* <Link
          href="./uoms/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New UOM
        </Link> */}

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href="./uoms/new">
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
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
              <th className="p-2">Decimals</th>
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
                    href={`./uoms/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">{getTypeLabel(row.uom_type)}</td>

                <td className="p-2">{row.decimal_places}</td>

                <td className="p-2">
                  {row.status === 1 ? "Active" : "Inactive"}
                </td>

                <td className="p-2 space-x-2">
                  <Link
                    href={`./uoms/${row.id}/edit`}
                    className="text-blue-600"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(row.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

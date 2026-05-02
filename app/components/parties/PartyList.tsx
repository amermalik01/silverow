// app/components/parties/PartyList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* =========================
   TYPES
========================= */

type Party = {
  id: string;

  name: string;

  crm_code?: string;
  srm_code?: string;
  customer_code?: string;
  supplier_code?: string;

  email?: string;
  phone?: string;

  type: string;
  status: string;
};

type Props = {
  title: string;
  module: "crm" | "srm";

  typeFilter: string[]; // ["lead","customer"] OR ["supplier"]

  basePath: string; // "/crm" or "/purchases/srm"
};

export default function PartyList({
  title,
  module,
  typeFilter,
  basePath,
}: Props) {
  const [data, setData] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");

  const limit = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        type: typeFilter.join(","),
      });

      const res = await fetch(`/api/parties?${params}`);

      const result = await res.json();

      setData(result.data);
      setTotal(result.total);

      setLoading(false);
    };
    loadData();
  }, [page, search]);

  const totalPages = Math.ceil(total / limit);

  const getCode = (row: Party) => {
    if (module === "crm") return row.crm_code;
    if (module === "srm") return row.srm_code;
    return row.customer_code;
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{title}</h1>

        <Link
          href={`${basePath}/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New
        </Link>
      </div>

      {/* SEARCH */}
      <div>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border text-left">
          <thead>
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{getCode(row)}</td>

                <td className="p-2">
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="text-blue-600"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">{row.email}</td>
                <td className="p-2">{row.phone}</td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.status}</td>

                <td className="p-2">
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="text-blue-600"
                  >
                    View
                  </Link>{" "}
                  |{" "}
                  <Link
                    href={`${basePath}/${row.id}/edit`}
                    className="text-green-600"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* PAGINATION */}
      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="border px-3 py-1"
        >
          Prev
        </button>

        <span>
          Page {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="border px-3 py-1"
        >
          Next
        </button>
      </div>
    </div>
  );
}

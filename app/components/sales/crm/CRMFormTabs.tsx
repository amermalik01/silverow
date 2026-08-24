// components/crm/CRMFormTabs.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type CRMAccount = {
  id: string;
  name: string;
  crm_code: string;
  customer_code: string;
  email: string;
  phone: string;
  status: string;
  type: string;
};

export default function CRMList() {
  const [data, setData] = useState<CRMAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const limit = 10;

  const loadData = async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      type,
      status,
    });

    const res = await fetch(`/api/sales/crm/accounts?${params}`);

    const result = await res.json();

    setData(result.data);
    setTotal(result.total);

    setLoading(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        type,
        status,
      });

      const res = await fetch(`/api/sales/crm/accounts?${params}`);

      const result = await res.json();

      setData(result.data);
      setTotal(result.total);

      setLoading(false);
    };

    fetchData();
  }, [page, search, type, status]);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">CRM Accounts</h1>

        <Link
          href="./crm/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New CRM
        </Link>
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Types</option>
          <option value="lead">Lead</option>
          <option value="customer">Customer</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border table-fixed text-left">
          <thead>
            <tr className="">
              <th className="p-2">CRM Code</th>
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
                <td className="p-2">{row.crm_code}</td>

                <td className="p-2">
                  <Link href={`./crm/${row.id}`} className="text-blue-600">
                    {row.name}
                  </Link>
                </td>

                <td className="p-2">{row.email}</td>
                <td className="p-2">{row.phone}</td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.status}</td>

                <td className="p-2">
                  <Link href={`./crm/${row.id}`} className="text-blue-600">
                    View
                  </Link>
                  &nbsp;|&nbsp;
                  <Link
                    href={`./crm/${row.id}/edit`}
                    className="text-green-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}

      <div className="flex gap-2">
        <Button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="border px-3 py-1"
        >
          Prev
        </Button>

        <span>
          Page {page} / {totalPages}
        </span>

        <Button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="border px-3 py-1"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

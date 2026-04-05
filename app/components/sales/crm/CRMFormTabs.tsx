// components/crm/CRMFormTabs.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

      {/* Filters */}

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

      {/* Table */}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}

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

/* import React, { useEffect, useState } from "react";
import Link from "next/link";

type CRMAccount = {
  id: string;
  name: string;
  crm_code: string;
  customer_code: string;
  type: "lead" | "customer";
};

export default function CRMList() {
  const [data, setData] = useState<CRMAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/sales/crm/accounts")
      .then((res) => res.json())
      .then((accounts: CRMAccount[]) => {
        setData(accounts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch CRM accounts:", err);
        setLoading(false);
      });
  }, []);

  const convertToCustomer = async (id: string) => {
    try {
      await fetch("/api/sales/crm/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: id,
          company_id: "YOUR_COMPANY_ID",
        }),
      });

      setData((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, type: "customer" } : acc
        )
      );
    } catch (error) {
      console.error("Conversion failed:", error);
    }
  };

  if (loading) {
    return <p>Loading CRM accounts...</p>;
  }

  return (
    <div className="overflow-x-auto p-6 space-y-4">



      <div className="flex justify-between items-center">

        <h1 className="text-xl font-semibold">
          CRM Accounts
        </h1>

        <Link
          href="./crm/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New CRM
        </Link>

      </div>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">CRM Code</th>
            <th className="p-2 text-left">Customer Code</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((account) => (
            <tr key={account.id} className="border-b border-gray-200">
              <td className="p-2">{account.name}</td>
              <td className="p-2">{account.crm_code}</td>
              <td className="p-2">{account.customer_code}</td>
              <td className="p-2">
                {account.type === "lead" ? (
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => convertToCustomer(account.id)}
                  >
                    Convert to Customer
                  </button>
                ) : (
                  <span className="text-gray-500">Already Customer</span>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="p-2 text-center text-gray-500">
                No CRM accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} */

// app/components/finance/ChartOfAccountsList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_name?: string | null;

  total_debit: number;
  total_credit: number;
  balance: number;
};

export default function ChartOfAccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/finance/accounts");

      if (!res.ok) {
        throw new Error("Failed to load accounts");
      }

      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const formatCurrency = (value: number) => {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="p-6 rounded shadow">
        <p>Loading Chart of Accounts...</p>
      </div>
    );
  }

  return (
    <div className=" shadow rounded-lg p-6">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Chart of Accounts
        </h2>

        <Link
          href="./chart-of-accounts/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Account
        </Link>
      </div>

      {/* Table */}

      <div className="overflow-x-auto">

        <table className="w-full border text-sm">

          <thead className="">

            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Account</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Parent</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Credit</th>
              <th className="p-2 text-right">Balance</th>
              <th className="p-2 text-center">Actions</th>
            </tr>

          </thead>

          <tbody>

            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center p-6 text-gray-500"
                >
                  No accounts found
                </td>
              </tr>
            )}

            {accounts.map((acc) => (
              <tr
                key={acc.id}
                className="border-t hover:bg-gray-50"
              >

                {/* Code */}

                <td className="p-2 font-medium">
                  {acc.code}
                </td>

                {/* Account */}

                <td className="p-2">

                  <Link
                    href={`./chart-of-accounts/${acc.id}/ledger`}
                    className="text-blue-600 hover:underline"
                  >
                    {acc.name}
                  </Link>

                </td>

                {/* Type */}

                <td className="p-2">
                  {acc.account_type}
                </td>

                {/* Parent */}

                <td className="p-2">
                  {acc.parent_name || "-"}
                </td>

                {/* Debit */}

                <td className="p-2 text-right">
                  {formatCurrency(acc.total_debit)}
                </td>

                {/* Credit */}

                <td className="p-2 text-right">
                  {formatCurrency(acc.total_credit)}
                </td>

                {/* Balance */}

                <td className="p-2 text-right font-semibold">

                  <span
                    className={
                      acc.balance >= 0
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {formatCurrency(acc.balance)}
                  </span>

                </td>

                {/* Actions */}

                <td className="p-2 text-center space-x-2">

                  <Link
                    href={`./chart-of-accounts/${acc.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}


/* "use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_name?: string;
  is_active: boolean;
};

export default function ChartOfAccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    const res = await fetch("/api/finance/accounts");
    const data = await res.json();

    setAccounts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (loading) {
    return <p>Loading accounts...</p>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">

      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Chart of Accounts</h2>

        <a
          href="./chart-of-accounts/create"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Account
        </a>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Account Name</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-left">Parent</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.id} className="border-t">

              <td className="p-2">{acc.code}</td>

              <td className="p-2 font-medium">
                {acc.name}
              </td>

              <td className="p-2">
                {acc.account_type}
              </td>

              <td className="p-2">
                {acc.parent_name || "-"}
              </td>

              <td className="p-2">
                {acc.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-500">Inactive</span>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} */
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

  display_debit: number;
  display_credit: number;

  // total_debit: number;
  // total_credit: number;
  // balance: number;
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
      <div className="p-6 rounded shadow dark:shadow-white">
        <p>Loading Chart of Accounts...</p>
      </div>
    );
  }

  return (
    <div className=" shadow dark:shadow-white rounded-lg p-6">

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
              {/* <th className="p-2 text-right">Balance</th> */}
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
                  {acc.display_debit > 0 ? formatCurrency(acc.display_debit) : ""}
                </td>

                {/* Credit */}
                <td className="p-2 text-right">
                  {acc.display_credit > 0 ? formatCurrency(acc.display_credit) : ""}
                </td>

                {/* <td className="p-2 text-right">
                  {formatCurrency(acc.total_debit)}
                </td>

                <td className="p-2 text-right">
                  {formatCurrency(acc.total_credit)}
                </td>

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

                </td> */}

                

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
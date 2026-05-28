// app/components/finance/ChartOfAccountsList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AccountNode {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  is_summary: boolean;
  balance: number;
  display_debit: number;
  display_credit: number;
  indent_level?: number;
}

export default function ChartOfAccountsList() {
  const [orderedTree, setOrderedTree] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTree() {
      try {
        const res = await fetch("/api/finance/accounts");
        if (!res.ok) throw new Error();
        const data: AccountNode[] = await res.json();

        // Dynamic nesting sequencer algorithm
        const buildTree = (
          parentId: string | null,
          depth = 0,
        ): AccountNode[] => {
          return data
            .filter((node) => node.parent_id === parentId)
            .reduce<AccountNode[]>((acc, current) => {
              const formattedNode = { ...current, indent_level: depth };
              return [
                ...acc,
                formattedNode,
                ...buildTree(current.id, depth + 1),
              ];
            }, []);
        };

        setOrderedTree(buildTree(null));
      } catch {
        console.error("Critical error building chart tracking maps.");
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, []);

  if (loading)
    return (
      <div className="p-6 text-sm text-gray-500 animate-pulse">
        Assembling account balance structures...
      </div>
    );

  return (
    <div className="bg-white dark:bg-slate-900 text-black dark:text-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold ">
            General Ledger Mappings
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage accounting structures and multi-level summary grouping nodes.
          </p>
        </div>
        <Link
          href="./chart-of-accounts/create"
          className="bg-indigo-600  text-xs font-semibold px-4 py-2.5 rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Add Account
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 font-semibold border-b text-left">
              <th className="p-3 pl-6">Code</th>
              <th className="p-3">Account Title</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Debit Vector</th>
              <th className="p-3 text-right">Credit Vector</th>
              {/* <th className="p-3 text-right">Net Value Balance</th> */}
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono ">
            {orderedTree.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-gray-400 font-sans"
                >
                  No accounting structures initialized yet.
                </td>
              </tr>
            )}
            {orderedTree.map((acc) => (
              <tr
                key={acc.id}
                className={`transition ${acc.is_summary ? "bg-gray-50/60 font-semibold  group" : "hover:bg-slate-50/50"}`}
              >
                <td className="p-3 pl-6 whitespace-nowrap tracking-wider font-medium">
                  {acc.code}
                </td>
                <td className="p-3 whitespace-nowrap font-sans">
                  <span
                    style={{
                      paddingLeft: `${(acc.indent_level ?? 0) * 1.5}rem`,
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    {acc.is_summary ? (
                      <span className="text-gray-400 text-[10px] select-none">
                        📁
                      </span>
                    ) : (
                      <span className="text-indigo-400 text-[10px] select-none">
                        📄
                      </span>
                    )}
                    {acc.is_summary ? (
                      <span className="text-gray-900 font-semibold">
                        {acc.name}
                      </span>
                    ) : (
                      <Link
                        href={`./chart-of-accounts/${acc.id}/ledger`}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        {acc.name}
                      </Link>
                    )}
                  </span>
                </td>
                <td className="p-3 font-sans">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border">
                    {acc.account_type}
                  </span>
                </td>
                <td className="p-3 text-right text-gray-500">
                  {acc.display_debit > 0
                    ? acc.display_debit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    : "—"}
                </td>
                <td className="p-3 text-right text-gray-500">
                  {acc.display_credit > 0
                    ? acc.display_credit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    : "—"}
                </td>
                {/* <td className={`p-3 text-right font-bold ${acc.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>{acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td> */}
                <td className="p-3 text-center font-sans">
                  <Link
                    href={`./chart-of-accounts/${acc.id}/edit`}
                    className="text-xs font-semibold text-gray-600 border px-2.5 py-1 rounded-md bg-white hover:bg-gray-50 shadow-sm transition"
                  >
                    Settings
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
import Link from "next/link";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_name?: string | null;

  display_debit: number;
  display_credit: number;
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Chart of Accounts</h2>

        <Link
          href="./chart-of-accounts/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Account
        </Link>
      </div>

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
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center p-6 text-gray-500">
                  No accounts found
                </td>
              </tr>
            )}

            {accounts.map((acc) => (
              <tr key={acc.id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-medium">{acc.code}</td>

                <td className="p-2">
                  <Link
                    href={`./chart-of-accounts/${acc.id}/ledger`}
                    className="text-blue-600 hover:underline"
                  >
                    {acc.name}
                  </Link>
                </td>

                <td className="p-2">{acc.account_type}</td>
                <td className="p-2">{acc.parent_name || "-"}</td>
                <td className="p-2 text-right">
                  {acc.display_debit > 0
                    ? formatCurrency(acc.display_debit)
                    : ""}
                </td>
                <td className="p-2 text-right">
                  {acc.display_credit > 0
                    ? formatCurrency(acc.display_credit)
                    : ""}
                </td>

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
} */

// total_debit: number;
// total_credit: number;
// balance: number;
{
  /* <th className="p-2 text-right">Balance</th> */
}
{
  /* <td className="p-2 text-right">
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

                </td> */
}

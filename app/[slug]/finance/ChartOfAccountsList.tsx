// app/components/finance/ChartOfAccountsList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LedgerDrilldownModal from "@/app/components/finance/LedgerDrilldownModal";
import { useLoader } from "@/app/context/LoaderContext";

interface GLAccountNode {
  id: string;
  code: string;
  name: string;
  gl_account_type:
    | "Category"
    | "Sub-Category"
    | "Heading"
    | "Posting"
    | "End Total";
  category_name?: string;
  sub_category_name?: string;
  vat_rate_name?: string;
  range_start_code?: string;
  range_end_code?: string;
  display_debit: number;
  display_credit: number;
}

export default function ChartOfAccountsList() {
  const [accounts, setAccounts] = useState<GLAccountNode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  // const [loading, setLoading] = useState(true);
  const { show, hide } = useLoader();

  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string; code: string } | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        show("Fetching Accounts...");
        const res = await fetch("/api/finance/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
        }
      } catch (err) {
        console.error(
          "Failed tracking internal ledger structure matrices.",
          err,
        );
      } finally {
        // setLoading(false);
        hide();
      }
    }
    loadAccounts();
  }, []);

  // Filter logic covering Code and Name properties
  const filteredAccounts = accounts.filter((acc) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term)
    );
  });

  // Balanced text and nesting indent utility classes for Light and Dark configurations
  const getRowStyle = (type: string) => {
    switch (type) {
      case "Category":
        return "bg-slate-50/70 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-xs tracking-wide";
      case "Sub-Category":
        return "font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-800/20";
      case "Heading":
        return "font-medium text-slate-700 dark:text-slate-300";
      case "End Total":
        return "font-bold text-slate-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/20 border-t border-b border-slate-200 dark:border-slate-700";
      default:
        return "text-slate-600 dark:text-slate-400 font-normal"; // Posting rows
    }
  };

  const getNameIndent = (type: string) => {
    switch (type) {
      case "Sub-Category":
        return "pl-4";
      case "Heading":
        return "pl-8";
      case "Posting":
        return "pl-12";
      case "End Total":
        return "pl-8 text-emerald-700 dark:text-emerald-400";
      default:
        return "pl-0 capitalize text-xs font-black tracking-wider text-indigo-600 dark:text-indigo-400";
    }
  };

  /* if (loading) {
    return (
      <div className="p-6 text-xs text-slate-400 dark:text-slate-500 animate-pulse font-sans">
        Parsing global ledger topology maps...
      </div>
    );
  } */

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors duration-200">
      {/* Upper Terminal Title Block */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            General Ledger Chart Structure
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage operational accounting structures and dynamic summary
            aggregation matrices.
          </p>
        </div>
        <Link
          href="./chart-of-accounts/create"
          className="bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow hover:bg-indigo-700 dark:hover:bg-indigo-600 transition tracking-wide shrink-0"
        >
          Add Account
        </Link>
      </div>

      {/* Control Terminal & Search Filter Input */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 flex items-center">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter accounts by key matching code or account name..."
            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3 py-2 pl-9 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition duration-150"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 text-xs pointer-events-none">
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <span className="ml-3 text-[11px] text-slate-400 dark:text-slate-500 italic">
            Found {filteredAccounts.length} accounts
          </span>
        )}
      </div>

      {/* Structured Multi-Tier Listing Grid View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px] capitalize tracking-wider">
              <th className="p-3 pl-4 w-[10%]">G/L No.</th>
              <th className="p-3 w-[25%]">Account Title Name</th>
              <th className="p-3 w-[12%]">Parent Class</th>
              <th className="p-3 w-[12%]">Sub-Category</th>
              <th className="p-3 w-[10%]">Assignment</th>
              <th className="p-3 w-[8%]">VAT Rule</th>
              <th className="p-3 w-[12%]">Calculation Range</th>
              <th className="p-3 text-right w-[10%]">Debit</th>
              <th className="p-3 text-right w-[10%]">Credit</th>
              <th className="p-3 text-center w-[6%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-sans">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-8 text-center text-slate-400 dark:text-slate-500 italic"
                >
                  No accounts found matching your filter options.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => {
                const rowStyles = getRowStyle(acc.gl_account_type);
                const indentClass = getNameIndent(acc.gl_account_type);

                return (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-200/50 dark:hover:bg-slate-800/30 transition-colors duration-100 ${rowStyles}`}
                  >
                    {/* Code Reference */}
                    <td className="p-3 pl-4 font-mono font-medium tracking-wide text-slate-900 dark:text-slate-200">
                      {acc.code}
                    </td>

                    {/* Indented Name Label */}
                    <td className="p-3 truncate">
                      {/* <div className={`${indentClass} truncate`}>
                        {acc.name}
                      </div> */}

                      <div className={`${indentClass} truncate`}>
                      {acc.gl_account_type === "Posting" ? (
                        <button
                          onClick={() => setSelectedAccount({ id: acc.id, name: acc.name, code: acc.code })}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-left transition"
                        >
                          {acc.name}
                        </button>
                      ) : (
                        acc.name
                      )}
                    </div>
                    </td>

                    {/* Core Class Hierarchy Context */}
                    <td className="p-3 text-slate-400 dark:text-slate-500 truncate">
                      {acc.category_name || "—"}
                    </td>

                    {/* Sub Category Context */}
                    <td className="p-3 text-slate-400 dark:text-slate-500 truncate">
                      {acc.sub_category_name || "—"}
                    </td>

                    {/* Type Badging */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${
                          acc.gl_account_type === "Posting"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
                            : acc.gl_account_type === "End Total"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {acc.gl_account_type}
                      </span>
                    </td>

                    {/* VAT Rate */}
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      {acc.vat_rate_name || "—"}
                    </td>

                    {/* Calculation range for rollups */}
                    <td className="p-3 font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                      {/* {acc.gl_account_type === "End Total" ||
                      acc.gl_account_type === "Heading" ||
                      acc.gl_account_type === "Category"
                        ? `${acc.range_start_code || acc.code} → ${acc.range_end_code || "EOF"}`
                        : "—"} */}

                      {["End Total", "Heading", "Category"].includes(
                        acc.gl_account_type,
                      )
                        ? `${acc.range_start_code || acc.code} → ${acc.range_end_code || "EOF"}`
                        : "—"}
                    </td>

                    {/* Total Debit Balance */}
                    <td className="p-3 text-right font-mono font-medium text-slate-900 dark:text-slate-200">
                      {acc.display_debit > 0
                        ? acc.display_debit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </td>

                    {/* Total Credit Balance */}
                    <td className="p-3 text-right font-mono font-medium text-slate-900 dark:text-slate-200">
                      {acc.display_credit > 0
                        ? acc.display_credit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </td>

                    {/* Operational Settings Trigger Modifier */}
                    <td className="p-3 text-center">
                      <Link
                        href={`./chart-of-accounts/${acc.id}/edit`}
                        className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center justify-center w-7 h-7 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow transition-all"
                        title="Edit Account Layout Configurations"
                      >
                        ⚙️
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Render overlay modal portal frame safely when requested */}
      {selectedAccount && (
        <LedgerDrilldownModal
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountCode={selectedAccount.code}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}

/* "use client";

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
      <div className="p-6 text-xs text-gray-500 animate-pulse">
        Assembling account balance structures...
      </div>
    );

  return (
    <div className="bg-white dark:bg-slate-900 text-black dark:text-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold ">General Ledger Mappings</h2>
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
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 font-semibold border-b text-left">
              <th className="p-3 pl-6">Code</th>
              <th className="p-3">Account Title</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Debit Vector</th>
              <th className="p-3 text-right">Credit Vector</th>
       
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
} */

// app/components/finance/ChartOfAccountsList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LedgerDrilldownModal from "@/app/components/finance/LedgerDrilldownModal";
import { useLoader } from "@/app/context/LoaderContext";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

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
  const { show, hide } = useLoader();

  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

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
        hide();
      }
    }
    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter((acc) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term)
    );
  });

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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors duration-200">
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

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800  text-white rounded"
        >
          <Link href="./chart-of-accounts/create">
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
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
                    <td className="p-3 pl-4 font-mono font-medium tracking-wide text-slate-900 dark:text-slate-200">
                      {acc.code}
                    </td>

                    <td className="p-3 truncate">
                      <div className={`${indentClass} truncate`}>
                        {acc.gl_account_type === "Posting" ? (
                          <button
                            onClick={() =>
                              setSelectedAccount({
                                id: acc.id,
                                name: acc.name,
                                code: acc.code,
                              })
                            }
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-left transition"
                          >
                            {acc.name}
                          </button>
                        ) : (
                          acc.name
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-slate-400 dark:text-slate-500 truncate">
                      {acc.category_name || "—"}
                    </td>

                    <td className="p-3 text-slate-400 dark:text-slate-500 truncate">
                      {acc.sub_category_name || "—"}
                    </td>

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

                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      {acc.vat_rate_name || "—"}
                    </td>

                    <td className="p-3 font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                      {["End Total", "Heading", "Category"].includes(
                        acc.gl_account_type,
                      )
                        ? `${acc.range_start_code || acc.code} → ${acc.range_end_code || "EOF"}`
                        : "—"}
                    </td>

                    <td className="p-3 text-right font-mono font-medium text-slate-900 dark:text-slate-200">
                      {acc.display_debit > 0
                        ? acc.display_debit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </td>

                    <td className="p-3 text-right font-mono font-medium text-slate-900 dark:text-slate-200">
                      {acc.display_credit > 0
                        ? acc.display_credit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </td>

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

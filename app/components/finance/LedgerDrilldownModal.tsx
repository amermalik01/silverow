// app/components/finance/LedgerDrilldownModal.tsx

"use client";

import { useEffect, useState } from "react";

interface LedgerRow {
  id: string;
  posting_date: string;
  document_type: string;
  document_no: string;
  gl_no: string;
  source_no: string;
  name: string;
  posting_group: string;
  debit: string | number;
  credit: string | number;
  amount: string | number;
  balancing_account_type: string;
  balancing_account_no: string;
  balancing_account_name: string;
  posted_by: string;
}

interface ModalProps {
  accountId: string;
  accountName: string;
  accountCode: string;
  onClose: () => void;
}

export default function LedgerDrilldownModal({
  accountId,
  accountName,
  accountCode,
  onClose,
}: ModalProps) {
  const [data, setData] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Column Level Filter Controls
  const [filters, setFilters] = useState({
    posting_date: "",
    document_type: "",
    document_no: "",
    gl_no: "",
    source_no: "",
    name: "",
    posting_group: "",
    debit: "",
    credit: "",
    amount: "",
  });

  useEffect(() => {
    async function fetchLedger() {
      try {
        const res = await fetch(`/api/finance/accounts/${accountId}/ledger`);
        if (res.ok) {
          const rows = await res.json();
          setData(rows);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLedger();
  }, [accountId]);

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value.toLowerCase() }));
  };

  const filteredData = data.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const rowValue = String(row[key as keyof LedgerRow] || "").toLowerCase();
      return rowValue.includes(value);
    });
  });

  // Structural aggregates matching legacy balances footer
  const totalDebit = filteredData.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0,
  );
  const totalCredit = filteredData.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0,
  );
  const balanceAmount = totalDebit - totalCredit;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {accountCode} - {accountName}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-sans text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Parsing database ledger lines...
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px] min-w-[1400px]">
                <thead>
                  {/* Action Header Fields matching legacy style icons */}
                  <tr className="bg-emerald-800 text-white font-medium">
                    <th colSpan={14} className="p-2 pl-3">
                      <div className="flex gap-2 text-xs">
                        <button className="hover:opacity-80">⚙️</button>
                        <button className="hover:opacity-80">⏳</button>
                        <button className="hover:opacity-80">📂</button>
                      </div>
                    </th>
                  </tr>
                  {/* Main Title Columns */}
                  <tr className="bg-emerald-800 text-white font-bold tracking-wide border-b border-emerald-700">
                    <th className="p-2 border-r border-emerald-700">
                      Posting Date
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Document Type
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Document No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">G/L No.</th>
                    <th className="p-2 border-r border-emerald-700">
                      Source No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">Name</th>
                    <th className="p-2 border-r border-emerald-700">
                      Posting Group
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Debit
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Credit
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Amount
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing Account Type
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing Account No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing Account Name
                    </th>
                    <th className="p-2">Posted By</th>
                  </tr>
                  {/* Dynamic Legacy Filtering Row Input Layer */}
                  <tr className="bg-emerald-900 border-b border-emerald-800">
                    {Object.keys(filters).map((col) => (
                      <td key={col} className="p-1 border-r border-emerald-800">
                        <input
                          type="text"
                          placeholder="From..To"
                          onChange={(e) =>
                            handleFilterChange(col, e.target.value)
                          }
                          className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                        />
                      </td>
                    ))}
                    <td colSpan={4} className="bg-emerald-900"></td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        No historical records matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono"
                      >
                        <td className="p-2 border-r dark:border-slate-800 whitespace-nowrap">
                          {new Date(row.posting_date).toLocaleDateString(
                            "en-GB",
                          )}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.document_type}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100">
                          {row.document_no}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.gl_no}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.source_no || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 truncate max-w-[200px]">
                          {row.name || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.posting_group || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-right text-blue-600 dark:text-blue-400">
                          {Number(row.debit) > 0
                            ? Number(row.debit).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })
                            : ""}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-right text-red-600 dark:text-red-400">
                          {Number(row.credit) > 0
                            ? Number(row.credit).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })
                            : ""}
                        </td>
                        <td
                          className={`p-2 border-r dark:border-slate-800 text-right font-semibold ${Number(row.amount) >= 0 ? "text-slate-800 dark:text-slate-200" : "text-red-500"}`}
                        >
                          (
                          {Number(row.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                          )
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.balancing_account_type || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.balancing_account_no || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-slate-400">
                          {row.balancing_account_name || "-"}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {row.posted_by}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Balanced Footer Layout Context */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center flex-wrap gap-2 text-xs font-mono">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Showing {filteredData.length} of {data.length} Records
          </div>
          <div className="flex gap-6 text-slate-900 dark:text-slate-100 font-bold">
            <div>
              Debit Total:{" "}
              <span className="text-blue-600">
                {totalDebit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div>
              Credit Total:{" "}
              <span className="text-red-600">
                {totalCredit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="border-l pl-6 border-slate-300 dark:border-slate-700">
              Balance:{" "}
              <span
                className={
                  balanceAmount >= 0 ? "text-emerald-600" : "text-red-500"
                }
              >
                {balanceAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                (FCY)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-800 hover:opacity-80 px-4 py-1 rounded font-sans text-[11px] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

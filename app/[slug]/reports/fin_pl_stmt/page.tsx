// app/[slug]/reports/fin_pl_stmt/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";

import {
  AccountOption,
  ReportFilters,
} from "@/app/components/reports/ReportFilters";
import { Loader2, Play } from "lucide-react";

interface PLReportRow {
  accountCode: string | null;
  accountName: string;
  rowType: "data" | "section_total" | "grand_total" | "calculated_group";
  section:
    | "turnover"
    | "cost_of_sales"
    | "expenses"
    | "gross_profit"
    | "net_profit";
  level: number;
  amount: number;
  percentageOfTurnover: number;
}

export default function ProfitAndLossReport() {
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  // Custom states matching the legacy screenshot checkboxes
  const [showPercentage, setShowPercentage] = useState(true);
  const [comparePrior, setComparePrior] = useState(false);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [tableData, setTableData] = useState<PLReportRow[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<AccountOption[]>(
    [],
  );
  const [hasGenerated, setHasGenerated] = useState(false);

  // Load dropdown options safely on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/api/reports/accounts-options");
        if (response.ok) {
          const data = await response.json();
          setAvailableAccounts(data);
        }
      } catch (err) {
        console.error("Error loading account codes:", err);
      }
    }
    loadOptions();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setIsLoadingTable(true);
      setHasGenerated(true);

      const response = await fetch("/api/reports/profit-loss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          fromAccount,
          toAccount,
          format: "json",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch P&L dataset.");
      const data = await response.json();
      setTableData(data);
    } catch (err) {
      console.error(err);
      alert("Error generating on-screen P&L layout.");
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleExport = async (exportFormat: "pdf" | "xlsx") => {
    if (!hasGenerated) {
      alert("Please generate the report on-screen before exporting files.");
      return;
    }
    try {
      setIsProcessing(exportFormat);
      const response = await fetch("/api/reports/profit-loss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          fromAccount,
          toAccount,
          format: exportFormat,
        }),
      });

      if (!response.ok)
        throw new Error("Failed to generate document binary stream.");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (exportFormat === "pdf") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute(
          "download",
          `Profit_and_Loss_${fromDate}_to_${toDate}.xlsx`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing your file download request.");
    } finally {
      setIsProcessing(null);
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return "—";
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `(${formatted})` : formatted;
  };

  const formatPercent = (val: number) => {
    if (val === 0 || !val) return "—";
    return `${val.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="Profit and Loss Statement"
        subtitle="Income performance and expenditure summary balance metrics"
        onExportPdf={() => handleExport("pdf")}
        onExportExcel={() => handleExport("xlsx")}
        isProcessing={isProcessing}
      />

      <ReportFilters
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        fromAccount={fromAccount}
        setFromAccount={setFromAccount}
        toAccount={toAccount}
        setToAccount={setToAccount}
        showBalances={showPercentage}
        setShowBalances={setShowPercentage}
        accountsList={availableAccounts}
        onGenerate={handleGenerateReport}
        onClear={() => {
          setFromAccount("");
          setToAccount("");
          setTableData([]);
          setHasGenerated(false);
        }}
      >
        {/* Inject customized left checkboxes to exactly mimic the legacy system screenshot layout */}
        <div className="flex flex-col space-y-2 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer select-none text-xs text-emerald-200 hover:text-white transition">
            <input
              type="checkbox"
              checked={showPercentage}
              onChange={(e) => setShowPercentage(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-700 bg-white/10 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-medium">Show % of Total Turnover</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer select-none text-xs text-emerald-200 hover:text-white transition">
            <input
              type="checkbox"
              checked={comparePrior}
              onChange={(e) => setComparePrior(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-700 bg-white/10 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-medium">Compare With Prior Period</span>
          </label>
        </div>
      </ReportFilters>

      {/* Main Statement Presenter Canvas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative">
        {isLoadingTable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Calculating Income Balances...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold">
                <th className="px-4 py-3 text-left">Account Description</th>
                <th className="px-4 py-3 text-right w-44">Selected Period</th>
                {showPercentage && (
                  <th className="px-4 py-3 text-right w-36">% of Turnover</th>
                )}
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-mono text-[11px]">
                <th className="px-4 py-1.5 font-normal text-left">
                  Statement Structure Grid Node
                </th>
                <th className="px-4 py-1.5 font-normal text-right">
                  {fromDate} - {toDate}
                </th>
                {showPercentage && (
                  <th className="px-4 py-1.5 font-normal text-right">
                    Net Performance
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {!hasGenerated ? (
                <tr>
                  <td
                    colSpan={showPercentage ? 3 : 2}
                    className="text-center py-20 text-slate-400 font-normal"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <p className="text-sm font-semibold text-slate-700">
                        Statement Ready to Compile
                      </p>
                      <p className="text-xs text-slate-400">
                        Click{" "}
                        <strong className="text-emerald-700">
                          Generate Report
                        </strong>{" "}
                        to fetch live ledger transaction lines and map your
                        operational profit metrics.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map((row, index) => {
                  // Determine visual row weight styles depending on the accounting structural importance
                  let rowStyle = "hover:bg-slate-50/40 font-normal";
                  if (row.rowType === "section_total") {
                    rowStyle =
                      "bg-slate-50/70 font-bold text-slate-900 border-t border-slate-200";
                  } else if (
                    row.rowType === "calculated_group" ||
                    row.rowType === "grand_total"
                  ) {
                    rowStyle =
                      "bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 border-b-4 border-double border-slate-400 uppercase tracking-wide text-[11px]";
                  }

                  return (
                    <tr
                      key={`${row.accountCode || ""}-${row.accountName}-${index}`}
                      className={rowStyle}
                    >
                      <td
                        className="px-4 py-2.5 text-left transition-all"
                        style={{ paddingLeft: `${row.level * 16 + 16}px` }}
                      >
                        {row.accountCode && (
                          <span className="font-mono text-slate-400 mr-3 text-[11px] font-normal">
                            {row.accountCode}
                          </span>
                        )}
                        <span>{row.accountName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        {formatCurrency(row.amount)}
                      </td>
                      {showPercentage && (
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500 font-semibold">
                          {formatPercent(row.percentageOfTurnover)}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={showPercentage ? 3 : 2}
                    className="text-center py-12 text-slate-400"
                  >
                    No matching general ledger entry allocations observed for
                    this range criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

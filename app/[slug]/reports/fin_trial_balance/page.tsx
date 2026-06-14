// app/[slug]/reports/fin_trial_balance/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";

import {
  AccountOption,
  ReportFilters,
} from "@/app/components/reports/ReportFilters";
import { Loader2, Play } from "lucide-react";

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  isSummary: boolean;
  level: number;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export default function TrialBalanceReport() {
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [viewType, setViewType] = useState<"summary" | "detailed">("summary");
  const [showBalances, setShowBalances] = useState(true);


  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [tableData, setTableData] = useState<TrialBalanceRow[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<AccountOption[]>(
    [],
  );

  const [hasGenerated, setHasGenerated] = useState(false);

  // 1. Fetch G/L Account drop-down options on component mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/api/reports/accounts-options");
        if (response.ok) {
          const data = await response.json();
          setAvailableAccounts(data);
        }
      } catch (err) {
        console.error("Error loading account dropdown list:", err);
      }
    }
    loadOptions();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setIsLoadingTable(true);
      setHasGenerated(true); // Flag that user explicitly ran the filter criteria

      const response = await fetch("/api/reports/trial-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          fromAccount,
          toAccount,
          viewType,
          format: "json",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch report data.");

      const data = await response.json();
      setTableData(data);
    } catch (err) {
      console.error(err);
      alert("Error generating on-screen report layout.");
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
      const response = await fetch("/api/reports/trial-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          fromAccount,
          toAccount,
          viewType,
          format: exportFormat,
        }),
      });

      if (!response.ok)
        throw new Error("Failed to generate binary report stream.");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (exportFormat === "pdf") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute(
          "download",
          `Trial_Balance_${fromDate}_to_${toDate}.xlsx`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing your print template stream request.");
    } finally {
      setIsProcessing(null);
    }
  };

  const formatCurrency = (val: number) =>
    val === 0
      ? "—"
      : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(
          val,
        );

  // Dynamic summary aggregations across current live records
  const totalOpeningDebit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.openingDebit) : 0),
    0,
  );
  const totalOpeningCredit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.openingCredit) : 0),
    0,
  );
  const totalPeriodDebit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.periodDebit) : 0),
    0,
  );
  const totalPeriodCredit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.periodCredit) : 0),
    0,
  );
  const totalClosingDebit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.closingDebit) : 0),
    0,
  );
  const totalClosingCredit = tableData.reduce(
    (acc, r) => acc + (r.level === 0 ? Number(r.closingCredit) : 0),
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="Trial Balance Ledger"
        subtitle="Multi-period ledger performance verification"
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
        showBalances={showBalances}
        setShowBalances={setShowBalances}
        accountsList={availableAccounts}
        onGenerate={handleGenerateReport}
        onClear={() => {
          setFromAccount("");
          setToAccount("");
          setTableData([]);
          setHasGenerated(false);
        }}
        hideFromDate={false}          // Clean presentation mode flag
        showAccountRanges={true}    // Clean dropdown visibility flag
        showOpeningClosingToggle={true}
        
      >
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-emerald-300">
            Format Depth
          </label>
          <select
            value={viewType}
            onChange={(e) =>
              setViewType(e.target.value as "summary" | "detailed")
            }
            className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900"
          >
            <option value="summary" className="text-slate-900">
              Summary Layout
            </option>
            <option value="detailed" className="text-slate-900">
              Detailed Layout
            </option>
          </select>
        </div>
      </ReportFilters>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative">
        {isLoadingTable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Compiling ledger window...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold text-center">
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left border-r border-slate-200 w-24"
                >
                  G/L No.
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left border-r border-slate-200"
                >
                  Account Name
                </th>
                {showBalances && (
                  <th
                    colSpan={2}
                    className="px-4 py-1.5 border-b border-slate-200 border-r border-slate-200"
                  >
                    Opening Balance
                  </th>
                )}
                <th
                  colSpan={2}
                  className="px-4 py-1.5 border-b border-slate-200 border-r border-slate-200"
                >
                  Selected Period
                </th>
                {showBalances && (
                  <th
                    colSpan={2}
                    className="px-4 py-1.5 border-b border-slate-200"
                  >
                    Closing Balance
                  </th>
                )}
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-right">
                {showBalances && (
                  <>
                    <th className="px-4 py-2 border-r border-slate-200 w-28">
                      Debit
                    </th>
                    <th className="px-4 py-2 border-r border-slate-200 w-28">
                      Credit
                    </th>
                  </>
                )}
                <th className="px-4 py-2 border-r border-slate-200 w-28">
                  Debit
                </th>
                <th className="px-4 py-2 border-r border-slate-200 w-28">
                  Credit
                </th>
                {showBalances && (
                  <>
                    <th className="px-4 py-2 border-r border-slate-200 w-28">
                      Debit
                    </th>
                    <th className="px-4 py-2 w-28">Credit</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono text-right">
              {!hasGenerated ? (
                /* Initial state before user hits generate */
                <tr>
                  <td
                    colSpan={showBalances ? 8 : 4}
                    className="text-center py-16 text-slate-400 font-sans font-normal"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div className="p-3 rounded-full bg-slate-50 border border-slate-200 text-slate-400">
                        <Play className="h-5 w-5 fill-current text-slate-400 ml-0.5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        Report Ready to Generate
                      </p>
                      <p className="text-xs text-slate-400">
                        Select your ledger dates and account parameters above,
                        then click{" "}
                        <strong className="text-emerald-700">
                          Generate Report
                        </strong>{" "}
                        to populate the workspace statement.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                /* Active loaded database state */
                tableData.map((row) => (
                  <tr
                    key={row.accountCode}
                    className={
                      row.isSummary
                        ? row.level === 0
                          ? "bg-slate-50 font-bold text-slate-900 border-t border-slate-200"
                          : "bg-white font-semibold text-slate-800"
                        : "hover:bg-slate-50/40"
                    }
                  >
                    <td className="px-4 py-2 text-left text-slate-500 font-normal">
                      {row.accountCode}
                    </td>
                    <td
                      className="px-4 py-2 text-left font-sans border-r border-slate-200"
                      style={{ paddingLeft: `${row.level * 12 + 16}px` }}
                    >
                      {row.accountName}
                    </td>

                    {showBalances && (
                      <>
                        <td className="px-4 py-2 border-r border-slate-200">
                          {formatCurrency(row.openingDebit)}
                        </td>
                        <td className="px-4 py-2 border-r border-slate-200 text-red-600">
                          {formatCurrency(row.openingCredit)}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-2 border-r border-slate-200">
                      {formatCurrency(row.periodDebit)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 text-red-600">
                      {formatCurrency(row.periodCredit)}
                    </td>

                    {showBalances && (
                      <>
                        <td className="px-4 py-2 border-r border-slate-200">
                          {formatCurrency(row.closingDebit)}
                        </td>
                        <td className="px-4 py-2 text-red-600">
                          {formatCurrency(row.closingCredit)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                /* User clicked generate, but database has no ledger results */
                <tr>
                  <td
                    colSpan={showBalances ? 8 : 4}
                    className="text-center py-12 text-slate-400 font-sans font-normal"
                  >
                    No accounting records found matching current query
                    boundaries.
                  </td>
                </tr>
              )}

              {/* Dynamic Bottom Totals Row Block */}
              {hasGenerated && tableData.length > 0 && (
                <tr className="bg-slate-100 font-bold border-t border-slate-300 border-b-4 border-double border-slate-400">
                  <td
                    colSpan={2}
                    className="px-4 py-2.5 text-left font-sans text-slate-900 uppercase tracking-wider text-[10px]"
                  >
                    Balanced Ledger Total
                  </td>
                  {showBalances && (
                    <>
                      <td className="px-4 py-2.5 border-r border-slate-200">
                        {formatCurrency(totalOpeningDebit)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-red-600">
                        {formatCurrency(totalOpeningCredit)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 border-r border-slate-200">
                    {formatCurrency(totalPeriodDebit)}
                  </td>
                  <td className="px-4 py-2.5 border-r border-slate-200 text-red-600">
                    {formatCurrency(totalPeriodCredit)}
                  </td>
                  {showBalances && (
                    <>
                      <td className="px-4 py-2.5 border-r border-slate-200">
                        {formatCurrency(totalClosingDebit)}
                      </td>
                      <td className="px-4 py-2.5 text-red-600">
                        {formatCurrency(totalClosingCredit)}
                      </td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

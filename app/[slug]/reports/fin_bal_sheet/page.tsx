// app/[slug]/reports/fin_bal_sheet/page.tsx

"use client";

import React, { useState } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { ReportFilters } from "@/app/components/reports/ReportFilters";
import { Loader2 } from "lucide-react";

interface BSReportRow {
  accountCode: string | null;
  accountName: string;
  rowType: "data" | "section_total" | "grand_total" | "calculated_group";
  section: "asset" | "liability" | "equity" | "total_liabilities_equity";
  level: number;
  amount: number;
  priorAmount: number; // Added to hold comparison values
}

export default function BalanceSheetReport() {
  const [fromDate, setFromDate] = useState(""); // Unused but passed to satisfy component skeleton signature
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [comparePrior, setComparePrior] = useState(true);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [tableData, setTableData] = useState<BSReportRow[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const getPriorPeriodDateString = (currentDateStr: string) => {
    if (!currentDateStr) return "";
    const date = new Date(currentDateStr);
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  };

  const handleGenerateReport = async () => {
    try {
      setIsLoadingTable(true);
      setHasGenerated(true);

      const response = await fetch("/api/reports/balance-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asOfDate: toDate,
          comparePrior: comparePrior,
          format: "json",
        }),
      });

      if (!response.ok)
        throw new Error("Failed to fetch Balance Sheet dataset.");
      const data = await response.json();
      setTableData(data);
    } catch (err) {
      console.error(err);
      alert("Error generating on-screen Balance Sheet statement.");
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
      const response = await fetch("/api/reports/balance-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asOfDate: toDate,
          comparePrior: comparePrior,
          format: exportFormat,
        }),
      });

      if (!response.ok)
        throw new Error("Failed to generate template binary stream.");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (exportFormat === "pdf") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute(
          "download",
          `Balance_Sheet_${toDate}.${exportFormat}`,
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

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="Balance Sheet Statement"
        subtitle="Statement of financial position reflecting assets, liabilities, and equity net worth capitalization"
        onExportPdf={() => handleExport("pdf")}
        onExportExcel={() => handleExport("xlsx")}
        isProcessing={isProcessing}
      />

      <ReportFilters
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        onGenerate={handleGenerateReport}
        onClear={() => {
          setTableData([]);
          setHasGenerated(false);
        }}
        hideFromDate={true}
        showAccountRanges={false}
        showOpeningClosingToggle={false}
      >
        {/* Dynamic Context Custom Slot to match the exact checkbox list inside the filter banner */}
        <div className="flex flex-col space-y-1 pt-1">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none text-xs text-emerald-200 hover:text-white transition">
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

      {/* Sheet Presentation Board Canvas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative">
        {isLoadingTable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Calculating Comparative Balances...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold text-right">
                <th className="px-4 py-3 text-left">
                  Financial Statement Group
                </th>
                <th className="px-4 py-3 w-44 border-l border-slate-200">
                  Selected Period
                </th>
                {comparePrior && (
                  <th className="px-4 py-3 w-44 border-l border-slate-200">
                    Prior Period
                  </th>
                )}
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-mono text-[11px] text-right">
                <th className="px-4 py-1.5 font-normal text-left">
                  General Ledger Asset & Liability Classes
                </th>
                <th className="px-4 py-1.5 font-normal border-l border-slate-100">
                  {toDate}
                </th>
                {comparePrior && (
                  <th className="px-4 py-1.5 font-normal border-l border-slate-100">
                    {getPriorPeriodDateString(toDate)}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {!hasGenerated ? (
                <tr>
                  <td
                    colSpan={comparePrior ? 3 : 2}
                    className="text-center py-20 text-slate-400 font-normal"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <p className="text-xs font-semibold text-slate-700">
                        Statement Ready to Compile
                      </p>
                      <p className="text-xs text-slate-400">
                        Click{" "}
                        <strong className="text-emerald-700">
                          Generate Report
                        </strong>{" "}
                        to snapshot your comparative financial position values.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map((row, index) => {
                  let rowStyle = "hover:bg-slate-50/40 font-normal";

                  if (row.rowType === "section_total") {
                    rowStyle =
                      "bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200";
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
                        className={`px-4 py-2 text-left ${row.rowType === "section_total" ? "font-bold" : ""}`}
                        style={{ paddingLeft: `${row.level * 16 + 16}px` }}
                      >
                        {row.accountCode && (
                          <span className="font-mono text-slate-400 mr-3 text-[11px] font-normal">
                            {row.accountCode}
                          </span>
                        )}
                        <span>{row.accountName}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium border-l border-slate-100">
                        {/* Summary headers with no child entries display blank fields matching legacy layout */}
                        {row.rowType === "section_total" &&
                        row.accountCode === null &&
                        row.amount === 0
                          ? ""
                          : formatCurrency(row.amount)}
                      </td>
                      {comparePrior && (
                        <td className="px-4 py-2 text-right font-mono font-medium border-l border-slate-100 text-slate-600">
                          {row.rowType === "section_total" &&
                          row.accountCode === null &&
                          row.priorAmount === 0
                            ? ""
                            : formatCurrency(row.priorAmount)}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={comparePrior ? 3 : 2}
                    className="text-center py-12 text-slate-400"
                  >
                    No ledger entry tracking records observed matching this
                    snapshot cutoff parameters.
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

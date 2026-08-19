// app/[slug]/reports/fin_fig_gl/page.tsx

"use client";

import React, { useState } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { ReportFilters } from "@/app/components/reports/ReportFilters";
import { Loader2, Search, X } from "lucide-react";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import { Button } from "@/components/ui/button";

interface TransactionLine {
  postingDate: string;
  documentType: string;
  documentNo: string;
  sourceNo: string;
  name: string;
  employee: string | null;
  amount: number;
  entryNo: number;
}

interface GLGroupBlock {
  accountId: string;
  accountCode: string;
  accountName: string;
  lines: TransactionLine[];
  totalAmount: number;
}

export default function FigureByGLReport() {
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-06-14");
  const [reportType, setReportType] = useState("Detailed");

  // State handling for lookup modal array arrays
  const [selectedGLs, setSelectedGLs] = useState<GLAccountLookupRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [reportGroups, setReportGroups] = useState<GLGroupBlock[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateReport = async () => {
    if (selectedGLs.length === 0) {
      alert("Please select at least one General Ledger account context.");
      return;
    }

    try {
      setIsLoadingTable(true);
      setHasGenerated(true);

      const response = await fetch("/api/reports/figure-by-gl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          reportType,
          accountIds: selectedGLs.map((g) => g.id),
          format: "json",
        }),
      });

      if (!response.ok)
        throw new Error("Failed to fetch G/L figures tracking rows.");
      const data = await response.json();
      setReportGroups(data);
    } catch (err) {
      console.error(err);
      alert("Error compiling transactional general ledger statements.");
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleExport = async (exportFormat: "pdf" | "xlsx") => {
    if (!hasGenerated || reportGroups.length === 0) {
      alert(
        "Please generate layout streams on-screen before extracting files.",
      );
      return;
    }
    try {
      setIsProcessing(exportFormat);
      const response = await fetch("/api/reports/figure-by-gl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          reportType,
          accountIds: selectedGLs.map((g) => g.id),
          format: exportFormat,
        }),
      });

      if (!response.ok) throw new Error("File conversion runtime exception.");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (exportFormat === "pdf") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `Figure_By_GL_${toDate}.${exportFormat}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const removeGLChip = (id: string) => {
    setSelectedGLs((prev) => prev.filter((item) => item.id !== id));
  };

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `(${formatted})` : formatted;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="Figure By G/L"
        subtitle="Granular analysis of individual transaction history entries grouped by chosen accounts"
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
          setReportGroups([]);
          setSelectedGLs([]);
          setHasGenerated(false);
        }}
        showAccountRanges={false}
        showOpeningClosingToggle={false}
      >
        {/* Row 1 Custom Fields Injection - Matching Image Fields */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-emerald-300">
            Select G/L No.(s)
          </label>
          <div
            onClick={() => setIsModalOpen(true)}
            className="h-9 w-full rounded border-0 bg-white/10 px-3 flex items-center justify-between cursor-pointer text-xs text-emerald-100 hover:bg-white/15 ring-1 ring-white/20"
          >
            <span className="truncate">
              {selectedGLs.length === 0
                ? "Click to lookup accounts..."
                : `${selectedGLs.length} Selected`}
            </span>
            <Search className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 ml-1" />
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-emerald-300">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
          >
            <option value="Detailed" className="text-slate-900">
              Detailed
            </option>
            <option value="Summary" className="text-slate-900">
              Summary
            </option>
          </select>
        </div>
      </ReportFilters>

      {/* Selected Account Chips Panel */}
      {selectedGLs.length > 0 && (
        <div className="mb-6 p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold text-slate-400 capitalize mr-1 tracking-wider">
            Targets:
          </span>
          {selectedGLs.map((gl) => (
            <div
              key={gl.id}
              className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 font-medium font-mono"
            >
              <span>
                {gl.code} - {gl.name}
              </span>
              <button
                onClick={() => removeGLChip(gl.id)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Report Panel Loops Stack */}
      <div className="space-y-8 relative">
        {isLoadingTable && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Scanning Audit Ledger Lines...</span>
            </div>
          </div>
        )}

        {!hasGenerated ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-20 text-center text-slate-400 shadow-sm">
            <p className="text-xs font-semibold text-slate-700">
              Account Statements Idle
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Configure your targets and select{" "}
              <strong className="text-emerald-700">Generate Report</strong> to
              build audit panels.
            </p>
          </div>
        ) : reportGroups.length > 0 ? (
          reportGroups.map((group) => (
            <div
              key={group.accountId}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Header Box Panel block matching legacy layout metadata labels */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Figure By G/L
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500 font-bold bg-white border px-2 py-0.5 rounded shadow-sm">
                    {group.accountCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-500 font-medium pt-1 max-w-xl">
                  <div>
                    <span className="font-semibold text-slate-400">
                      G/L No.:
                    </span>{" "}
                    {group.accountCode}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">
                      G/L Name:
                    </span>{" "}
                    {group.accountName}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-400">
                      Posting Date From:
                    </span>{" "}
                    {fromDate} to {toDate}
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Panel Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold">
                      <th className="px-4 py-2 w-28">Posting Date</th>
                      <th className="px-4 py-2 w-36">Document Type</th>
                      <th className="px-4 py-2 w-32">Document No.</th>
                      <th className="px-4 py-2 w-28">Source No.</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2 w-28">Employee</th>
                      <th className="px-4 py-2 text-right w-36">Amount</th>
                      <th className="px-4 py-2 text-center w-24">Entry No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono text-[11px]">
                    {group.lines.length > 0 ? (
                      group.lines.map((line) => (
                        <tr
                          key={line.entryNo}
                          className="hover:bg-slate-50/60 transition font-normal text-slate-600"
                        >
                          <td className="px-4 py-2">{line.postingDate}</td>
                          <td className="px-4 py-2 font-sans font-medium text-slate-800">
                            {line.documentType}
                          </td>
                          <td className="px-4 py-2">{line.documentNo}</td>
                          <td className="px-4 py-2">{line.sourceNo}</td>
                          <td className="px-4 py-2 font-sans font-medium text-slate-700 truncate max-w-xs">
                            {line.name}
                          </td>
                          <td className="px-4 py-2 font-sans">
                            {line.employee || "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900">
                            {formatCurrency(line.amount)}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-400">
                            {line.entryNo}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-6 text-slate-400 font-sans font-normal italic"
                        >
                          No posted line items matches found across this target
                          range parameter.
                        </td>
                      </tr>
                    )}
                    {/* Total summary grouping foot segment matching report snapshot views */}
                    <tr className="bg-slate-50/50 font-bold font-sans text-xs text-slate-900 border-t border-slate-200">
                      <td
                        colSpan={6}
                        className="px-4 py-2.5 text-right font-bold capitalize tracking-wide text-slate-500 text-[10px]"
                      >
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {formatCurrency(group.totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400">
            No journal allocations matched against targeted dimensions.
          </div>
        )}
      </div>

      {/* Lookup Account Modal Integration */}
      <GLAccountLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(gl: GLAccountLookupRecord) => {
          // Prevent appending duplicate lookup records
          if (!selectedGLs.some((item) => item.id === gl.id)) {
            setSelectedGLs((prev) => [...prev, gl]);
          }
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

// app/[slug]/reports/fin_haulier_accr/page.tsx

"use client";

import React, { useState } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { ReportFilters } from "@/app/components/reports/ReportFilters";
import { Loader2, Search, X } from "lucide-react";
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

interface AccrualLine {
  id: string;
  haulierNo: string;
  haulierName: string;
  documentNo: string;
  postingDate: string;
  accrualAmount: number;
  clearedAmount: number;
  remainingAccrued: number;
  glAccountCode: string;
}

export default function HaulierAccrualsReport() {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-14");
  const [selectedGLs, setSelectedGLs] = useState<GLAccountLookupRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [lines, setLines] = useState<AccrualLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { show, hide } = useLoader();

  const handleGenerate = async () => {
    if (selectedGLs.length === 0) {
      alert("Please select at least one target G/L Account.");
      return;
    }
    try {
      setIsLoading(true);
      setHasGenerated(true);
      const response = await fetch("/api/reports/haulier-accruals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          accountIds: selectedGLs.map((g) => g.id),
          format: "json",
        }),
      });

      if (!response.ok)
        throw new Error("Failed to download ledger accrual matrices.");
      const data = await response.json();
      setLines(data);
    } catch (err) {
      console.error(err);
      alert("Error compiling metrics lines.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    if (lines.length === 0) {
      alert(
        "No data lines found to capture. Generate the dataset view frame first.",
      );
      return;
    }
    try {
      setIsProcessing(format);
      const response = await fetch("/api/reports/haulier-accruals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          accountIds: selectedGLs.map((g) => g.id),
          format,
        }),
      });

      if (!response.ok) throw new Error("File download processing timeout.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (format === "pdf") {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Haulier_Accruals_${toDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `(${formatted})` : formatted;
  };

  // Compute column balances
  const totalAccrual = lines.reduce((sum, item) => sum + item.accrualAmount, 0);
  const totalCleared = lines.reduce((sum, item) => sum + item.clearedAmount, 0);
  const totalRemaining = lines.reduce(
    (sum, item) => sum + item.remainingAccrued,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="Haulier Accruals"
        subtitle="Review outstanding balancing logistics provisions matching sub-ledger tracking rows"
        onExportPdf={() => handleExport("pdf")}
        onExportExcel={() => handleExport("xlsx")}
        isProcessing={isProcessing}
      />

      <ReportFilters
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        onGenerate={handleGenerate}
        onClear={() => {
          setLines([]);
          setSelectedGLs([]);
          setHasGenerated(false);
        }}
        showAccountRanges={false}
        showOpeningClosingToggle={false}
      >
        {/* Customized input block exactly matching the design token filter template */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-emerald-300">
            Select G/L No.(s) <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => setIsModalOpen(true)}
            className="h-9 w-full rounded border-0 bg-white/10 px-3 flex items-center justify-between cursor-pointer text-xs text-emerald-100 hover:bg-white/15 ring-1 ring-white/20"
          >
            <span className="truncate">
              {selectedGLs.length === 0
                ? "Lookup G/L Accounts..."
                : `${selectedGLs.length} Selected`}
            </span>
            <Search className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 ml-1" />
          </div>
        </div>
      </ReportFilters>

      {/* Array selection contextual tracking drawer panels */}
      {selectedGLs.length > 0 && (
        <div className="mb-6 p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold text-slate-400 capitalize tracking-wider mr-1">
            Bound G/L Targets:
          </span>
          {selectedGLs.map((gl) => (
            <div
              key={gl.id}
              className="inline-flex items-center space-x-1 bg-slate-50 text-slate-700 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 font-medium font-mono"
            >
              <span>{gl.code}</span>
              <button
                onClick={() =>
                  setSelectedGLs((prev) =>
                    prev.filter((item) => item.id !== gl.id),
                  )
                }
                className="text-slate-400 hover:text-slate-600 transition ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Balance Statement Sheet Layout Content Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 backdrop-blur-[0.5px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Compiling Accruals Balances...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                <th className="px-4 py-3 w-32">Haulier No.</th>
                <th className="px-4 py-3">Haulier Name</th>
                <th className="px-4 py-3 w-36">Document No.</th>
                <th className="px-4 py-3 w-28">Posting Date</th>
                <th className="px-4 py-3 text-right w-32">Accrual Amount</th>
                <th className="px-4 py-3 text-right w-32">Cleared Amount</th>
                <th className="px-4 py-3 text-right w-32">Remaining Balance</th>
                <th className="px-4 py-3 text-center w-28">G/L Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {!hasGenerated ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-400 font-sans font-normal italic"
                  >
                    Configure filter settings above and select{" "}
                    <strong className="text-emerald-700 font-bold">
                      Generate Report
                    </strong>{" "}
                    to inspect outstanding provisions.
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-400 font-sans font-normal italic"
                  >
                    No open haulier logistics provisions found inside defined
                    matching account categories.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr
                    key={line.id}
                    className="hover:bg-slate-50/60 transition font-normal text-slate-600"
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {line.haulierNo}
                    </td>
                    <td className="px-4 py-2.5 font-sans font-medium text-slate-700 truncate max-w-xs">
                      {line.haulierName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {line.documentNo}
                    </td>
                    <td className="px-4 py-2.5">{line.postingDate}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatCurrency(line.accrualAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      {formatCurrency(line.clearedAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(line.remainingAccrued)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-500 font-bold">
                      {line.glAccountCode}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold font-sans text-xs text-slate-900">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right font-bold capitalize tracking-wider text-slate-500 text-[10px]"
                  >
                    Grand Summary Totals
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900">
                    {formatCurrency(totalAccrual)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-800">
                    {formatCurrency(totalCleared)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs border-l border-slate-100 bg-slate-100/30">
                    {formatCurrency(totalRemaining)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Multi-Select Bound Instance Integration Modal */}
      <GLAccountLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(accounts) => {
          setSelectedGLs(accounts);
        }}
      />
    </div>
  );
}

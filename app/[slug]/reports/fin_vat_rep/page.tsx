// app/[slug]/reports/fin_vat_rep/page.tsx

"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { ReportHeader } from "@/app/components/reports/ReportHeader";

import { ReportFilters } from "@/app/components/reports/ReportFilters";
import { Loader2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

interface VATSummaryRow {
  rowNo: number;
  description: string;
  amount: number;
}

export default function VatReportComponent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-06-14");
  const [vatStatus, setVatStatus] = useState("Open");
  const [includeOpenBefore, setIncludeOpenBefore] = useState(true);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);
  const [tableData, setTableData] = useState<VATSummaryRow[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { show, hide } = useLoader();

  const handleGenerateReport = async () => {
    try {
      setIsLoadingTable(true);
      setHasGenerated(true);

      const response = await fetch("/api/reports/vat-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          vatStatus,
          includeOpenBefore,
          actionType: "summary",
          format: "json",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch summary VAT metrics.");
      const data = await response.json();
      setTableData(data);
    } catch (err) {
      console.error(err);
      alert("Error compiling VAT box definitions.");
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleSpecialAction = async (action: "detailed" | "open_before") => {
    alert(
      `Triggering view stream for: ${action}. This launches the historical matching ledger line overlay component matching image templates.`,
    );
  };

  const handleExport = async (exportFormat: "pdf" | "xlsx") => {
    if (!hasGenerated) {
      alert(
        "Please generate the report layout on-screen before choosing export configurations.",
      );
      return;
    }
    try {
      setIsProcessing(exportFormat);
      const response = await fetch("/api/reports/vat-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          vatStatus,
          includeOpenBefore,
          actionType: "summary",
          format: exportFormat,
        }),
      });

      if (!response.ok)
        throw new Error("Failed to generate export file pipeline.");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (exportFormat === "pdf") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute(
          "download",
          `VAT_Report_${fromDate}_to_${toDate}.xlsx`,
        );
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

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <Breadcrumbs
        items={[
          { label: "Reports", href: `/${slug}/reports` },
          { label: "All Reports", href: `/${slug}/reports` },
          { label: "VAT Report" },
        ]}
      />
      <ReportHeader
        title="VAT Report"
        subtitle="Tax breakdown summary for return submissions"
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
        showAccountRanges={false}
        showOpeningClosingToggle={false}
      >
        {/* Customized Content Slot replicating legacy parameters checkboxes */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col space-y-3">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-emerald-200 hover:text-white transition">
            <input
              type="checkbox"
              checked={includeOpenBefore}
              onChange={(e) => setIncludeOpenBefore(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-700 bg-white/10 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-medium">
              Include all open entries before {fromDate}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => handleSpecialAction("detailed")}
              className="inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20  text-white rounded transition border border-white/10"
            >
              <Eye className="h-3 w-3 text-emerald-400" />
              <span>Detailed VAT Report</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleSpecialAction("open_before")}
              className="inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20  text-white rounded transition border border-white/10"
            >
              <FileText className="h-3 w-3 text-emerald-400" />
              <span>Open Entries Before Date From</span>
            </Button>

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-xs font-medium text-emerald-300">
                Include VAT Status
              </span>
              <select
                value={vatStatus}
                onChange={(e) => setVatStatus(e.target.value)}
                className="h-7 rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900"
              >
                <option value="Open" className="text-slate-900">
                  Open
                </option>
                <option value="All" className="text-slate-900">
                  All
                </option>
                <option value="Fulfilled" className="text-slate-900">
                  Fulfilled
                </option>
              </select>
            </div>
          </div>
        </div>
      </ReportFilters>

      {/* Main VAT Matrix Board Grid Layout */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative">
        {isLoadingTable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Calculating VAT Columns...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold">
                <th className="px-4 py-3 w-20 text-center">Row No.</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right w-48">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {!hasGenerated ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-20 text-slate-400 font-normal"
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      Tax Breakdown Grid Standby
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click{" "}
                      <strong className="text-emerald-700">
                        Generate Report
                      </strong>{" "}
                      to snapshot live VAT metrics.
                    </p>
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map((row) => (
                  <tr
                    key={row.rowNo}
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="px-4 py-3 text-center font-mono font-semibold bg-slate-50/40 text-slate-500 border-r border-slate-100">
                      {row.rowNo}.
                    </td>
                    <td className="px-4 py-3 text-left text-slate-800 font-medium">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {row.amount === 0
                        ? ""
                        : new Intl.NumberFormat("en-US", {
                            minimumFractionDigits: 2,
                          }).format(row.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    No matching tax allocations mapped for this selection.
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

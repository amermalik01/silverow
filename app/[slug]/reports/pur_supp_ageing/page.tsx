// app/[slug]/reports/pur_supp_ageing/page.tsx

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";

import { Icon } from "@iconify/react";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type SummaryRow = {
  vendor_id: string;
  vendor_no: string;
  vendor_name: string;
  currency_code: string;
  total: number;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b91_120: number;
  b_over_120: number;
};

type DetailedEntry = {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  description: string;
  currency_code: string;
  outstanding_fcy: number;
  outstanding_lcy: number;
  running_balance_fcy: number;
};

type DetailedGroup = {
  vendor_id: string;
  vendor_no: string;
  vendor_name: string;
  currency_code: string;
  total_fcy: number;
  total_lcy: number;
  entries: DetailedEntry[];
};

type DetailedExportRow = {
  Supplier: string;
  "Posting Date": string;
  "Document Type": string;
  "Document No": string;
  Currency: string;
  "Outstanding Amount": number;
  "Outstanding Amount (LCY)": number;
  "Due Date": string;
  Balance: number;
};

export default function SupplierAgeingReport() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [loading, setLoading] = useState(false);
  const { show, hide } = useLoader();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter State Hooks
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );
  const [viewMode, setViewMode] = useState<"Summary" | "Detailed">("Summary");

  // Report Data States
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [detailedData, setDetailedData] = useState<DetailedGroup[]>([]);

  // Selection Arrays for Lookup Modal
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    SupplierLookupItem[]
  >([]);

  // Modals / Export Menu
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const handleGenerateReport = async () => {
    if (!asOfDate) {
      setValidationError("'Date as at' parameter is mandatory.");
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("asOfDate", format(asOfDate, "yyyy-MM-dd"));
      params.append("viewMode", viewMode);

      if (selectedSupplierIds.length > 0) {
        params.append("supplierIds", selectedSupplierIds.join(","));
      }

      const res = await fetch(
        `/api/reports/supplier-ageing?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed fetching ageing data");

      const json = await res.json();
      if (viewMode === "Summary") {
        setSummaryData(json.data || []);
        setDetailedData([]);
      } else {
        setDetailedData(json.data || []);
        setSummaryData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setAsOfDate(startOfDay(new Date()));
    setViewMode("Summary");
    setSelectedSupplierIds([]);
    setSelectedSuppliers([]);
    setSummaryData([]);
    setDetailedData([]);
    setValidationError(null);
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    if (num === 0) return "-";
    const formatted = Math.abs(num).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `(${formatted})` : formatted;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "";
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (viewMode === "Summary") {
      const rows = summaryData.map((r) => ({
        "Supplier No": r.vendor_no,
        Name: r.vendor_name,
        Currency: r.currency_code,
        Total: r.total,
        "0 - 30 Days": r.b0_30,
        "31 - 60 Days": r.b31_60,
        "61 - 90 Days": r.b61_90,
        "91 - 120 Days": r.b91_120,
        "Over 120 Days": r.b_over_120,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, "Ageing Summary");
    } else {
      const rows: DetailedExportRow[] = [];
      detailedData.forEach((group) => {
        group.entries.forEach((e) => {
          rows.push({
            Supplier: `${group.vendor_name} (${group.vendor_no})`,
            "Posting Date": formatDate(e.posting_date),
            "Document Type": e.document_type,
            "Document No": e.document_no,
            Currency: e.currency_code,
            "Outstanding Amount": e.outstanding_fcy,
            "Outstanding Amount (LCY)": e.outstanding_lcy,
            "Due Date": formatDate(e.due_date),
            Balance: e.running_balance_fcy,
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, "Ageing Detailed");
    }

    XLSX.writeFile(
      workbook,
      `Supplier_Ageing_${viewMode}_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full p-4 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Reports", href: `/${slug}/reports` },
          { label: "All Reports", href: `/${slug}/reports` },
          { label: "Supplier Ageing Report" },
        ]}
      />
      {/* Search Filter Board */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-center">
          {/* Mandatory Date Filter */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Date as at <span className="text-red-400">*</span>
            </label>
            <DatePicker
              value={asOfDate}
              onChange={(d) => {
                setAsOfDate(d);
                if (d) setValidationError(null);
              }}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
            />
            {/* <DatePicker
              value={asOfDate}
              onChange={(d) => {
                setAsOfDate(d);
                if (d) setValidationError(null);
              }}
              maxDate={new Date()}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
            /> */}
          </div>

          {/* Supplier Multi-select */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Supplier(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setSupplierModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Suppliers Selected"
                value={
                  selectedSupplierIds.length
                    ? `${selectedSupplierIds.length} Supplier(s) selected`
                    : ""
                }
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-1.5 w-4 h-4 text-slate-400 pointer-events-none"
              />
              {/* <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">
                ❐
              </span> */}
            </div>
          </div>

          {/* Radio View Mode Selector */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">Report Type</label>
            <div className="flex items-center gap-4 pt-1 text-slate-200 font-medium">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === "Summary"}
                  onChange={() => setViewMode("Summary")}
                  className="accent-emerald-500"
                />
                Summary
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === "Detailed"}
                  onChange={() => setViewMode("Detailed")}
                  className="accent-emerald-500"
                />
                Detailed
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              variant="save"
            >
              <Search className="h-3.5 w-3.5" />{" "}
              {loading ? "Generating..." : "Generate Report"}
            </Button>
            <Button onClick={handleClearFilters} variant="cancel">
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filter
            </Button>
          </div>
          {/* <div className="flex gap-2 justify-end pt-4">
            <Button
              onClick={handleGenerateReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow"
            >
              <Search className="h-3.5 w-3.5" /> Generate Report
            </Button>
            <Button
              onClick={handleClearFilters}
              className="bg-zinc-500 hover:bg-zinc-600 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filter
            </Button>
          </div> */}
        </div>
      </div>

      {/* Presentation Container */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Metadata */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-emerald-700 h-5 w-5" /> Supplier Ageing
              Report ({viewMode})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              As at{" "}
              <span className="font-semibold">{formatDate(asOfDate)}</span>
            </p>
          </div>

          {/* Export Menu */}
          <div className="relative">
            <Button
              disabled={summaryData.length === 0 && detailedData.length === 0}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export As ▾
            </Button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
                  (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Display Tables */}
        <div className="overflow-x-auto w-full">
          {viewMode === "Summary" ? (
            /* SUMMARY TABLE PRESENTATION */
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0b3310] text-white font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Supplier No.</th>
                  <th className="p-3">Name</th>
                  <th className="p-3 text-center">Currency</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">0 - 30 Days</th>
                  <th className="p-3 text-right">31 - 60 Days</th>
                  <th className="p-3 text-right">61 - 90 Days</th>
                  <th className="p-3 text-right">91 - 120 Days</th>
                  <th className="p-3 text-right">Over 120 Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-12 text-center font-sans text-xs text-slate-400 italic"
                    >
                      Calculating aged buckets...
                    </td>
                  </tr>
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-12 text-center font-sans text-xs text-slate-400 italic"
                    >
                      No supplier ageing balances found as at{" "}
                      {formatDate(asOfDate)}.
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row) => (
                    <tr
                      key={row.vendor_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap font-sans font-semibold text-emerald-800">
                        {row.vendor_no}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900">
                        {row.vendor_name}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-600">
                        {row.currency_code}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.b0_30)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.b31_60)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.b61_90)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.b91_120)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(row.b_over_120)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* DETAILED TABLE PRESENTATION */
            <div className="p-4 space-y-6">
              {loading ? (
                <div className="p-12 text-center font-sans text-xs text-slate-400 italic">
                  Compiling detailed unapplied transactions...
                </div>
              ) : detailedData.length === 0 ? (
                <div className="p-12 text-center font-sans text-xs text-slate-400 italic">
                  No detailed ageing entries found.
                </div>
              ) : (
                detailedData.map((group) => (
                  <div key={group.vendor_id} className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 font-sans">
                      {group.vendor_name} ({group.vendor_no})
                    </h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#0b3310] text-white font-bold">
                        <tr>
                          <th className="p-2.5">Posting Date</th>
                          <th className="p-2.5">Document Type</th>
                          <th className="p-2.5">Document No</th>
                          <th className="p-2.5 text-center">Currency</th>
                          <th className="p-2.5 text-right">
                            Outstanding Amount
                          </th>
                          <th className="p-2.5 text-right">
                            Outstanding Amount (LCY)
                          </th>
                          <th className="p-2.5">Due Date</th>
                          <th className="p-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                        {group.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              {formatDate(entry.posting_date)}
                            </td>
                            <td className="p-2.5 font-sans">
                              {entry.document_type}
                            </td>
                            <td className="p-2.5 font-semibold text-emerald-800">
                              {entry.document_no || "—"}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-600">
                              {entry.currency_code}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatCurrency(entry.outstanding_fcy)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatCurrency(entry.outstanding_lcy)}
                            </td>
                            <td className="p-2.5">
                              {formatDate(entry.due_date) || "—"}
                            </td>
                            <td className="p-2.5 text-right font-bold tabular-nums">
                              {formatCurrency(entry.running_balance_fcy)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td
                            colSpan={4}
                            className="p-2.5 text-right font-sans"
                          >
                            Total
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatCurrency(group.total_fcy)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatCurrency(group.total_lcy)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(suppliers) => {
          setSelectedSuppliers(suppliers);
          setSelectedSupplierIds(suppliers.map((s) => s.id));
        }}
      />
    </div>
  );
}

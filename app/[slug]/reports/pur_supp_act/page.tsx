// app/[slug]/reports/pur_supp_act/page.tsx

"use client";

import { useState } from "react";
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type ReportLineItem = {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  description: string;
  vendor_no: string;
  vendor_name: string;
  currency_code: string;
  exchange_rate: number;
  original_amount_fcy: number;
  remaining_amount_fcy: number;
  amount_lcy: number;
  remaining_amount_lcy: number;
  total_allocated: number;
  is_open: boolean;
  on_hold: boolean;
  on_hold_reason: string;
};

export default function SupplierActivityReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportLineItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter State Hooks
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );
  const [reportType, setReportType] = useState("By Posting Date");
  const [documentType, setDocumentType] = useState("All");

  // Selection Arrays for Lookup Modal
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    SupplierLookupItem[]
  >([]);

  // Export Dropdown State
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Modal Visibility State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const handleGenerateReport = async () => {
    // Mandatory Date Bounds Validation
    if (!fromDate || !toDate) {
      setValidationError(
        "Both 'From Date' and 'To Date' are mandatory parameters.",
      );
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const params = new URLSearchParams();

      params.append("fromDate", format(fromDate, "yyyy-MM-dd"));
      params.append("toDate", format(toDate, "yyyy-MM-dd"));
      params.append("reportType", reportType);
      params.append("documentType", documentType);

      if (selectedSupplierIds.length > 0) {
        params.append("supplierIds", selectedSupplierIds.join(","));
      }

      const res = await fetch(
        `/api/reports/supplier-activity?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Failed generating supplier activity metrics context");
      }

      const json = await res.json();
      setReportData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(startOfDay(new Date()));
    setReportType("By Posting Date");
    setDocumentType("All");
    setSelectedSupplierIds([]);
    setSelectedSuppliers([]);
    setReportData([]);
    setValidationError(null);
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return num.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "";
    }
  };

  // Export to CSV Functionality
  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      "Posting Date",
      "Doc Type",
      "Doc No",
      "Vendor No",
      "Vendor Name",
      "Description",
      "Due Date",
      "CCY",
      "Amount (FCY)",
      "Remaining (FCY)",
      "Amount (LCY)",
      "Remaining (LCY)",
      "Status",
    ];

    const rows = reportData.map((row) => [
      formatDate(row.posting_date),
      `"${row.document_type || ""}"`,
      `"${row.document_no || ""}"`,
      `"${row.vendor_no || ""}"`,
      `"${(row.vendor_name || "").replace(/"/g, '""')}"`,
      `"${(row.description || "").replace(/"/g, '""')}"`,
      formatDate(row.due_date),
      row.currency_code,
      row.original_amount_fcy,
      row.remaining_amount_fcy,
      row.amount_lcy,
      row.remaining_amount_lcy,
      row.is_open ? "Open" : "Closed",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Supplier_Activity_Report_${format(new Date(), "yyyyMMdd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMenuOpen(false);
  };

  // Export to Excel Functionality
  const exportToExcel = () => {
    if (reportData.length === 0) return;

    const formattedData = reportData.map((row) => ({
      "Posting Date": formatDate(row.posting_date),
      "Doc Type": row.document_type,
      "Doc No": row.document_no,
      "Vendor No": row.vendor_no,
      "Vendor Name": row.vendor_name,
      Description: row.description,
      "Due Date": formatDate(row.due_date),
      CCY: row.currency_code,
      "Amount (FCY)": row.original_amount_fcy,
      "Remaining (FCY)": row.remaining_amount_fcy,
      "Amount (LCY)": row.amount_lcy,
      "Remaining (LCY)": row.remaining_amount_lcy,
      Status: row.is_open ? "Open" : "Closed",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Activity");
    XLSX.writeFile(
      workbook,
      `Supplier_Activity_Report_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Search Criteria Control Board */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-center">
          {/* Date Parameters Section (Mandatory) */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Date Range Bounds <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  if (d && toDate) setValidationError(null);
                }}
                maxDate={toDate || new Date()}
                className={`w-full bg-white text-slate-900 border px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  !fromDate && validationError
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-emerald-800"
                }`}
              />
              <span className="self-center">to</span>
              <DatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  if (fromDate && d) setValidationError(null);
                }}
                minDate={fromDate}
                maxDate={new Date()}
                className={`w-full bg-white text-slate-900 border px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  !toDate && validationError
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-emerald-800"
                }`}
              />
            </div>
          </div>

          {/* Document Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Document Type Filter
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="h-6 rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 cursor-pointer"
              // className="w-full bg-white border border-white text-slate-800 rounded px-2 py-1.5 focus:outline-none h-[34px] cursor-pointer"
            >
              <option value="All">All Documents</option>
              <option value="Purchase Invoices">Purchase Invoices</option>
              <option value="Debit Notes">Debit Notes</option>
              <option value="Journals">Journals</option>
            </select>
          </div>

          {/* Report Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Report Type Evaluation
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="h-6 rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 cursor-pointer"
            >
              <option value="By Posting Date">By Posting Date</option>
              <option value="By Due Date">By Due Date</option>
              <option value="By Created Date">By Created Date</option>
            </select>
          </div>

          {/* Top Actions Block */}
          <div className="flex gap-2 justify-end pt-4">
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
          </div>
        </div>

        <hr className="border-emerald-900" />

        {/* Dynamic Multi-Select Lookup Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
              />
              <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">
                ❐
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Presentation Sheet Wrapper */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        {/* Document Header Metadata Section */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-emerald-700 h-5 w-5" /> Supplier
              Activity Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statement :{" "}
              <span className="font-semibold">
                {formatDate(fromDate) || "Required"}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {formatDate(toDate) || "Required"}
              </span>
            </p>
          </div>

          {/* Export Options Dropdown */}
          <div className="relative">
            <Button
              disabled={reportData.length === 0}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export As ▾
            </Button>

            {exportMenuOpen && reportData.length > 0 && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
                  (.xlsx)
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileCode className="h-4 w-4 text-slate-600" /> CSV (.csv)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Presentation Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3">Posting Date</th>
                <th className="p-3">Doc Type</th>
                <th className="p-3">Doc No</th>
                <th className="p-3">Vendor No</th>
                <th className="p-3 min-w-[150px]">Vendor Name</th>
                <th className="p-3">Description</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-center">CCY</th>
                <th className="p-3 text-right">Amount (FCY)</th>
                <th className="p-3 text-right">Remaining (FCY)</th>
                <th className="p-3 text-right">Amount (LCY)</th>
                <th className="p-3 text-right">Remaining (LCY)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    Recalculating ledger activity data rows...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    No supplier activity entries found within specified
                    constraint bounds.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.posting_date)}
                    </td>
                    <td className="p-3 whitespace-nowrap font-sans font-medium text-slate-800">
                      {row.document_type}
                    </td>
                    <td className="p-3 font-semibold text-emerald-800 whitespace-nowrap">
                      {row.document_no || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {row.vendor_no || "—"}
                    </td>
                    <td className="p-3 font-sans font-medium text-slate-900 max-w-[200px] truncate">
                      {row.vendor_name}
                    </td>
                    <td className="p-3 font-sans text-slate-600 max-w-[220px] truncate">
                      {row.description || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.due_date) || "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-600">
                      {row.currency_code}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-800">
                      {formatCurrency(row.original_amount_fcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-600">
                      {formatCurrency(row.remaining_amount_fcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                      {formatCurrency(row.amount_lcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-emerald-800">
                      {formatCurrency(row.remaining_amount_lcy)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {row.is_open ? (
                        <span className="inline-block px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                          Open
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        {reportData.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center font-sans text-xs font-semibold text-slate-600">
            <div>
              Total Ledger Activity Records:{" "}
              <span className="text-slate-900 font-bold">
                {reportData.length} entries
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-white border border-slate-200 px-4 py-2.5 rounded shadow-sm text-right">
              <div>
                Total Amount (LCY):{" "}
                <span className="text-slate-900 font-bold font-mono ml-1">
                  {formatCurrency(
                    reportData.reduce(
                      (acc, curr) => acc + Number(curr.amount_lcy),
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-8">
                Total Remaining (LCY):{" "}
                <span className="text-emerald-800 font-bold font-mono ml-1">
                  {formatCurrency(
                    reportData.reduce(
                      (acc, curr) => acc + Number(curr.remaining_amount_lcy),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Multi-Select Modal */}
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

/* "use client";

import { useState } from "react";
import { Search, RotateCcw, FileText, Download } from "lucide-react";
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";


type ReportLineItem = {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  description: string;
  vendor_no: string;
  vendor_name: string;
  currency_code: string;
  exchange_rate: number;
  original_amount_fcy: number;
  remaining_amount_fcy: number;
  amount_lcy: number;
  remaining_amount_lcy: number;
  total_allocated: number;
  is_open: boolean;
  on_hold: boolean;
  on_hold_reason: string;
};

export default function SupplierActivityReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportLineItem[]>([]);

  // Filter State Hooks
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );
  const [reportType, setReportType] = useState("By Posting Date");

  // Selection Arrays for Lookup Modal
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    SupplierLookupItem[]
  >([]);

  // Modal Visibility State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (fromDate) {
        params.append("fromDate", format(fromDate, "yyyy-MM-dd"));
      }

      if (toDate) {
        params.append("toDate", format(toDate, "yyyy-MM-dd"));
      }
      params.append("reportType", reportType);

      if (selectedSupplierIds.length > 0) {
        params.append("supplierIds", selectedSupplierIds.join(","));
      }

      const res = await fetch(
        `/api/reports/supplier-activity?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Failed generating supplier activity metrics context");
      }

      const json = await res.json();
      setReportData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(startOfDay(new Date()));
    setReportType("By Posting Date");
    setSelectedSupplierIds([]);
    setSelectedSuppliers([]);
    setReportData([]);
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return num.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full p-4 space-y-6">

      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Date Range Bounds
            </label>
            <div className="flex gap-2">
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                maxDate={toDate || new Date()}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="self-center">to</span>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                minDate={fromDate}
                maxDate={new Date()}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>


          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Report Type Evaluation
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white border border-white text-slate-800 rounded px-2 py-1.5 focus:outline-none h-[28px] cursor-pointer"
            >
              <option value="By Posting Date">By Posting Date</option>
              <option value="By Due Date">By Due Date</option>
              <option value="By Created Date">By Created Date</option>
            </select>
          </div>

 
          <div className="flex gap-2 justify-end pt-4">
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
          </div>
        </div>

        <hr className="border-emerald-900" />


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
              />
              <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">
                ❐
              </span>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">

        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-emerald-700 h-5 w-5" /> Supplier
              Activity Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statement Window Context:{" "}
              <span className="font-semibold">
                {formatDate(fromDate) || "Inception"}
              </span>{" "}
              to <span className="font-semibold">{formatDate(toDate)}</span>
            </p>
          </div>
          <Button className="border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm">
            <Download className="h-3.5 w-3.5" /> Export As ▾
          </Button>
        </div>


        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3">Posting Date</th>
                <th className="p-3">Doc Type</th>
                <th className="p-3">Doc No</th>
                <th className="p-3">Vendor No</th>
                <th className="p-3 min-w-[150px]">Vendor Name</th>
                <th className="p-3">Description</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-center">CCY</th>
                <th className="p-3 text-right">Amount (FCY)</th>
                <th className="p-3 text-right">Remaining (FCY)</th>
                <th className="p-3 text-right">Amount (LCY)</th>
                <th className="p-3 text-right">Remaining (LCY)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    Recalculating ledger activity data rows...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    No supplier activity entries found within specified
                    constraint bounds.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.posting_date)}
                    </td>
                    <td className="p-3 whitespace-nowrap font-sans font-medium text-slate-800">
                      {row.document_type}
                    </td>
                    <td className="p-3 font-semibold text-emerald-800 whitespace-nowrap">
                      {row.document_no || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.vendor_no || "—"}</td>
                    <td className="p-3 font-sans font-medium text-slate-900 max-w-[200px] truncate">
                      {row.vendor_name}
                    </td>
                    <td className="p-3 font-sans text-slate-600 max-w-[220px] truncate">
                      {row.description || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.due_date) || "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-600">
                      {row.currency_code}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-800">
                      {formatCurrency(row.original_amount_fcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-600">
                      {formatCurrency(row.remaining_amount_fcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                      {formatCurrency(row.amount_lcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-emerald-800">
                      {formatCurrency(row.remaining_amount_lcy)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {row.is_open ? (
                        <span className="inline-block px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                          Open
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

 
        {reportData.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center font-sans text-xs font-semibold text-slate-600">
            <div>
              Total Ledger Activity Records:{" "}
              <span className="text-slate-900 font-bold">
                {reportData.length} entries
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-white border border-slate-200 px-4 py-2.5 rounded shadow-sm text-right">
              <div>
                Total Amount (LCY):{" "}
                <span className="text-slate-900 font-bold font-mono ml-1">
                  {formatCurrency(
                    reportData.reduce(
                      (acc, curr) => acc + Number(curr.amount_lcy),
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-8">
                Total Remaining (LCY):{" "}
                <span className="text-emerald-800 font-bold font-mono ml-1">
                  {formatCurrency(
                    reportData.reduce(
                      (acc, curr) => acc + Number(curr.remaining_amount_lcy),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
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
} */

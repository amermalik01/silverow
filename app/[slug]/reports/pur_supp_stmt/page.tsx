// app/[slug]/reports/pur_supp_stmt/page.tsx

"use client";

import { useState } from "react";

import { Icon } from "@iconify/react";
import { Search, RotateCcw, FileText, Download, FileSpreadsheet } from "lucide-react";
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type StatementEntry = {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  external_doc_no: string;
  currency_code: string;
  original_amount: number;
  settled_amount: number;
  outstanding_amount: number;
  running_balance: number;
};

type AgeingSummary = {
  currency_code: string;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b91_120: number;
  b_over_120: number;
  total: number;
};

type SupplierStatementGroup = {
  vendor_id: string;
  vendor_no: string;
  vendor_name: string;
  country: string;
  currency_code: string;
  company_bank_info: {
    bank_name: string;
    account_name: string;
    sort_code: string;
    account_no: string;
    vat_reg_no: string;
    payment_terms: string;
  };
  entries: StatementEntry[];
  total_outstanding: number;
  ageing_summary: AgeingSummary[];
};

type StatementExportRow = {
  Supplier: string;
  "Posting Date": string;
  "Document Type": string;
  "Document No": string;
  "Supplier Ref. No.": string;
  Currency: string;
  "Original Amount": number;
  "Settled Amount": number;
  "Outstanding Amount": number;
  "Due Date": string;
  Balance: number;
};

export default function SupplierStatementReport() {
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter State Hooks
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [statements, setStatements] = useState<SupplierStatementGroup[]>([]);

  // Selection Arrays for Lookup Modal
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [, setSelectedSuppliers] = useState<SupplierLookupItem[]>([]);

  // Modals & Menu State
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

      if (selectedSupplierIds.length > 0) {
        params.append("supplierIds", selectedSupplierIds.join(","));
      }

      const res = await fetch(`/api/reports/supplier-statement?${params.toString()}`);
      if (!res.ok) throw new Error("Failed fetching supplier statements");

      const json = await res.json();
      setStatements(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setAsOfDate(startOfDay(new Date()));
    setSelectedSupplierIds([]);
    setSelectedSuppliers([]);
    setStatements([]);
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
    const rows: StatementExportRow[] = [];

    statements.forEach((stmt) => {
      stmt.entries.forEach((e) => {
        rows.push({
          Supplier: `${stmt.vendor_name} (${stmt.vendor_no})`,
          "Posting Date": formatDate(e.posting_date),
          "Document Type": e.document_type,
          "Document No": e.document_no,
          "Supplier Ref. No.": e.external_doc_no,
          Currency: e.currency_code,
          "Original Amount": e.original_amount,
          "Settled Amount": e.settled_amount,
          "Outstanding Amount": e.outstanding_amount,
          "Due Date": formatDate(e.due_date),
          Balance: e.running_balance,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, "Supplier Statements");
    XLSX.writeFile(workbook, `Supplier_Statement_${format(new Date(), "yyyyMMdd")}.xlsx`);
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Search Filter Board */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">
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
              maxDate={new Date()}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
            />
          </div>

          {/* Supplier Multi-select */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">Select Supplier(s)</label>
            <div className="relative cursor-pointer" onClick={() => setSupplierModalOpen(true)}>
              <input
                readOnly
                placeholder="All Suppliers Selected"
                value={selectedSupplierIds.length ? `${selectedSupplierIds.length} Supplier(s) selected` : ""}
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer"
              />
              {/* <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">❐</span> */}
              <Icon icon="tabler:external-link" className="absolute right-2.5 top-1.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}

          <div className="flex gap-2 justify-end pt-4">
                      <Button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        variant="save"
                      >
                        <Search className="h-3.5 w-3.5" />{" "}
                        {loading ? "Generating..." : "Generate Report"}
                      </Button>
                      <Button
                        onClick={handleClearFilters}
                        variant="cancel"
                      >
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

      {/* Presentation Shell */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-700 h-5 w-5" />
            <h1 className="text-base font-bold text-slate-900">Supplier Statement</h1>
          </div>

          <div className="relative">
            <Button
              disabled={statements.length === 0}
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
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statements Display View */}
        <div className="p-6 space-y-12">
          {loading ? (
            <div className="p-12 text-center font-sans text-xs text-slate-400 italic">
              Generating supplier statement matrix...
            </div>
          ) : statements.length === 0 ? (
            <div className="p-12 text-center font-sans text-xs text-slate-400 italic">
              No open supplier statements available as at {formatDate(asOfDate)}.
            </div>
          ) : (
            statements.map((stmt) => (
              <div key={stmt.vendor_id} className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white shadow-sm">
                {/* Statement Header */}
                <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-900">
                      {stmt.vendor_name} ({stmt.vendor_no})
                    </h2>
                    <p className="text-slate-500">{stmt.country}</p>
                    <p className="text-slate-700 font-semibold pt-2">
                      As at <span className="font-bold">{formatDate(asOfDate)}</span>
                    </p>
                  </div>

                  {/* Company Banking Box */}
                  <div className="text-right space-y-0.5 text-slate-600">
                    <p className="font-bold text-emerald-900 text-sm">{stmt.company_bank_info.account_name}</p>
                    <p><span className="font-semibold text-slate-700">Bank:</span> {stmt.company_bank_info.bank_name}</p>
                    <p><span className="font-semibold text-slate-700">Sort Code:</span> {stmt.company_bank_info.sort_code}</p>
                    <p><span className="font-semibold text-slate-700">Account No:</span> {stmt.company_bank_info.account_no}</p>
                    {stmt.company_bank_info.vat_reg_no && (
                      <p><span className="font-semibold text-slate-700">VAT Reg No:</span> {stmt.company_bank_info.vat_reg_no}</p>
                    )}
                  </div>
                </div>

                {/* Main Statement Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0b3310] text-white font-bold">
                      <tr>
                        <th className="p-2.5">Posting Date</th>
                        <th className="p-2.5">Document Type</th>
                        <th className="p-2.5">Document No</th>
                        <th className="p-2.5">Supplier Ref. No.</th>
                        <th className="p-2.5 text-center">Currency</th>
                        <th className="p-2.5 text-right">Original Amount</th>
                        <th className="p-2.5 text-right">Settled Amount</th>
                        <th className="p-2.5 text-right">Outstanding Amount</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                      {stmt.entries.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="p-2.5">{formatDate(e.posting_date)}</td>
                          <td className="p-2.5 font-sans">{e.document_type}</td>
                          <td className="p-2.5 font-semibold text-emerald-800">{e.document_no || "—"}</td>
                          <td className="p-2.5 font-sans text-slate-600">{e.external_doc_no}</td>
                          <td className="p-2.5 text-center font-bold text-slate-600">{e.currency_code}</td>
                          <td className="p-2.5 text-right tabular-nums">{formatCurrency(e.original_amount)}</td>
                          <td className="p-2.5 text-right tabular-nums">{formatCurrency(e.settled_amount)}</td>
                          <td className="p-2.5 text-right tabular-nums">{formatCurrency(e.outstanding_amount)}</td>
                          <td className="p-2.5">{formatDate(e.due_date) || "—"}</td>
                          <td className="p-2.5 text-right font-bold tabular-nums">
                            {formatCurrency(e.running_balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-300">
                        <td colSpan={9} className="p-2.5 text-right font-sans">
                          Total
                        </td>
                        <td className="p-2.5 text-right tabular-nums">
                          {formatCurrency(stmt.total_outstanding)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ageing Summary Footer Section */}
                <div className="space-y-2 pt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0b3310] text-white font-bold">
                      <tr>
                        <th className="p-2">Ageing Summary</th>
                        <th className="p-2 text-right">0- 30 Days</th>
                        <th className="p-2 text-right">31- 60 Days</th>
                        <th className="p-2 text-right">61- 90 Days</th>
                        <th className="p-2 text-right">91- 120 Days</th>
                        <th className="p-2 text-right">Over 120 Days</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                      {stmt.ageing_summary.map((age, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold font-sans text-slate-800">{age.currency_code}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(age.b0_30)}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(age.b31_60)}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(age.b61_90)}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(age.b91_120)}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(age.b_over_120)}</td>
                          <td className="p-2 text-right font-bold tabular-nums">{formatCurrency(age.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
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
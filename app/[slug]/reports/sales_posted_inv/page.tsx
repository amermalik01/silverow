//  app/[slug]/reports/sales_posted_inv/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";

// --- Type System Definitions ---
type DocumentTypeFilter = "sales invoices" | "posted credit notes" | "both";
type DropdownFilterOptions = "Exclude" | "Include" | "Both";

interface TransactionItem {
  id: string;
  posting_date: string;
  document_type: "Invoice" | "Credit Note";
  document_no: string;
  customer_no: string;
  customer_name: string;
  salesperson_name: string;
  finance_channel: boolean;
  insurance_channel: boolean;
  amount_excluding_vat: number;
  vat_amount: number;
  amount_including_vat: number;
}

export default function PostedSalesInvoiceAndCreditNoteReport() {
  // --- Core Filtering State Hooks ---
  // const [fromDate, setFromDate] = useState<string>("");
  // const [toDate, setToDate] = useState<string>("2026-06-14"); // Synced to current application runtime era
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );

  const [documentType, setDocumentType] = useState<DocumentTypeFilter>("both");
  const [financeOption, setFinanceOption] =
    useState<DropdownFilterOptions>("Both");
  const [insuranceOption, setInsuranceOption] =
    useState<DropdownFilterOptions>("Both");

  // --- Lookups & Modal Coordination State Hooks ---
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<
    string[]
  >([]);
  const [salespersonModalOpen, setSalespersonModalOpen] =
    useState<boolean>(false);

  // --- Core Application Logic Hooks ---
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  // --- Primary Search Action Handler ---
  const handleGenerateReport = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : "",
        toDate: toDate ? format(toDate, "yyyy-MM-dd") : "",
        documentType,
        finance: financeOption,
        insurance: insuranceOption,
        salespersons: selectedSalespersonIds.join(","),
      });

      // const queryParams = new URLSearchParams({
      //   fromDate,
      //   toDate,
      //   documentType,
      //   finance: financeOption,
      //   insurance: insuranceOption,
      //   salespersons: selectedSalespersonIds.join(","),
      // });

      const response = await fetch(
        `/api/reports/posted-sales-transactions?${queryParams.toString()}`,
      );
      if (!response.ok)
        throw new Error(
          "Network exception occurred while assembling tabular layout arrays.",
        );

      const resultData = await response.json();
      setTransactions(
        Array.isArray(resultData) ? resultData : resultData.data || [],
      );
      setHasGenerated(true);
    } catch (error) {
      console.error("Critical telemetry aggregation failure:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Reset All Parameters to Baseline Matrix ---
  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(startOfDay(new Date()));
    setDocumentType("both");
    setFinanceOption("Both");
    setInsuranceOption("Both");
    setSelectedSalespersonIds([]);
    setTransactions([]);
    setHasGenerated(false);
  };
  // const handleClearFilters = () => {
  //   setFromDate("");
  //   setToDate("2026-06-14");
  //   setDocumentType("both");
  //   setFinanceOption("Both");
  //   setInsuranceOption("Both");
  //   setSelectedSalespersonIds([]);
  //   setTransactions([]);
  //   setHasGenerated(false);
  // };

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-white px-4 py-2">
          <span className="cursor-pointer hover:text-emerald-800 transition">
            Reports
          </span>
          <span>/</span>
          <span className="cursor-pointer hover:text-emerald-800 transition">
            All Reports
          </span>
          <span>/</span>
          <span className="text-slate-800 font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
            Posted Sales Invoice and Credit Note
          </span>
        </div>
      </div>

      {/* Primary Control Hub Panel Block */}
      <div className="bg-[#093009] text-white p-5 rounded-lg shadow-lg border border-emerald-900 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* Column A: Chronological Bounds Controls */}
          <div className="flex flex-col gap-2.5">
            <label className="font-semibold text-emerald-200 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Date Range{" "}
              <span className="text-red-400 font-bold">*</span>
            </label>
            <div className="flex items-center gap-2">
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                maxDate={toDate}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {/* <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From"
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              /> */}
              <span className="text-emerald-300 font-medium">to</span>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                minDate={fromDate}
                maxDate={new Date()}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {/* <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              /> */}
            </div>

            {/* Document Class Selector Dropdown */}
            <div className="flex flex-col gap-1 mt-1">
              <label className="font-semibold text-emerald-200">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) =>
                  setDocumentType(e.target.value as DocumentTypeFilter)
                }
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="both">Both (Invoices & Credit Notes)</option>
                <option value="sales invoices">Sales Invoices</option>
                <option value="posted credit notes">Posted Credit Notes</option>
              </select>
            </div>
          </div>

          {/* Column B: System Dimensions Entities Lookup */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-emerald-200 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Select Salesperson(s)
              </label>
              <div
                onClick={() => setSalespersonModalOpen(true)}
                className="w-full bg-white text-slate-400 border border-emerald-800 px-3 py-1.5 rounded flex items-center justify-between cursor-pointer hover:bg-slate-50 transition min-h-[32px]"
              >
                <span className="truncate text-[11px] font-mono text-slate-700">
                  {selectedSalespersonIds.length > 0
                    ? `${selectedSalespersonIds.length} Salesperson(s) Selected`
                    : "Tap to mount selection array index lookup..."}
                </span>
                <span className="text-emerald-800 font-bold text-xs">⧉</span>
              </div>
            </div>
          </div>

          {/* Column C: Dynamic Channel Parameter Filters Matrix */}
          <div className="flex flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-emerald-200">
                  Finance Channel
                </label>
                <select
                  value={financeOption}
                  onChange={(e) =>
                    setFinanceOption(e.target.value as DropdownFilterOptions)
                  }
                  className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Both">Both</option>
                  <option value="Include">Include</option>
                  <option value="Exclude">Exclude</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-emerald-200">
                  Insurance Channel
                </label>
                <select
                  value={insuranceOption}
                  onChange={(e) =>
                    setInsuranceOption(e.target.value as DropdownFilterOptions)
                  }
                  className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Both">Both</option>
                  <option value="Include">Include</option>
                  <option value="Exclude">Exclude</option>
                </select>
              </div>
            </div>

            {/* Processing Execution Control Interface */}
            <div className="flex items-center gap-2 justify-end mt-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />{" "}
                {loading ? "Processing..." : "Generate Report"}
              </button>
              <button
                onClick={handleClearFilters}
                className="bg-slate-600 hover:bg-slate-500 active:bg-slate-700 text-white font-bold px-3 py-2 rounded shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filter
              </button>
              <div className="relative group">
                <button className="border border-emerald-700 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-200 font-semibold px-3 py-2 rounded shadow flex items-center gap-1 transition">
                  <Download className="h-3.5 w-3.5" /> Export As ▾
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-white rounded shadow-xl border border-slate-200 hidden group-hover:block z-30 text-slate-700">
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs font-medium">
                    Excel (.xlsx)
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs font-medium">
                    CSV (.csv)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section Data Presentation Board Ledger --- */}
      {hasGenerated && (
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-700 capitalize tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-800" /> Transaction
              Results Document View
            </h2>
            <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {transactions.length} Records Isolated
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#093009] text-white font-bold sticky top-0">
                <tr>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Document Type</th>
                  <th className="p-3">Document No.</th>
                  <th className="p-3">Cust No.</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Salesperson</th>
                  <th className="p-3 text-center">Finance</th>
                  <th className="p-3 text-center">Insurance</th>
                  <th className="p-3 text-right">Amount (Excl. VAT)</th>
                  <th className="p-3 text-right">VAT Amount</th>
                  <th className="p-3 text-right">Total (Incl. VAT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-12 text-center font-sans text-slate-400 italic bg-slate-50"
                    >
                      No posted historical items matched your filter
                      combination. Adjust values and retry.
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 font-sans whitespace-nowrap">
                        {item.posting_date}
                      </td>
                      <td className="p-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide capitalize ${
                            item.document_type === "Invoice"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.document_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-900 font-bold font-mono">
                        {item.document_no}
                      </td>
                      <td className="p-3 font-sans text-slate-500">
                        {item.customer_no}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-800 truncate max-w-[160px]">
                        {item.customer_name}
                      </td>
                      <td className="p-3 font-sans text-slate-600">
                        {item.salesperson_name || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-sans ${item.finance_channel ? "text-emerald-600 font-bold" : "text-slate-300"}`}
                        >
                          {item.finance_channel ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-sans ${item.insurance_channel ? "text-emerald-600 font-bold" : "text-slate-300"}`}
                        >
                          {item.insurance_channel ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        {item.amount_excluding_vat.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {item.vat_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-right text-slate-900 font-bold">
                        {item.amount_including_vat.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Aggregate Totals Summary row display block */}
              {transactions.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-right">
                  <tr>
                    <td
                      colSpan={8}
                      className="p-3 font-sans text-left capitalize tracking-wider text-xs text-slate-500"
                    >
                      Totals Summary Balance
                    </td>
                    <td className="p-3">
                      {transactions
                        .reduce(
                          (sum, item) => sum + item.amount_excluding_vat,
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </td>
                    <td className="p-3 text-slate-600">
                      {transactions
                        .reduce((sum, item) => sum + item.vat_amount, 0)
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </td>
                    <td className="p-3 text-emerald-900 text-xs bg-emerald-50/50">
                      {transactions
                        .reduce(
                          (sum, item) => sum + item.amount_including_vat,
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* --- Salesperson Lookup Selection Overlay Portal Modal --- */}
      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        multiple={true}
        onSelectMultiple={(salespersons: Employee[]) => {
          setSelectedSalespersonIds(salespersons.map((s) => s.id));
        }}
      />
    </div>
  );
}

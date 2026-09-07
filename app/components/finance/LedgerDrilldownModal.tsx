// app/components/finance/LedgerDrilldownModal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface LedgerRow {
  id: string;
  posting_date: string;
  document_type: string;
  document_no: string;
  gl_no: string;
  source_no: string;
  name: string;
  posting_group: string;
  currency_code: string;
  exchange_rate: string | number;
  debit_lcy: string | number;
  credit_lcy: string | number;
  amount_lcy: string | number;
  debit_fcy: string | number;
  credit_fcy: string | number;
  amount_fcy: string | number;
  balancing_account_type: string;
  balancing_account_no: string;
  balancing_account_name: string;  
  entry_no: string;
  posted_by: string;
}

interface ModalProps {
  accountId: string;
  accountName: string;
  accountCode: string;
  onClose: () => void;
}

export default function LedgerDrilldownModal({
  accountId,
  accountName,
  accountCode,
  onClose,
}: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<LedgerRow[]>([]);

  // Search & Debounce
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Per-Column Filter State
  const [filters, setFilters] = useState<Record<string, string>>({
    posting_date: "",
    document_type: "",
    document_no: "",
    source_no: "",
    name: "",
    currency_code: "",
    balancing_account_type: "",
    balancing_account_no: "",
    balancing_account_name: "",
    entry_no: "",
    posted_by: "",
  });
  const debouncedFilters = useDebounce(filters, 400);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      Object.entries(debouncedFilters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });

      const res = await fetch(`/api/finance/accounts/${accountId}/ledger?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load ledger records");

      const json = await res.json();
      setData(json.data || []);
      if (json.pagination) {
        setPagination({
          total: json.pagination.total || 0,
          totalPages: json.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Ledger Drilldown Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, debouncedSearch, page, limit, debouncedFilters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedFilters]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleFilterChange = (col: string, val: string) => {
    setFilters((prev) => ({ ...prev, [col]: val }));
  };

  // Export Filtered CSV Directly via API
  const handleCSVExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append("export", "csv");
      if (debouncedSearch) params.append("q", debouncedSearch);
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });

      const res = await fetch(`/api/finance/accounts/${accountId}/ledger?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const json = await res.json();
      const exportRows: LedgerRow[] = json.data || [];

      if (exportRows.length === 0) return;

      const headers = [
        "Posting Date",
        "Document Type",
        "Document No",
        "G/L No",
        "Source No",
        "Description",
        "Currency",
        "Exchange Rate",
        "Debit (LCY)",
        "Credit (LCY)",
        "Net LCY",
        "Debit (FCY)",
        "Credit (FCY)",
        "Net FCY",
        "Bal. Type",
        "Bal. No",
        "Bal. Name",
        "Entry No",
        "Posted By",
      ];

      const csvContent = [
        headers.join(","),
        ...exportRows.map((r) =>
          [
            `"${r.posting_date ? format(parseISO(r.posting_date), "yyyy-MM-dd") : ""}"`,
            `"${r.document_type || ""}"`,
            `"${r.document_no || ""}"`,
            `"${r.gl_no || ""}"`,
            `"${r.source_no || ""}"`,
            `"${(r.name || "").replace(/"/g, '""')}"`,
            `"${r.currency_code || "GBP"}"`,
            r.exchange_rate || 1,
            r.debit_lcy || 0,
            r.credit_lcy || 0,
            r.amount_lcy || 0,
            r.debit_fcy || 0,
            r.credit_fcy || 0,
            r.amount_fcy || 0,
            `"${r.balancing_account_type || ""}"`,
            `"${r.balancing_account_no || ""}"`,
            `"${(r.balancing_account_name || "").replace(/"/g, '""')}"`,
            `"${r.entry_no || ""}"`,
            `"${r.posted_by || ""}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Ledger_${accountCode}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Page Calculated Totals
  const pageDebitLCY = data.reduce((s, r) => s + Number(r.debit_lcy || 0), 0);
  const pageCreditLCY = data.reduce((s, r) => s + Number(r.credit_lcy || 0), 0);
  const pageBalanceLCY = pageDebitLCY - pageCreditLCY;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-[95vw] h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:calculator" className="text-xl" />
            <h2 className="text-sm font-semibold tracking-wide text-white">
              Ledger Drilldown: <span className="font-mono text-emerald-200">{accountCode}</span> - {accountName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCSVExport}
              disabled={exporting || pagination.total === 0}
              className="bg-emerald-700 hover:bg-emerald-600 text-white h-8 px-3 text-xs rounded transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Icon icon={exporting ? "tabler:loader-2" : "tabler:download"} className={`text-base ${exporting ? "animate-spin" : ""}`} />
              Export Filtered CSV
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <Icon icon="tabler:x" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon icon="tabler:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search document no, reference, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>
          {loading && (
            <span className="flex items-center gap-1 text-xs text-[#103701] dark:text-emerald-400">
              <Icon icon="tabler:loader-2" className="animate-spin text-base" /> Fetching ledger...
            </span>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse min-w-[1700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <th className="p-2 text-left font-semibold">Posting Date</th>
                <th className="p-2 text-left font-semibold">Doc Type</th>
                <th className="p-2 text-left font-semibold">Doc No.</th>
                <th className="p-2 text-left font-semibold">Source No.</th>
                <th className="p-2 text-left font-semibold">Description</th>
                <th className="p-2 text-center font-semibold">CCY</th>
                <th className="p-2 text-right font-semibold">Debit (LCY)</th>
                <th className="p-2 text-right font-semibold">Credit (LCY)</th>
                <th className="p-2 text-right font-semibold">Net LCY</th>
                <th className="p-2 text-right font-semibold">Debit (FCY)</th>
                <th className="p-2 text-right font-semibold">Credit (FCY)</th>
                <th className="p-2 text-right font-semibold">Net FCY</th>
                <th className="p-2 text-left font-semibold">Bal. Type</th>
                <th className="p-2 text-left font-semibold">Bal. No</th>
                <th className="p-2 text-left font-semibold">Bal. Name</th>
                <th className="p-2 text-left font-semibold">Entry No</th> 
                <th className="p-2 text-left font-semibold">Posted By</th>
              </tr>

              {/* Per-Column Input Filters */}
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.posting_date} onChange={(e) => handleFilterChange("posting_date", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.document_type} onChange={(e) => handleFilterChange("document_type", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.document_no} onChange={(e) => handleFilterChange("document_no", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.source_no} onChange={(e) => handleFilterChange("source_no", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.name} onChange={(e) => handleFilterChange("name", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.currency_code} onChange={(e) => handleFilterChange("currency_code", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td colSpan={6} className="bg-slate-100/50 dark:bg-slate-800/20"></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.balancing_account_type} onChange={(e) => handleFilterChange("balancing_account_type", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.balancing_account_no} onChange={(e) => handleFilterChange("balancing_account_no", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.balancing_account_name} onChange={(e) => handleFilterChange("balancing_account_name", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.entry_no} onChange={(e) => handleFilterChange("entry_no", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
                <td className="p-1"><input type="text" placeholder="Filter..." value={filters.posted_by} onChange={(e) => handleFilterChange("posted_by", e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px]" /></td>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-500">
                    No ledger entries found matching your query
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-2 whitespace-nowrap">{row.posting_date ? format(parseISO(row.posting_date), "dd/MM/yyyy") : "-"}</td>
                  <td className="p-2 capitalize">{row.document_type || "-"}</td>
                  <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{row.document_no || "-"}</td>
                  <td className="p-2">{row.source_no || "-"}</td>
                  <td className="p-2 truncate max-w-[200px]" title={row.name}>{row.name || "-"}</td>
                  <td className="p-2 text-center font-bold">{row.currency_code || "GBP"}</td>
                  
                  {/* LCY Amounts */}
                  <td className="p-2 text-right text-blue-600 dark:text-blue-400">{Number(row.debit_lcy) > 0 ? Number(row.debit_lcy).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
                  <td className="p-2 text-right text-red-600 dark:text-red-400">{Number(row.credit_lcy) > 0 ? Number(row.credit_lcy).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
                  <td className={`p-2 text-right font-semibold ${Number(row.amount_lcy) >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-500"}`}>{Number(row.amount_lcy).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>

                  {/* FCY Amounts */}
                  <td className="p-2 text-right text-blue-600/70">{Number(row.debit_fcy) > 0 ? Number(row.debit_fcy).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
                  <td className="p-2 text-right text-red-600/70">{Number(row.credit_fcy) > 0 ? Number(row.credit_fcy).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
                  <td className="p-2 text-right font-semibold">{Number(row.amount_fcy).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>

                  <td className="p-2 capitalize">{row.balancing_account_type || "-"}</td>
                  <td className="p-2">{row.balancing_account_no || "-"}</td>
                  <td className="p-2 truncate max-w-[180px]" title={row.balancing_account_name}>{row.balancing_account_name || "-"}</td>
                  <td className="p-2">{row.entry_no || "-"}</td>
                  <td className="p-2 whitespace-nowrap">{row.posted_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4 font-mono">
            <div>
              Showing {data.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="hidden md:flex gap-3 border-l border-slate-300 dark:border-slate-700 pl-4 font-semibold">
              <span>Debit Total(LCY): <span className="text-blue-600 gap-3 border-r border-slate-300 dark:border-slate-700 pr-4">{pageDebitLCY.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              <span>Credit Total(LCY): <span className="text-red-600 gap-3 border-r border-slate-300 dark:border-slate-700 pr-4">{pageCreditLCY.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
              <span>Balance(LCY): <span className={pageBalanceLCY >= 0 ? "text-emerald-600" : "text-red-500"}>{pageBalanceLCY.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-14 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-left" className="text-base" />
              </Button>
              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                disabled={page >= pagination.totalPages || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-right" className="text-base" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import { useLoader } from "@/app/context/LoaderContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface LedgerRow {
  id: string;
  posting_date: string;
  document_type: string;
  document_no: string;
  gl_no: string;
  source_no: string;
  name: string;
  posting_group: string;
  debit: string | number;
  credit: string | number;
  amount: string | number;
  balancing_account_type: string;
  balancing_account_no: string;
  balancing_account_name: string;
  posted_by: string;
}

interface ModalProps {
  accountId: string;
  accountName: string;
  accountCode: string;
  onClose: () => void;
}

export default function LedgerDrilldownModal({
  accountId,
  accountName,
  accountCode,
  onClose,
}: ModalProps) {
  const [data, setData] = useState<LedgerRow[]>([]);
  const { show, hide } = useLoader();

  const [filters, setFilters] = useState<Record<string, string>>({
    posting_date: "",
    document_type: "",
    document_no: "",
    gl_no: "",
    source_no: "",
    name: "",
    posting_group: "",
    debit: "",
    credit: "",
    amount: "",
    balancing_account_type: "",
    balancing_account_no: "",
    balancing_account_name: "",
    posted_by: "",
  });

  useEffect(() => {
    async function fetchLedger() {
      try {
        show("Fetching Account Details...");
        const res = await fetch(`/api/finance/accounts/${accountId}/ledger`);
        if (res.ok) {
          const rows = await res.json();
          setData(rows);
        }
      } catch (err) {
        console.error(err);
      } finally {
        hide();
      }
    }
    fetchLedger();
  }, [accountId]);

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value.toLowerCase() }));
  };

  const filteredData = data.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const rowValue = String(row[key as keyof LedgerRow] || "").toLowerCase();
      return rowValue.includes(value);
    });
  });

  // Structural aggregates matching legacy balances footer
  const totalDebit = filteredData.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0,
  );
  const totalCredit = filteredData.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0,
  );
  const balanceAmount = totalDebit - totalCredit;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {accountCode} - {accountName}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-sans text-lg"
          >
            ✕
          </button>
        </div>


        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left table-fixed border-collapse text-[11px] min-w-[1400px]">
                <thead>
                  <tr className="bg-emerald-800 text-white font-bold tracking-wide border-b border-emerald-700">
                    <th className="p-2 border-r border-emerald-700">
                      Posting Date
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Document Type
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Document No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">G/L No.</th>
                    <th className="p-2 border-r border-emerald-700">
                      Source No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">Name</th>
                    <th className="p-2 border-r border-emerald-700">
                      Posting Group
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Debit
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Credit
                    </th>
                    <th className="p-2 border-r border-emerald-700 text-right">
                      Amount
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing Type
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing No.
                    </th>
                    <th className="p-2 border-r border-emerald-700">
                      Balancing Name
                    </th>
                    <th className="p-2">Posted By</th>
                  </tr>
                  <tr className="bg-emerald-900 border-b border-emerald-800">
                    {Object.keys(filters).map((col) => (
                      <td key={col} className="p-1 border-r border-emerald-800">
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) =>
                            handleFilterChange(col, e.target.value)
                          }
                          className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        No historical records matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono"
                      >
                        <td className="p-2 border-r dark:border-slate-800 whitespace-nowrap">
                          {format(row.posting_date, "dd/MM/yyyy")}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.document_type}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100">
                          {row.document_no}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.gl_no}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.source_no || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 truncate max-w-[200px]">
                          {row.name || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.posting_group || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-right text-blue-600 dark:text-blue-400">
                          {Number(row.debit) > 0
                            ? Number(row.debit).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-right text-red-600 dark:text-red-400">
                          {Number(row.credit) > 0
                            ? Number(row.credit).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td
                          className={`p-2 border-r dark:border-slate-800 text-right font-semibold ${Number(row.amount) >= 0 ? "text-slate-800 dark:text-slate-200" : "text-red-500"}`}
                        >
                          {Number(row.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.balancing_account_type || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800">
                          {row.balancing_account_no || "-"}
                        </td>
                        <td className="p-2 border-r dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          {row.balancing_account_name || "-"}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {row.posted_by}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center flex-wrap gap-2 text-xs font-mono">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Showing {filteredData.length} of {data.length} Records
          </div>
          <div className="flex gap-6 text-slate-900 dark:text-slate-100 font-bold">
            <div>
              Debit Total:{" "}
              <span className="text-blue-600">
                {totalDebit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div>
              Credit Total:{" "}
              <span className="text-red-600">
                {totalCredit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="border-l pl-6 border-slate-300 dark:border-slate-700">
              Balance:{" "}
              <span
                className={
                  balanceAmount >= 0 ? "text-emerald-600" : "text-red-500"
                }
              >
                {balanceAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                (FCY)
              </span>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="cancel"
           >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} */

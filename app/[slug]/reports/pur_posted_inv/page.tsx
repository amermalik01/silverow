// app/[slug]/reports/pur_posted_inv/page.tsx
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
  Printer,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";

// Modals
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type POLine = {
  id: string;
  item_code: string;
  description: string;
  quantity: number;
  unit_cost: number;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
};

type UnpostedPOHeader = {
  id: string;
  order_date: string;
  posting_date: string;
  po_no: string;
  supplier_no: string;
  supplier_name: string;
  req_receipt_date: string | null;
  receipt_date: string | null;
  shipping_city: string;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
  lines?: POLine[];
};

type ReportMeta = {
  title: string;
  start_date: string;
  end_date: string;
  report_type: string;
  view_mode: "summary" | "detailed";
  total_orders: number;
  total_amount_lcy: number;
  total_amount_incl_vat_lcy: number;
};

export default function UnpostedPurchaseOrdersReport() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter Bounds
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );
  const [reportType, setReportType] = useState("By Order Date");
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");

  const { show, hide } = useLoader();

  // Selection Arrays & Lookups
  const [selectedPurchasers, setSelectedPurchasers] = useState<Employee[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    SupplierLookupItem[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<ItemLookupRecord[]>([]);
  const [selectedGlAccounts, setSelectedGlAccounts] = useState<
    GLAccountLookupRecord[]
  >([]);

  // Modal Visibility Controls
  const [purchaserModalOpen, setPurchaserModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [glModalOpen, setGlModalOpen] = useState(false);

  // Export State
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Data Response States
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [orders, setOrders] = useState<UnpostedPOHeader[]>([]);

  const handleGenerateReport = async () => {
    if (!fromDate || !toDate) {
      setValidationError(
        "Both 'From Date' and 'To Date' are mandatory parameters.",
      );
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: format(fromDate, "yyyy-MM-dd"),
        endDate: format(toDate, "yyyy-MM-dd"),
        reportType,
        viewMode,
      });

      if (selectedPurchasers.length > 0) {
        params.append(
          "purchaserIds",
          selectedPurchasers.map((p) => p.id).join(","),
        );
      }
      if (selectedSuppliers.length > 0) {
        params.append(
          "supplierIds",
          selectedSuppliers.map((s) => s.id).join(","),
        );
      }
      if (selectedItems.length > 0) {
        params.append("itemIds", selectedItems.map((i) => i.id).join(","));
      }
      if (selectedGlAccounts.length > 0) {
        params.append(
          "glAccountIds",
          selectedGlAccounts.map((g) => g.id).join(","),
        );
      }

      const res = await fetch(
        `/api/reports/unposted-purchase-orders?${params.toString()}`,
      );
      if (!res.ok)
        throw new Error("Failed to fetch unposted purchase order report.");

      const json = await res.json();
      setMeta(json.data.report_meta);
      setOrders(json.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(startOfDay(new Date()));
    setReportType("By Order Date");
    setViewMode("summary");
    setSelectedPurchasers([]);
    setSelectedSuppliers([]);
    setSelectedItems([]);
    setSelectedGlAccounts([]);
    setMeta(null);
    setOrders([]);
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

  const exportToCSV = () => {
    if (orders.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    if (viewMode === "summary") {
      const headers = [
        "Order Date",
        "Posting Date",
        "PO No",
        "Supplier No",
        "Supplier Name",
        "Req Receipt Date",
        "Receipt Date",
        "Amount (LCY)",
        "Amount Incl VAT (LCY)",
        "Shipping City",
      ];

      const rows = orders.map((o) => [
        formatDate(o.order_date),
        formatDate(o.posting_date),
        `"${o.po_no}"`,
        `"${o.supplier_no}"`,
        `"${o.supplier_name.replace(/"/g, '""')}"`,
        formatDate(o.req_receipt_date),
        formatDate(o.receipt_date),
        o.amount_lcy,
        o.amount_incl_vat_lcy,
        `"${o.shipping_city}"`,
      ]);

      csvContent += [headers.join(","), ...rows.map((e) => e.join(","))].join(
        "\n",
      );
    } else {
      const rows: string[] = [];
      orders.forEach((o) => {
        rows.push(
          `PO Header,${o.po_no},${o.supplier_name},${formatDate(o.order_date)}`,
        );
        (o.lines || []).forEach((l) => {
          rows.push(
            `Line,${l.item_code},"${l.description.replace(/"/g, '""')}",${l.quantity},${l.unit_cost},${l.amount_lcy},${l.amount_incl_vat_lcy}`,
          );
        });
      });
      csvContent += rows.join("\n");
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Unposted_POs_${format(new Date(), "yyyyMMdd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMenuOpen(false);
  };

  const exportToExcel = () => {
    if (orders.length === 0) return;

    const formattedData = orders.map((o) => ({
      "Order Date": formatDate(o.order_date),
      "Posting Date": formatDate(o.posting_date),
      "PO No": o.po_no,
      "Supplier No": o.supplier_no,
      "Supplier Name": o.supplier_name,
      "Req Receipt Date": formatDate(o.req_receipt_date),
      "Receipt Date": formatDate(o.receipt_date),
      "Amount (LCY)": o.amount_lcy,
      "Amount Incl VAT (LCY)": o.amount_incl_vat_lcy,
      "Shipping City": o.shipping_city,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unposted POs");
    XLSX.writeFile(
      workbook,
      `Unposted_POs_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          { label: "Reports", href: `/${slug}/reports` },
          { label: "All Reports", href: `/${slug}/reports` },
          { label: "Posted Purchase Invoices and Debit Notes" },
        ]}
      />
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-center">
          {/* Mandatory Date Bounds */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Date Range Bounds <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  if (d && toDate) setValidationError(null);
                }}
                maxDate={toDate || new Date()}
                className={`w-full bg-white text-slate-900 border px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  !fromDate && validationError
                    ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-slate-700"
                }`}
              />
              <span className="text-slate-400 font-medium">to</span>
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
                    ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-slate-700"
                }`}
              />
            </div>
          </div>

          {/* Report Type Evaluation */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Report Type Evaluation
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="h-8 rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 cursor-pointer"
            >
              <option value="By Order Date">By Order Date</option>
              <option value="By Posting Date">By Posting Date</option>
            </select>
          </div>

          {/* View Mode Radio Group */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">View Format</label>
            <div className="flex items-center gap-4 h-8">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="viewMode"
                  value="summary"
                  checked={viewMode === "summary"}
                  onChange={() => setViewMode("summary")}
                  className="accent-emerald-500"
                />
                Summary
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="viewMode"
                  value="detailed"
                  checked={viewMode === "detailed"}
                  onChange={() => setViewMode("detailed")}
                  className="accent-emerald-500"
                />
                Detailed
              </label>
            </div>
          </div>

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
        </div>

        <hr className="border-emerald-900" />

        {/* Lookups Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Purchaser */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Purchaser(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setPurchaserModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Purchasers"
                value={
                  selectedPurchasers.length
                    ? `${selectedPurchasers.length} Purchaser(s)`
                    : ""
                }
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
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

          {/* Supplier */}
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
                placeholder="All Suppliers"
                value={
                  selectedSuppliers.length
                    ? `${selectedSuppliers.length} Supplier(s)`
                    : ""
                }
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
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

          {/* Item */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Item(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setItemModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Items"
                value={
                  selectedItems.length ? `${selectedItems.length} Item(s)` : ""
                }
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
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

          {/* G/L Account */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select G/L Account(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setGlModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All G/L Accounts"
                value={
                  selectedGlAccounts.length
                    ? `${selectedGlAccounts.length} Account(s)`
                    : ""
                }
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 pr-8 focus:outline-none cursor-pointer select-none"
              />
              {/* <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">
                ❐
              </span> */}

              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-1.5 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Silver Metallic Report Panel */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        {/* Document Header Metadata Section */}
        <div className="p-6 border-b border-slate-200 bg-slate-100/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-slate-700 h-5 w-5" /> Unposted Purchase
              Orders
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statement :{" "}
              <span className="font-semibold text-slate-700">
                {formatDate(fromDate) || "Required"}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700">
                {formatDate(toDate) || "Required"}
              </span>
            </p>
          </div>

          {/* Print & Export Actions */}
          <div className="flex gap-2 items-center">
            {/* <Button
              onClick={() => window.print()}
              disabled={orders.length === 0}
              className="border border-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" /> Print Preview
            </Button> */}

            <div className="relative">
              <Button
                disabled={orders.length === 0}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="border border-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded text-xs bg-white hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export As ▾
              </Button>

              {exportMenuOpen && orders.length > 0 && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                  <button
                    onClick={exportToExcel}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-slate-600" /> Excel
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
        </div>

        {/* SUMMARY TABLE */}
        {viewMode === "summary" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Order Date</th>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">PO No</th>
                  <th className="p-3">Supplier No</th>
                  <th className="p-3 min-w-[150px]">Supplier Name</th>
                  <th className="p-3">Req Receipt Date</th>
                  <th className="p-3">Receipt Date</th>
                  <th className="p-3 text-right">Amount (LCY)</th>
                  <th className="p-3 text-right">Amount Incl VAT (LCY)</th>
                  <th className="p-3">Shipping City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-12 text-center font-sans text-xs text-slate-400 italic"
                    >
                      Fetching unposted purchase order data...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-12 text-center font-sans text-xs text-slate-400 italic"
                    >
                      No unposted purchase orders found within specified date
                      bounds.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(po.order_date)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(po.posting_date)}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                        {po.po_no}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {po.supplier_no}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900 max-w-[200px] truncate">
                        {po.supplier_name}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(po.req_receipt_date) || "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(po.receipt_date) || "—"}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                        {formatCurrency(po.amount_lcy)}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                        {formatCurrency(po.amount_incl_vat_lcy)}
                      </td>
                      <td className="p-3 font-sans text-slate-600">
                        {po.shipping_city || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* DETAILED TABLE */}
        {viewMode === "detailed" && (
          <div className="p-4 space-y-6">
            {orders.map((po) => (
              <div
                key={po.id}
                className="border border-slate-200 rounded-md overflow-hidden shadow-sm"
              >
                {/* Order Header Summary Row */}
                <div className="bg-slate-100 p-3 flex flex-wrap justify-between text-xs font-semibold text-slate-800 border-b border-slate-200">
                  <div>
                    PO No:{" "}
                    <span className="text-slate-900 font-bold">{po.po_no}</span>
                  </div>
                  <div>
                    Supplier: {po.supplier_name} ({po.supplier_no})
                  </div>
                  <div>Order Date: {formatDate(po.order_date)}</div>
                  <div>City: {po.shipping_city || "—"}</div>
                </div>

                {/* Line Items Grid */}
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2 pl-4">Item Code</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Unit Cost</th>
                      <th className="p-2 text-right">Amount (LCY)</th>
                      <th className="p-2 text-right pr-4">
                        Amount Incl VAT (LCY)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {po.lines?.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="p-2 pl-4 font-sans font-medium text-slate-800">
                          {line.item_code}
                        </td>
                        <td className="p-2 font-sans text-slate-600">
                          {line.description}
                        </td>
                        <td className="p-2 text-right">{line.quantity}</td>
                        <td className="p-2 text-right">
                          {formatCurrency(line.unit_cost)}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-800">
                          {formatCurrency(line.amount_lcy)}
                        </td>
                        <td className="p-2 text-right pr-4 font-bold text-slate-900">
                          {formatCurrency(line.amount_incl_vat_lcy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Totals Section */}
        {meta && orders.length > 0 && (
          <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center font-sans text-xs font-semibold text-slate-600">
            <div>
              Total Orders:{" "}
              <span className="text-slate-900 font-bold">
                {meta.total_orders}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-white border border-slate-200 px-4 py-2.5 rounded shadow-sm text-right">
              <div>
                Total Amount (LCY):{" "}
                <span className="text-slate-900 font-bold font-mono ml-1">
                  {formatCurrency(meta.total_amount_lcy)}
                </span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-8">
                Total Incl VAT (LCY):{" "}
                <span className="text-slate-900 font-bold font-mono ml-1">
                  {formatCurrency(meta.total_amount_incl_vat_lcy)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lookup Modals */}
      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(suppliers) => setSelectedSuppliers(suppliers)}
      />

      <SalespersonLookupModal
        open={purchaserModalOpen}
        onClose={() => setPurchaserModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(purchasers) => setSelectedPurchasers(purchasers)}
      />

      <ItemLookupModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(items) => setSelectedItems(items)}
      />

      <GLAccountLookupModal
        open={glModalOpen}
        onClose={() => setGlModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(accounts) => setSelectedGlAccounts(accounts)}
      />
    </div>
  );
}
/* "use client";

import { useState } from "react";
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer,
  ChevronDown,
} from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

// Shared Modals
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";
import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";
import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

type DocumentLine = {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit_cost: number;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
};

type PostedDocHeader = {
  id: string;
  doc_type: "Invoice" | "Debit Note";
  doc_date: string;
  doc_no: string;
  order_no: string;
  supplier_no: string;
  supplier_name: string;
  supp_doc_no: string;
  city: string;
  currency_code: string;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
  lines?: DocumentLine[];
};

type ReportMeta = {
  title: string;
  start_date: string;
  end_date: string;
  doc_type: string;
  view_mode: "summary" | "detailed";
  total_records: number;
  total_amount_lcy: number;
  total_amount_incl_vat_lcy: number;
};

export default function PostedInvoicesAndDebitNotesReport() {
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Bounds & Control
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [docType, setDocType] = useState<"Both" | "Invoices" | "Debit Notes">("Both");
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");

  // Filter Lookups
  const [selectedPurchasers, setSelectedPurchasers] = useState<Employee[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierLookupItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemLookupRecord[]>([]);
  const [selectedGlAccounts, setSelectedGlAccounts] = useState<GLAccountLookupRecord[]>([]);

  // Modal Visibility States
  const [purchaserModalOpen, setPurchaserModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [glModalOpen, setGlModalOpen] = useState(false);

  // Dropdown States
  const [addFilterMenuOpen, setAddFilterMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Active Additional Filter Display Flags
  const [showItemFilter, setShowItemFilter] = useState(false);
  const [showGlFilter, setShowGlFilter] = useState(false);

  // Results
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [documents, setDocuments] = useState<PostedDocHeader[]>([]);

  const handleGenerateReport = async () => {
    if (!fromDate || !toDate) {
      setValidationError("Both 'From Date' and 'To Date' are mandatory parameters.");
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: format(fromDate, "yyyy-MM-dd"),
        endDate: format(toDate, "yyyy-MM-dd"),
        docType,
        viewMode,
      });

      if (selectedPurchasers.length > 0) {
        params.append("purchaserIds", selectedPurchasers.map((p) => p.id).join(","));
      }
      if (selectedSuppliers.length > 0) {
        params.append("supplierIds", selectedSuppliers.map((s) => s.id).join(","));
      }
      if (showItemFilter && selectedItems.length > 0) {
        params.append("itemIds", selectedItems.map((i) => i.id).join(","));
      }
      if (showGlFilter && selectedGlAccounts.length > 0) {
        params.append("glAccountIds", selectedGlAccounts.map((g) => g.id).join(","));
      }

      const res = await fetch(
        `/api/reports/posted-purchase-invoices-debit-notes?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch report data.");

      const json = await res.json();
      setMeta(json.data.report_meta);
      setDocuments(json.data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(startOfDay(new Date()));
    setDocType("Both");
    setViewMode("summary");
    setSelectedPurchasers([]);
    setSelectedSuppliers([]);
    setSelectedItems([]);
    setSelectedGlAccounts([]);
    setShowItemFilter(false);
    setShowGlFilter(false);
    setMeta(null);
    setDocuments([]);
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

  // Export to Excel
  const exportToExcel = () => {
    if (documents.length === 0) return;
    const formattedData = documents.map((d) => ({
      Type: d.doc_type,
      "Document Date": formatDate(d.doc_date),
      "Document No": d.doc_no,
      "Order No": d.order_no || "—",
      "Supplier No": d.supplier_no,
      "Supplier Name": d.supplier_name,
      "Supp. Doc No": d.supp_doc_no || "—",
      City: d.city || "—",
      "Amount (LCY)": d.amount_lcy,
      "Amount Incl VAT (LCY)": d.amount_incl_vat_lcy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Posted Invoices & DNs");
    XLSX.writeFile(
      workbook,
      `Posted_Invoices_DNs_${format(new Date(), "yyyyMMdd")}.xlsx`
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full p-4 space-y-6">

      <div className="bg-[#0f380a] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}


        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">

            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-200">
                Date <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  if (d && toDate) setValidationError(null);
                }}
                maxDate={toDate || new Date()}
                className={`w-36 bg-white text-slate-900 border px-2 py-1.5 rounded text-xs focus:outline-none ${
                  !fromDate && validationError ? "border-red-500 ring-1 ring-red-500" : "border-emerald-800"
                }`}
              />
              <DatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  if (fromDate && d) setValidationError(null);
                }}
                minDate={fromDate}
                maxDate={new Date()}
                className={`w-36 bg-white text-slate-900 border px-2 py-1.5 rounded text-xs focus:outline-none ${
                  !toDate && validationError ? "border-red-500 ring-1 ring-red-500" : "border-emerald-800"
                }`}
              />
            </div>


            <div className="relative">
              <button
                onClick={() => setAddFilterMenuOpen(!addFilterMenuOpen)}
                className="bg-emerald-900/60 hover:bg-emerald-800 text-white font-medium px-3 py-1.5 rounded border border-emerald-700/50 flex items-center gap-1 transition text-xs"
              >
                Add Filter(s) <ChevronDown className="h-3 w-3" />
              </button>

              {addFilterMenuOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-white text-slate-800 rounded shadow-lg border border-slate-200 py-1 z-30 text-xs">
                  <button
                    onClick={() => {
                      setShowItemFilter(true);
                      setAddFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 font-medium"
                  >
                    + Item Filter
                  </button>
                  <button
                    onClick={() => {
                      setShowGlFilter(true);
                      setAddFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 font-medium"
                  >
                    + G/L Account Filter
                  </button>
                </div>
              )}
            </div>
          </div>


          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow"
            >
              <Search className="h-3.5 w-3.5" /> {loading ? "Generating..." : "Generate Report"}
            </Button>
            <Button
              onClick={handleClearFilters}
              className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filter
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={documents.length === 0}
              className="bg-zinc-700 hover:bg-zinc-800 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" /> Print Preview
            </Button>

            <div className="relative">
              <Button
                disabled={documents.length === 0}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="bg-zinc-700 hover:bg-zinc-800 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition text-xs shadow disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export As <ChevronDown className="h-3 w-3" />
              </Button>

              {exportMenuOpen && documents.length > 0 && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded shadow-lg z-30 py-1 text-xs text-slate-800">
                  <button
                    onClick={exportToExcel}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">

          <div className="flex items-center gap-3">
            <label className="w-32 font-semibold text-slate-200">Select Purchaser(s)</label>
            <div
              className="relative flex-1 cursor-pointer"
              onClick={() => setPurchaserModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Purchasers"
                value={selectedPurchasers.length ? `${selectedPurchasers.length} Purchaser(s)` : ""}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer select-none text-xs"
              />
              <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">❐</span>
            </div>
          </div>


          <div className="flex items-center gap-3">
            <label className="w-32 font-semibold text-slate-200">Select Supplier(s)</label>
            <div
              className="relative flex-1 cursor-pointer"
              onClick={() => setSupplierModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Suppliers"
                value={selectedSuppliers.length ? `${selectedSuppliers.length} Supplier(s)` : ""}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer select-none text-xs"
              />
              <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">❐</span>
            </div>
          </div>


          <div className="flex items-center gap-3">
            <label className="w-32 font-semibold text-slate-200">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as "Both" | "Invoices" | "Debit Notes")}
              className="flex-1 h-8 rounded border-0 bg-white px-2.5 text-xs text-slate-900 outline-none cursor-pointer"
            >
              <option value="Both">Both</option>
              <option value="Invoices">Invoices Only</option>
              <option value="Debit Notes">Debit Notes Only</option>
            </select>
          </div>


          {showItemFilter && (
            <div className="flex items-center gap-3">
              <label className="w-32 font-semibold text-slate-200">Select Item(s)</label>
              <div className="relative flex-1 cursor-pointer" onClick={() => setItemModalOpen(true)}>
                <input
                  readOnly
                  placeholder="All Items"
                  value={selectedItems.length ? `${selectedItems.length} Item(s)` : ""}
                  className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer select-none text-xs"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">❐</span>
              </div>
            </div>
          )}

   
          {showGlFilter && (
            <div className="flex items-center gap-3">
              <label className="w-32 font-semibold text-slate-200">Select G/L Account(s)</label>
              <div className="relative flex-1 cursor-pointer" onClick={() => setGlModalOpen(true)}>
                <input
                  readOnly
                  placeholder="All G/L Accounts"
                  value={selectedGlAccounts.length ? `${selectedGlAccounts.length} Account(s)` : ""}
                  className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer select-none text-xs"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 pointer-events-none">❐</span>
              </div>
            </div>
          )}
        </div>


        <div className="flex items-center gap-6 pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="viewMode"
              value="summary"
              checked={viewMode === "summary"}
              onChange={() => setViewMode("summary")}
              className="accent-emerald-500"
            />
            Summary
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="viewMode"
              value="detailed"
              checked={viewMode === "detailed"}
              onChange={() => setViewMode("detailed")}
              className="accent-emerald-500"
            />
            Detailed
          </label>
        </div>
      </div>


      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
   
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-emerald-700 h-4 w-4" /> Posted Purchase Invoices and Debit Notes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statement Bounds:{" "}
              <span className="font-semibold text-slate-700">{formatDate(fromDate) || "Required"}</span> to{" "}
              <span className="font-semibold text-slate-700">{formatDate(toDate) || "Required"}</span>
            </p>
          </div>
        </div>

  
        {viewMode === "summary" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="p-3">Doc Type</th>
                  <th className="p-3">Doc Date</th>
                  <th className="p-3">Doc No</th>
                  <th className="p-3">Order No</th>
                  <th className="p-3">Supplier No</th>
                  <th className="p-3 min-w-[160px]">Supplier Name</th>
                  <th className="p-3">Supp Doc No</th>
                  <th className="p-3">City</th>
                  <th className="p-3 text-right">Amount (LCY)</th>
                  <th className="p-3 text-right">Amount Incl VAT (LCY)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center font-sans text-xs text-slate-400 italic">
                      Executing statement ledger aggregation...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center font-sans text-xs text-slate-400 italic">
                      No posted purchase invoices or debit notes found for specified parameters.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={`${doc.doc_type}-${doc.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.doc_type === "Invoice"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatDate(doc.doc_date)}</td>
                      <td className="p-3 font-semibold text-emerald-800 whitespace-nowrap">{doc.doc_no}</td>
                      <td className="p-3 whitespace-nowrap">{doc.order_no || "—"}</td>
                      <td className="p-3 whitespace-nowrap">{doc.supplier_no}</td>
                      <td className="p-3 font-sans font-medium text-slate-900 max-w-[200px] truncate">
                        {doc.supplier_name}
                      </td>
                      <td className="p-3 whitespace-nowrap">{doc.supp_doc_no || "—"}</td>
                      <td className="p-3 font-sans text-slate-600">{doc.city || "—"}</td>
                      <td
                        className={`p-3 text-right font-bold tabular-nums ${
                          doc.amount_lcy < 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(doc.amount_lcy)}
                      </td>
                      <td
                        className={`p-3 text-right font-bold tabular-nums ${
                          doc.amount_incl_vat_lcy < 0 ? "text-rose-600" : "text-emerald-800"
                        }`}
                      >
                        {formatCurrency(doc.amount_incl_vat_lcy)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}


        {viewMode === "detailed" && (
          <div className="p-4 space-y-6">
            {documents.map((doc) => (
              <div key={`${doc.doc_type}-${doc.id}`} className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-100 p-3 flex flex-wrap justify-between text-xs font-semibold text-slate-800 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        doc.doc_type === "Invoice"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {doc.doc_type}
                    </span>
                    <span>Doc No: <span className="text-emerald-800">{doc.doc_no}</span></span>
                  </div>
                  <div>Supplier: {doc.supplier_name} ({doc.supplier_no})</div>
                  <div>Date: {formatDate(doc.doc_date)}</div>
                  <div>Supp Doc: {doc.supp_doc_no || "—"}</div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2 pl-4">Item/Account Code</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Unit Cost</th>
                      <th className="p-2 text-right">Amount (LCY)</th>
                      <th className="p-2 text-right pr-4">Amount Incl VAT (LCY)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {doc.lines?.map((line) => (
                      <tr key={line.id}>
                        <td className="p-2 pl-4 font-sans font-medium text-slate-800">{line.code}</td>
                        <td className="p-2 font-sans text-slate-600">{line.description}</td>
                        <td className="p-2 text-right">{line.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(line.unit_cost)}</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(line.amount_lcy)}</td>
                        <td className="p-2 text-right pr-4 font-bold text-emerald-800">
                          {formatCurrency(line.amount_incl_vat_lcy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

  
        {meta && documents.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center text-xs font-semibold text-slate-600">
            <div>
              Total Records: <span className="text-slate-900 font-bold">{meta.total_records}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-white border border-slate-200 px-4 py-2.5 rounded shadow-sm text-right">
              <div>
                Net Total Amount (LCY):{" "}
                <span className="text-slate-900 font-bold font-mono ml-1">
                  {formatCurrency(meta.total_amount_lcy)}
                </span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-8">
                Net Total Incl VAT (LCY):{" "}
                <span className="text-emerald-800 font-bold font-mono ml-1">
                  {formatCurrency(meta.total_amount_incl_vat_lcy)}
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
        onSelectMultiple={(suppliers) => setSelectedSuppliers(suppliers)}
      />

      <SalespersonLookupModal
        open={purchaserModalOpen}
        onClose={() => setPurchaserModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(purchasers) => setSelectedPurchasers(purchasers)}
      />

      <ItemLookupModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(items) => setSelectedItems(items)}
      />

      <GLAccountLookupModal
              open={glModalOpen}
              onClose={() => setGlModalOpen(false)}
              multiple={true}
              onSelect={() => {}}
              onSelectMultiple={(accounts) => setSelectedGlAccounts(accounts)}
            />
    </div>
  );
} */

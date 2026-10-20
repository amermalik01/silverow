// app/[slug]/reports/stock_availability/page.tsx

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Icon } from "@iconify/react";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";
import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

// Types
type StockDetailEntry = {
  id: string;
  item_code: string;
  description: string;
  uom: string;
  consignment_no: string | null;
  ref_no: string | null;
  frame_no: string | null;
  doc_type: string;
  received_qty: number;
  sold_qty: number;
  allocated_qty: number;
  available_qty: number;
  date_received: string | null;
  expiry_date: string | null;
  unit_cost?: number;
  total_value?: number;
};

type StockSummaryEntry = {
  item_code: string;
  description: string;
  uom: string;
  warehouse_name?: string;
  available_qty: number;
  allocated_qty: number;
  current_qty: number;
  unit_cost?: number;
  total_value?: number;
};

type StockGroup = {
  warehouse_id: string;
  warehouse_name: string;
  entries: (StockDetailEntry | StockSummaryEntry)[];
  total_stock_qty: number;
  total_allocated_qty: number;
  total_available_qty: number;
  total_stock_value?: number;
};

export default function StockAvailabilityReport() {
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const { show, hide } = useLoader();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter States (matching legacy UI)
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedItemsText, setSelectedItemsText] = useState<string>("");

  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>(
    [],
  );
  const [selectedWarehousesText, setSelectedWarehousesText] =
    useState<string>("");

  const [purchasesDateType, setPurchasesDateType] =
    useState<string>("Invoice Date");
  const [salesDateType, setSalesDateType] = useState<string>("Invoice Date");

  const [showResultsBy, setShowResultsBy] = useState<string>("By Item");
  const [reportMode, setReportMode] = useState<"summary" | "detailed">(
    "detailed",
  );
  const [byValue, setByValue] = useState<boolean>(false);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Report Data State
  const [reportData, setReportData] = useState<StockGroup[]>([]);

  const handleGenerateReport = async () => {
    if (!asOfDate) {
      setValidationError("'Date' parameter is mandatory.");
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append("asOfDate", format(asOfDate, "yyyy-MM-dd"));
      if (selectedItemIds.length > 0)
        queryParams.append("itemIds", selectedItemIds.join(","));
      if (selectedWarehouseIds.length > 0)
        queryParams.append("warehouseIds", selectedWarehouseIds.join(","));
      queryParams.append("purchasesDateType", purchasesDateType);
      queryParams.append("salesDateType", salesDateType);
      queryParams.append("showResultsBy", showResultsBy);
      queryParams.append("mode", reportMode);
      queryParams.append("byValue", String(byValue));

      const res = await fetch(
        `/api/reports/stock-availability?${queryParams.toString()}`,
      );
      if (!res.ok) throw new Error("Failed fetching stock availability report");

      const json = await res.json();
      setReportData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setAsOfDate(startOfDay(new Date()));
    setSelectedItemIds([]);
    setSelectedItemsText("");
    setSelectedWarehouseIds([]);
    setSelectedWarehousesText("");
    setPurchasesDateType("Invoice Date");
    setSalesDateType("Invoice Date");
    setShowResultsBy("By Item");
    setReportMode("detailed");
    setByValue(false);
    setReportData([]);
    setValidationError(null);
  };

  const formatNumber = (val: number | string, decimals = 0) => {
    const num = Number(val || 0);
    if (num === 0) return "-";
    return num.toLocaleString("en-GB", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  // Grand totals computed across groups
  const grandTotalStock = reportData.reduce(
    (acc, g) => acc + g.total_stock_qty,
    0,
  );
  const grandTotalAllocated = reportData.reduce(
    (acc, g) => acc + g.total_allocated_qty,
    0,
  );
  const grandTotalAvailable = reportData.reduce(
    (acc, g) => acc + g.total_available_qty,
    0,
  );

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const flatRows: Record<string, string | number>[] = [];

    reportData.forEach((group) => {
      group.entries.forEach((e) => {
        const detailEntry = e as StockDetailEntry;
        const summaryEntry = e as StockSummaryEntry;

        flatRows.push({
          Warehouse: group.warehouse_name,
          "Item No": e.item_code,
          Description: e.description,
          "U.O.M": e.uom,
          ...(reportMode === "detailed"
            ? {
                "Consignment No": detailEntry.consignment_no || "",
                "Ref. No": detailEntry.ref_no || "",
                "Frame No": detailEntry.frame_no || "",
                "Doc. Type": detailEntry.doc_type.replace(/_/g, " ") || "",
                "Received Qty": detailEntry.received_qty,
                "Sold Qty": detailEntry.sold_qty,
                "Date Received": formatDate(detailEntry.date_received),
                "Expiry Date": formatDate(detailEntry.expiry_date),
              }
            : {}),
          "Available Qty": e.available_qty ?? summaryEntry.current_qty,
          "Allocated Qty": e.allocated_qty,
          ...(reportMode === "summary"
            ? { "Current Qty": summaryEntry.current_qty }
            : {}),
          ...(byValue
            ? {
                "Unit Cost": e.unit_cost || 0,
                "Total Value": e.total_value || 0,
              }
            : {}),
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(workbook, ws, "Stock Availability");
    XLSX.writeFile(
      workbook,
      `Stock_Availability_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          //   { label: "Reports", href: `/${params.slug}/reports` },
          { label: "All Reports", href: `/${params.slug}/reports` },
          { label: "Stock Availability Report" },
        ]}
      />

      {/* Filter Board Container */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-center">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Date <span className="text-red-400">*</span>
            </label>
            <DatePicker
              value={asOfDate}
              onChange={(d) => {
                setAsOfDate(d);
                if (d) setValidationError(null);
              }}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
            />
          </div>

          {/* Select Item(s) */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="font-semibold text-slate-200">
              Select Item(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsItemModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Items Selected"
                value={selectedItemsText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Select Warehouse */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Warehouse
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsWarehouseModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Warehouses"
                value={selectedWarehousesText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Purchases Date Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">Purchases</label>
            <select
              value={purchasesDateType}
              onChange={(e) => setPurchasesDateType(e.target.value)}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none text-xs"
            >
              <option value="Invoice Date">Invoice Date</option>
              <option value="Receipt Date">Receipt Date</option>
            </select>
          </div>

          {/* Sales Date Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">Sales</label>
            <select
              value={salesDateType}
              onChange={(e) => setSalesDateType(e.target.value)}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none text-xs"
            >
              <option value="Invoice Date">Invoice Date</option>
              <option value="Delivery Date">Delivery Date</option>
            </select>
          </div>

          {/* Show Results By */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Show Results By
            </label>
            <select
              value={showResultsBy}
              onChange={(e) => setShowResultsBy(e.target.value)}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none text-xs"
            >
              <option value="By Item">By Item</option>
              <option value="By Warehouse">By Warehouse</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end items-end pt-2 md:col-span-1">
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

        {/* Toggles Row */}
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-emerald-900/60 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="reportMode"
                checked={reportMode === "summary"}
                onChange={() => setReportMode("summary")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              Summary
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="reportMode"
                checked={reportMode === "detailed"}
                onChange={() => setReportMode("detailed")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              Detailed
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={byValue}
                onChange={(e) => setByValue(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Stock Availability By Value
            </label>
          </div>
        </div>
      </div>

      {/* Presentation Shell */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-700 h-5 w-5" />
            <h1 className="text-base font-bold text-slate-900">
              Stock Availability Report -{" "}
              {reportMode === "detailed" ? "Detailed" : "Summary"}
            </h1>
          </div>

          <div className="relative">
            <Button
              disabled={reportData.length === 0}
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

        <div className="p-6 space-y-12">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              Generating stock availability matrix...
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No stock data available for the selected parameters as at{" "}
              {formatDate(asOfDate)}.
            </div>
          ) : (
            <>
              {reportData.map((group, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-6 space-y-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Warehouse :{" "}
                        <span className="font-normal text-emerald-900">
                          {group.warehouse_name}
                        </span>
                      </h2>
                      <p className="text-slate-500 pt-1">
                        As at{" "}
                        <span className="font-bold">
                          {formatDate(asOfDate)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-[11px] font-semibold text-slate-600">
                      Hygge Bikes Ltd
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#0b3310] text-white font-bold">
                        <tr>
                          <th className="p-2.5">Item No.</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">U.O.M</th>
                          {reportMode === "detailed" && (
                            <>
                              <th className="p-2.5">Consignment No.</th>
                              <th className="p-2.5">Ref. No</th>
                              <th className="p-2.5">Frame No</th>
                              <th className="p-2.5">Doc. Type</th>
                              <th className="p-2.5 text-right">
                                Received Qty.
                              </th>
                              <th className="p-2.5 text-right">Sold Qty.</th>
                            </>
                          )}
                          <th className="p-2.5 text-right">
                            {reportMode === "detailed"
                              ? "Allocated Qty."
                              : "Available Qty."}
                          </th>
                          <th className="p-2.5 text-right">
                            {reportMode === "detailed"
                              ? "Available Qty."
                              : "Allocated Qty."}
                          </th>
                          {reportMode === "detailed" && (
                            <>
                              <th className="p-2.5">Date Received</th>
                              <th className="p-2.5">Expiry Date</th>
                            </>
                          )}
                          {reportMode === "summary" && (
                            <th className="p-2.5 text-right">Current Qty.</th>
                          )}
                          {byValue && (
                            <>
                              <th className="p-2.5 text-right">Unit Cost</th>
                              <th className="p-2.5 text-right">Total Value</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                        {group.entries.map((e, eIdx) => {
                          const detail = e as StockDetailEntry;
                          const summary = e as StockSummaryEntry;

                          return (
                            <tr key={eIdx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-semibold text-emerald-800">
                                {e.item_code}
                              </td>
                              <td className="p-2.5 font-sans">
                                {e.description}
                              </td>
                              <td className="p-2.5 font-sans">{e.uom}</td>
                              {reportMode === "detailed" && (
                                <>
                                  <td className="p-2.5 font-sans text-slate-500">
                                    {detail.consignment_no || "—"}
                                  </td>
                                  <td className="p-2.5 font-sans text-slate-500">
                                    {detail.ref_no || "—"}
                                  </td>
                                  <td className="p-2.5 font-sans text-slate-500">
                                    {detail.frame_no || "—"}
                                  </td>
                                  <td className="p-2.5 font-sans capitalize">
                                    {detail.doc_type
                                      .replace(/_/g, " ")
                                      .toLowerCase()
                                      .replace(/\b\w/g, (s) =>
                                        s.toUpperCase(),
                                      ) || "—"}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums">
                                    {formatNumber(detail.received_qty)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums">
                                    {formatNumber(detail.sold_qty)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums">
                                    {formatNumber(detail.allocated_qty)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums font-bold">
                                    {formatNumber(detail.available_qty)}
                                  </td>
                                  <td className="p-2.5 font-sans">
                                    {formatDate(detail.date_received)}
                                  </td>
                                  <td className="p-2.5 font-sans">
                                    {formatDate(detail.expiry_date)}
                                  </td>
                                </>
                              )}
                              {reportMode === "summary" && (
                                <>
                                  <td className="p-2.5 text-right tabular-nums font-bold">
                                    {formatNumber(summary.available_qty)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums">
                                    {formatNumber(summary.allocated_qty)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums font-bold">
                                    {formatNumber(summary.current_qty)}
                                  </td>
                                </>
                              )}
                              {byValue && (
                                <>
                                  <td className="p-2.5 text-right tabular-nums">
                                    {formatNumber(e.unit_cost || 0, 2)}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums font-bold">
                                    {formatNumber(e.total_value || 0, 2)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td
                            colSpan={reportMode === "detailed" ? 11 : 3}
                            className="p-2.5 text-right font-sans"
                          >
                            Total
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_available_qty)}
                          </td>
                          {reportMode === "summary" && (
                            <>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(group.total_allocated_qty)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(group.total_stock_qty)}
                              </td>
                            </>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 space-y-2 text-xs font-mono">
                <div className="font-bold text-slate-900 pb-1 border-b border-slate-300 font-sans">
                  Grand Total As at {formatDate(asOfDate)}
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-sans text-slate-700 font-semibold">
                    Total Stock Qty.
                  </span>
                  <span className="font-bold">
                    {formatNumber(grandTotalStock, 2)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-sans text-slate-700 font-semibold">
                    Total Allocated Stock Qty.
                  </span>
                  <span className="font-bold">
                    {formatNumber(grandTotalAllocated, 2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-200">
                  <span className="font-sans text-slate-900 font-bold">
                    Total Available Stock Qty.
                  </span>
                  <span className="font-bold text-emerald-900">
                    {formatNumber(grandTotalAvailable, 2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          multiple={true}
          onClose={() => setIsItemModalOpen(false)}
          onSelectMultiple={(items: ItemLookupRecord[]) => {
            setSelectedItemIds(items.map((i) => i.id));
            setSelectedItemsText(
              items.map((i) => `${i.item_code} - ${i.description}`).join("; "),
            );
          }}
        />
      )}

      {isWarehouseModalOpen && (
        <WarehouseLookupModal
          open={isWarehouseModalOpen}
          multiple={true}
          onClose={() => setIsWarehouseModalOpen(false)}
          onSelectMultiple={(warehouses: WarehouseLookupRecord[]) => {
            setSelectedWarehouseIds(warehouses.map((w) => w.id));
            setSelectedWarehousesText(warehouses.map((w) => w.name).join("; "));
          }}
        />
      )}
    </div>
  );
}

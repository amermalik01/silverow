// app/[slug]/reports/inv_pur_supp/page.tsx

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

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

type PurchaseEntry = {
  id: string;
  invoice_no: string;
  supplier_no: string;
  supplier_name: string;
  uom: string;
  quantity: number;
  amount_lcy: number;
  amount_incl_vat: number;
};

type PurchaseGroup = {
  item_id: string;
  item_no: string;
  description: string;
  entries: PurchaseEntry[];
  total_qty: number;
  total_amount_lcy: number;
  total_amount_incl_vat: number;
};

export default function ItemPurchasesBySupplierReport() {
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const { show, hide } = useLoader();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfMonth(new Date()),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endOfMonth(new Date()),
  );

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedItemsText, setSelectedItemsText] = useState<string>("");

  const [selectedGlIds, setSelectedGlIds] = useState<string[]>([]);
  const [selectedGlText, setSelectedGlText] = useState<string>("");

  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedSuppliersText, setSelectedSuppliersText] = useState<string>("");

  const [reportType, setReportType] = useState<string>("Detailed"); // Detailed | Summary
  
  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Report Data State
  const [reportData, setReportData] = useState<PurchaseGroup[]>([]);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setValidationError("Both From and To date parameters are mandatory.");
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append("startDate", format(startDate, "yyyy-MM-dd"));
      queryParams.append("endDate", format(endDate, "yyyy-MM-dd"));
      if (selectedItemIds.length > 0)
        queryParams.append("itemIds", selectedItemIds.join(","));
      if (selectedSupplierIds.length > 0)
        queryParams.append("supplierIds", selectedSupplierIds.join(","));
      queryParams.append("reportType", reportType);

      const res = await fetch(
        `/api/reports/inv-pur-supp?${queryParams.toString()}`,
      );
      if (!res.ok) throw new Error("Failed fetching item purchases by supplier");

      const json = await res.json();
      setReportData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
    setSelectedItemIds([]);
    setSelectedItemsText("");
    setSelectedGlIds([]);
    setSelectedGlText("");
    setSelectedSupplierIds([]);
    setSelectedSuppliersText("");
    setReportType("Detailed");
    setReportData([]);
    setValidationError(null);
  };

  const formatNumber = (val: number | string, decimals = 2) => {
    const num = Number(val || 0);
    if (num === 0) return "0.00";
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

  // Grand Totals
  const grandTotalQty = reportData.reduce((acc, g) => acc + g.total_qty, 0);
  const grandTotalAmountLcy = reportData.reduce(
    (acc, g) => acc + g.total_amount_lcy,
    0,
  );
  const grandTotalAmountInclVat = reportData.reduce(
    (acc, g) => acc + g.total_amount_incl_vat,
    0,
  );

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const flatRows: Record<string, string | number>[] = [];

    reportData.forEach((group) => {
      if (reportType === "Detailed") {
        group.entries.forEach((e) => {
          flatRows.push({
            "Item No": group.item_no,
            "Item Description": group.description,
            "Invoice No.": e.invoice_no,
            "Supplier No.": e.supplier_no,
            "Supplier Name": e.supplier_name,
            "U.O.M": e.uom,
            Quantity: e.quantity,
            "Amount (LCY)": e.amount_lcy,
            "Amount Incl. VAT (LCY)": e.amount_incl_vat,
          });
        });
      } else {
        group.entries.forEach((e) => {
          flatRows.push({
            "Item No": group.item_no,
            "Item Description": group.description,
            "Supplier No.": e.supplier_no,
            "Supplier Name": e.supplier_name,
            "U.O.M": e.uom,
            Quantity: e.quantity,
            "Amount (LCY)": e.amount_lcy,
            "Amount Incl. VAT (LCY)": e.amount_incl_vat,
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(workbook, ws, "Item Purchases By Supplier");
    XLSX.writeFile(
      workbook,
      `Item_Purchases_By_Supplier_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          { label: "Reports", href: `/${params.slug}/reports` },
          { label: "All Reports", href: `/${params.slug}/reports` },
          { label: "Item Purchases By Supplier(s)" },
        ]}
      />

      {/* Filter Board Container */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">
          {/* Date Range Inputs */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="font-semibold text-slate-200">
              Date Range <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  if (d) setValidationError(null);
                }}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
              />
              <DatePicker
                value={endDate}
                onChange={(d) => {
                  setEndDate(d);
                  if (d) setValidationError(null);
                }}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end items-end pt-5">
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

          {/* Select Item(s) */}
          <div className="flex flex-col gap-1 md:col-span-3">
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

          {/* Select G/L No.(s) */}
          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select G/L No.(s)
            </label>
            <div className="relative cursor-pointer">
              <input
                readOnly
                placeholder="All G/L Accounts Selected"
                value={selectedGlText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Select Supplier(s) */}
          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select Supplier(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsSupplierModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Suppliers Selected"
                value={selectedSuppliersText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Report Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white text-slate-900 border border-emerald-800 px-2.5 py-1.5 rounded focus:outline-none text-xs"
            >
              <option value="Detailed">Detailed</option>
              <option value="Summary">Summary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Presentation Shell */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-700 h-5 w-5" />
            <h1 className="text-base font-bold text-slate-900">
              Item Purchases by Supplier(s) - {reportType}
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
              Generating item purchase matrix...
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No purchase records found for the selected date range.
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
                        No. :{" "}
                        <span className="font-semibold text-emerald-800">
                          {group.item_no}
                        </span>
                      </h2>
                      <p className="text-slate-600 pt-0.5">
                        Description :{" "}
                        <span className="font-medium text-slate-800">
                          {group.description}
                        </span>
                      </p>
                      <p className="text-slate-500 pt-1">
                        From {formatDate(startDate)} to {formatDate(endDate)}
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
                          {reportType === "Detailed" && (
                            <th className="p-2.5">Invoice No.</th>
                          )}
                          <th className="p-2.5">Supplier No.</th>
                          <th className="p-2.5">Supplier Name</th>
                          <th className="p-2.5">U.O.M</th>
                          <th className="p-2.5 text-right">Quantity</th>
                          <th className="p-2.5 text-right">Amount (LCY)</th>
                          <th className="p-2.5 text-right">
                            Amount Incl. VAT (LCY)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                        {group.entries.map((e, eIdx) => (
                          <tr key={eIdx} className="hover:bg-slate-50">
                            {reportType === "Detailed" && (
                              <td className="p-2.5 font-semibold text-emerald-800">
                                {e.invoice_no}
                              </td>
                            )}
                            <td className="p-2.5 font-sans">{e.supplier_no}</td>
                            <td className="p-2.5 font-sans">{e.supplier_name}</td>
                            <td className="p-2.5 font-sans">{e.uom}</td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(e.quantity, 0)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(e.amount_lcy)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums font-bold">
                              {formatNumber(e.amount_incl_vat)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td
                            colSpan={reportType === "Detailed" ? 4 : 3}
                            className="p-2.5 text-right font-sans"
                          >
                            Total - {group.description} ({group.item_no}):
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_qty, 0)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_amount_lcy)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_amount_incl_vat)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Grand Total Footer Summary Box */}
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 space-y-2 text-xs font-mono">
                <div className="font-bold text-slate-900 pb-1 border-b border-slate-300 font-sans">
                  Grand Total
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-sans text-slate-700 font-semibold">
                    Quantity
                  </span>
                  <span className="font-bold">
                    {formatNumber(grandTotalQty, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-sans text-slate-700 font-semibold">
                    Amount (Incl. VAT)
                  </span>
                  <span className="font-bold">
                    {formatNumber(grandTotalAmountInclVat)} GBP
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-200">
                  <span className="font-sans text-slate-900 font-bold">
                    Amount (Excl. VAT)
                  </span>
                  <span className="font-bold text-emerald-900">
                    {formatNumber(grandTotalAmountLcy)} GBP
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
              items.map((i) => `${i.item_code} - ${i.name}`).join("; "),
            );
          }}
        />
      )}

      {isSupplierModalOpen && (
        <SupplierLookupModal
          open={isSupplierModalOpen}
          multiple={true}
          onClose={() => setIsSupplierModalOpen(false)}
          onSelectMultiple={(suppliers: SupplierLookupItem[]) => {
            setSelectedSupplierIds(suppliers.map((s) => s.id));
            setSelectedSuppliersText(
              suppliers.map((s) => s.name).join("; "),
            );
          }}
        />
      )}
    </div>
  );
}

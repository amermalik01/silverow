// app/[slug]/reports/inv_fig_item/page.tsx

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

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type SalesFigureEntry = {
  id: string;
  posting_date: string;
  doc_type: string;
  doc_no: string;
  customer_name: string;
  salesperson: string;
  quantity: number;
  uom: string;
  unit_price: number;
  amount_lcy: number;
  amount_incl_vat: number;
};

type SalesFigureGroup = {
  item_id: string;
  item_no: string;
  description: string;
  entries: SalesFigureEntry[];
  total_qty: number;
  total_amount_lcy: number;
  total_amount_incl_vat: number;
};

export default function SalesFiguresByItemReport() {
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

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedCustomersText, setSelectedCustomersText] =
    useState<string>("");

  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<
    string[]
  >([]);
  const [selectedSalespersonsText, setSelectedSalespersonsText] =
    useState<string>("");

  const [reportType, setReportType] = useState<string>("Detailed"); // Detailed | Summary
  const [showUnposted, setShowUnposted] = useState<boolean>(false);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Report Data State
  const [reportData, setReportData] = useState<SalesFigureGroup[]>([]);

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
      if (selectedCustomerIds.length > 0)
        queryParams.append("customerIds", selectedCustomerIds.join(","));
      if (selectedSalespersonIds.length > 0)
        queryParams.append("salespersonIds", selectedSalespersonIds.join(","));
      queryParams.append("reportType", reportType);
      queryParams.append("showUnposted", String(showUnposted));

      const res = await fetch(
        `/api/reports/inv-fig-item?${queryParams.toString()}`,
      );
      if (!res.ok) throw new Error("Failed fetching sales figures by item");

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
    setSelectedCustomerIds([]);
    setSelectedCustomersText("");
    setSelectedSalespersonIds([]);
    setSelectedSalespersonsText("");
    setReportType("Detailed");
    setShowUnposted(false);
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
            "Posting Date": formatDate(e.posting_date),
            "Doc. Type": e.doc_type.replace(/_/g, " "),
            "Doc. No": e.doc_no,
            "Customer Name": e.customer_name,
            Salesperson: e.salesperson,
            Quantity: e.quantity,
            "U.O.M": e.uom,
            "Unit Price": e.unit_price,
            "Amount (LCY)": e.amount_lcy,
            "Amount Incl. VAT (LCY)": e.amount_incl_vat,
          });
        });
      } else {
        flatRows.push({
          "Item No": group.item_no,
          "Item Name": group.description,
          Quantity: group.total_qty,
          "Sales (LCY)": group.total_amount_lcy,
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(workbook, ws, "Sales Figures By Item");
    XLSX.writeFile(
      workbook,
      `Sales_Figures_By_Item_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          // { label: "Reports", href: `/${params.slug}/reports` },
          { label: "All Reports", href: `/${params.slug}/reports` },
          { label: "Sales Figures By Item(s)" },
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

          {/* Select Customer(s) */}
          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select Customer(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Customers Selected"
                value={selectedCustomersText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Select Salesperson(s) */}
          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select Salesperson(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsSalespersonModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Salespersons Selected"
                value={selectedSalespersonsText}
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

        {/* Checkbox Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-emerald-900/60 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={showUnposted}
              onChange={(e) => setShowUnposted(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Show Only Un-posted Figure
          </label>
        </div>
      </div>

      {/* Presentation Shell */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-700 h-5 w-5" />
            <h1 className="text-base font-bold text-slate-900">
              Sales Figures by Item(s) - {reportType}
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
              Generating sales figures matrix...
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No sales records found for the selected date range.
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
                        Item No. :{" "}
                        <span className="font-semibold text-emerald-800">
                          {group.item_no}
                        </span>
                      </h2>
                      <p className="text-slate-600 pt-0.5">
                        Item Description :{" "}
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
                          {reportType === "Detailed" ? (
                            <>
                              <th className="p-2.5">Posting Date</th>
                              <th className="p-2.5">Doc. Type</th>
                              <th className="p-2.5">Doc. No.</th>
                              <th className="p-2.5">Cust. Name</th>
                              <th className="p-2.5">Salesperson</th>
                              <th className="p-2.5 text-right">Qty.</th>
                              <th className="p-2.5">U.O.M</th>
                              <th className="p-2.5 text-right">Unit Price</th>
                              <th className="p-2.5 text-right">Amount (LCY)</th>
                              <th className="p-2.5 text-right">
                                Amount Incl. VAT (LCY)
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="p-2.5">Item No.</th>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5 text-right">Quantity</th>
                              <th className="p-2.5 text-right">Sales (LCY)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                        {reportType === "Detailed" ? (
                          group.entries.map((e, eIdx) => (
                            <tr key={eIdx} className="hover:bg-slate-50">
                              <td className="p-2.5">
                                {formatDate(e.posting_date)}
                              </td>
                              <td className="p-2.5 font-sans capitalize">
                                {e.doc_type
                                  .replace(/_/g, " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (s) => s.toUpperCase())}
                              </td>
                              <td className="p-2.5 font-semibold text-emerald-800">
                                {e.doc_no}
                              </td>
                              <td className="p-2.5 font-sans">
                                {e.customer_name}
                              </td>
                              <td className="p-2.5 font-sans">
                                {e.salesperson}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.quantity, 0)}
                              </td>
                              <td className="p-2.5 font-sans">{e.uom}</td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.unit_price)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.amount_lcy)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums font-bold">
                                {formatNumber(e.amount_incl_vat)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-emerald-800">
                              {group.item_no}
                            </td>
                            <td className="p-2.5 font-sans">
                              {group.description}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(group.total_qty, 0)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums font-bold">
                              {formatNumber(group.total_amount_lcy)} GBP
                            </td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td
                            colSpan={reportType === "Detailed" ? 5 : 2}
                            className="p-2.5 text-right font-sans"
                          >
                            Total:
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_qty, 0)}
                          </td>
                          {reportType === "Detailed" && (
                            <td colSpan={2} className="p-2.5"></td>
                          )}
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_amount_lcy)}
                            {reportType === "Summary" ? " GBP" : ""}
                          </td>
                          {reportType === "Detailed" && (
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(group.total_amount_incl_vat)}
                            </td>
                          )}
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

      {isCustomerModalOpen && (
        <CustomerLookupModal
          open={isCustomerModalOpen}
          multiple={true}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectMultiple={(customers: CustomerLookupItem[]) => {
            setSelectedCustomerIds(customers.map((c) => c.id));
            setSelectedCustomersText(customers.map((c) => c.name).join("; "));
          }}
        />
      )}

      {isSalespersonModalOpen && (
        <SalespersonLookupModal
          open={isSalespersonModalOpen}
          multiple={true}
          onClose={() => setIsSalespersonModalOpen(false)}
          onSelectMultiple={(salespersons: Employee[]) => {
            setSelectedSalespersonIds(salespersons.map((s) => s.id));
            setSelectedSalespersonsText(
              salespersons
                .map(
                  (s) =>
                    `${s.employee_code || ""} - ${s.display_name || ""}` ||
                    s.display_name,
                )
                .join("; "),
            );
          }}
        />
      )}
    </div>
  );
}

/* "use client";

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

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type SalesFigureEntry = {
  id: string;
  posting_date: string;
  doc_type: string;
  doc_no: string;
  customer_name: string;
  salesperson: string;
  quantity: number;
  uom: string;
  unit_price: number;
  amount_lcy: number;
  amount_incl_vat: number;
};

type SalesFigureGroup = {
  item_id: string;
  item_no: string;
  description: string;
  entries: SalesFigureEntry[];
  total_qty: number;
  total_amount_lcy: number;
  total_amount_incl_vat: number;
};

export default function SalesFiguresByItemReport() {
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

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedCustomersText, setSelectedCustomersText] =
    useState<string>("");

  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<
    string[]
  >([]);
  const [selectedSalespersonsText, setSelectedSalespersonsText] =
    useState<string>("");

  const [reportType, setReportType] = useState<string>("Detailed"); // Detailed | Summary
  const [showUnposted, setShowUnposted] = useState<boolean>(false);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  // const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Report Data State
  const [reportData, setReportData] = useState<SalesFigureGroup[]>([]);

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
      if (selectedCustomerIds.length > 0)
        queryParams.append("customerIds", selectedCustomerIds.join(","));
      if (selectedSalespersonIds.length > 0)
        queryParams.append("salespersonIds", selectedSalespersonIds.join(","));
      queryParams.append("reportType", reportType);
      queryParams.append("showUnposted", String(showUnposted));

      const res = await fetch(
        `/api/reports/inv-fig-item?${queryParams.toString()}`,
      );
      if (!res.ok) throw new Error("Failed fetching sales figures by item");

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
    setSelectedCustomerIds([]);
    setSelectedCustomersText("");
    setSelectedSalespersonIds([]);
    setSelectedSalespersonsText("");
    setReportType("Detailed");
    setShowUnposted(false);
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
            "Posting Date": formatDate(e.posting_date),
            "Doc. Type": e.doc_type,
            "Doc. No": e.doc_no,
            "Customer Name": e.customer_name,
            Salesperson: e.salesperson,
            Quantity: e.quantity,
            "U.O.M": e.uom,
            "Unit Price": e.unit_price,
            "Amount (LCY)": e.amount_lcy,
            "Amount Incl. VAT (LCY)": e.amount_incl_vat,
          });
        });
      } else {
        flatRows.push({
          "Item No": group.item_no,
          "Item Name": group.description,
          Quantity: group.total_qty,
          "Sales (LCY)": group.total_amount_lcy,
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(workbook, ws, "Sales Figures By Item");
    XLSX.writeFile(
      workbook,
      `Sales_Figures_By_Item_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    setExportMenuOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          { label: "Reports", href: `/${params.slug}/reports` },
          { label: "All Reports", href: `/${params.slug}/reports` },
          { label: "Sales Figures By Item(s)" },
        ]}
      />


      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        {validationError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium">
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">

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


          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select Customer(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Customers Selected"
                value={selectedCustomersText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>


          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="font-semibold text-slate-200">
              Select Salesperson(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => {
              }}
            >
              <input
                readOnly
                placeholder="All Salespersons Selected"
                value={selectedSalespersonsText}
                className="w-full bg-white text-slate-800 rounded px-2.5 py-1.5 pr-8 focus:outline-none cursor-pointer text-xs"
              />
              <Icon
                icon="tabler:external-link"
                className="absolute right-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none"
              />
            </div>
          </div>


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


        <div className="flex items-center gap-2 pt-2 border-t border-emerald-900/60 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={showUnposted}
              onChange={(e) => setShowUnposted(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Show Only Un-posted Figure
          </label>
        </div>
      </div>


      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-700 h-5 w-5" />
            <h1 className="text-base font-bold text-slate-900">
              Sales Figures by Item(s) - {reportType}
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
              Generating sales figures matrix...
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No sales records found for the selected date range.
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
                        Item No. :{" "}
                        <span className="font-semibold text-emerald-800">
                          {group.item_no}
                        </span>
                      </h2>
                      <p className="text-slate-600 pt-0.5">
                        Item Description :{" "}
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
                          {reportType === "Detailed" ? (
                            <>
                              <th className="p-2.5">Posting Date</th>
                              <th className="p-2.5">Doc. Type</th>
                              <th className="p-2.5">Doc. No.</th>
                              <th className="p-2.5">Cust. Name</th>
                              <th className="p-2.5">Salesperson</th>
                              <th className="p-2.5 text-right">Qty.</th>
                              <th className="p-2.5">U.O.M</th>
                              <th className="p-2.5 text-right">Unit Price</th>
                              <th className="p-2.5 text-right">Amount (LCY)</th>
                              <th className="p-2.5 text-right">
                                Amount Incl. VAT (LCY)
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="p-2.5">Item No.</th>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5 text-right">Quantity</th>
                              <th className="p-2.5 text-right">Sales (LCY)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                        {reportType === "Detailed" ? (
                          group.entries.map((e, eIdx) => (
                            <tr key={eIdx} className="hover:bg-slate-50">
                              <td className="p-2.5">
                                {formatDate(e.posting_date)}
                              </td>
                              <td className="p-2.5 font-sans">{e.doc_type}</td>
                              <td className="p-2.5 font-semibold text-emerald-800">
                                {e.doc_no}
                              </td>
                              <td className="p-2.5 font-sans">
                                {e.customer_name}
                              </td>
                              <td className="p-2.5 font-sans">
                                {e.salesperson}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.quantity, 0)}
                              </td>
                              <td className="p-2.5 font-sans">{e.uom}</td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.unit_price)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums">
                                {formatNumber(e.amount_lcy)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums font-bold">
                                {formatNumber(e.amount_incl_vat)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-emerald-800">
                              {group.item_no}
                            </td>
                            <td className="p-2.5 font-sans">
                              {group.description}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(group.total_qty, 0)}
                            </td>
                            <td className="p-2.5 text-right tabular-nums font-bold">
                              {formatNumber(group.total_amount_lcy)} GBP
                            </td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td
                            colSpan={reportType === "Detailed" ? 5 : 2}
                            className="p-2.5 text-right font-sans"
                          >
                            Total:
                          </td>
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_qty, 0)}
                          </td>
                          {reportType === "Detailed" && (
                            <td colSpan={2} className="p-2.5"></td>
                          )}
                          <td className="p-2.5 text-right tabular-nums">
                            {formatNumber(group.total_amount_lcy)}
                            {reportType === "Summary" ? " GBP" : ""}
                          </td>
                          {reportType === "Detailed" && (
                            <td className="p-2.5 text-right tabular-nums">
                              {formatNumber(group.total_amount_incl_vat)}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}


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

      {isCustomerModalOpen && (
        <CustomerLookupModal
          open={isCustomerModalOpen}
          multiple={true}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectMultiple={(customers: CustomerLookupItem[]) => {
            setSelectedCustomerIds(customers.map((c) => c.id));
            setSelectedCustomersText(customers.map((c) => c.name).join("; "));
          }}
        />
      )}

      <SalespersonLookupModal
        open={purchaserModalOpen}
        onClose={() => setPurchaserModalOpen(false)}
        multiple={true}
        // onSelect={() => {}}
        onSelect={(purchaser) => setSelectedPurchasers([purchaser])}
        onSelectMultiple={(purchasers) => setSelectedPurchasers(purchasers)}
      />
    </div>
  );
} */

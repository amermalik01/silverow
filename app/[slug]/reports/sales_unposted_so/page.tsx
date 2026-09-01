//  app/[slug]/reports/sales_unposted_so/page.tsx

"use client";

import { useState } from "react";

import { useParams } from "next/navigation";
import { Search, RotateCcw, FileText, Download } from "lucide-react";
import { Icon } from "@iconify/react";

import OrderStageLookupModal from "@/app/components/shared/modals/OrderStageLookupModal";
import SalespersonLookupModal from "@/app/components/shared/modals/SalespersonLookupModal";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";

type ReportLineItem = {
  id: string;
  order_date: string;
  order_no: string;
  cust_no: string;
  customer_name: string;
  salesperson: string | null;
  req_delivery_date: string | null;
  delivery_date: string | null;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
  order_stage: string;
};

export default function UnpostedSalesOrdersReport() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [loading, setLoading] = useState(false);
  const { show, hide } = useLoader();
  const [reportData, setReportData] = useState<ReportLineItem[]>([]);

  // Filter Target Controls Hooks
  // const [fromDate, setFromDate] = useState("2026-01-01");
  // const [toDate, setToDate] = useState("2026-06-14");

  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>(
    startOfDay(new Date()),
  );

  const [reportType, setReportType] = useState("By Order Date");

  // Selection Arrays for Lookup IDs
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const [selectedCustomers, setSelectedCustomers] = useState<
    CustomerLookupItem[]
  >([]);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<
    string[]
  >([]);
  const [selectedOrderStageIds, setSelectedOrderStageIds] = useState<string[]>(
    [],
  );

  // Modal Display Visibility Flags
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // if (fromDate) params.append("fromDate", fromDate);
      // if (toDate) params.append("toDate", toDate);

      if (fromDate) {
        params.append("fromDate", format(fromDate, "yyyy-MM-dd"));
      }

      if (toDate) {
        params.append("toDate", format(toDate, "yyyy-MM-dd"));
      }
      params.append("reportType", reportType);

      if (selectedCustomerIds.length > 0)
        params.append("customerIds", selectedCustomerIds.join(","));
      if (selectedSalespersonIds.length > 0)
        params.append("salespersonIds", selectedSalespersonIds.join(","));
      if (selectedOrderStageIds.length > 0)
        params.append("orderStageIds", selectedOrderStageIds.join(","));

      const res = await fetch(
        `/api/reports/unposted-sales-orders?${params.toString()}`,
      );
      if (!res.ok)
        throw new Error(
          "Failed generating ledger documentation metrics context",
        );

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
    setReportType("By Order Date");
    setSelectedCustomerIds([]);
    setSelectedSalespersonIds([]);
    setSelectedOrderStageIds([]);
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

    if (date instanceof Date) {
      return format(date, "dd/MM/yyyy");
    }

    return format(date, "dd/MM/yyyy");
  };

  return (
    <div className="w-full space-y-6">
      <Breadcrumbs
        items={[
          // { label: "Reports", href: `/${slug}/reports` },
          { label: "All Reports", href: `/${slug}/reports` },
          { label: "Unposted Sales Orders" },
        ]}
      />
      {/* Search Criteria Control Board */}
      <div className="bg-[#0b3310] text-white p-5 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-center">
          {/* Date Parameters Section */}
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
              <span>to</span>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                minDate={fromDate}
                maxDate={new Date()}
                className="w-full bg-white text-slate-900 border border-emerald-800 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {/* <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 focus:outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-white text-slate-800 rounded px-2 py-1.5 focus:outline-none"
              /> */}
            </div>
          </div>

          {/* Report Type Evaluation Options Dropdown Row */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Report Type Evaluation
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white text-slate-800 rounded px-2 py-1.5 focus:outline-none h-[28px] cursor-pointer"
            >
              <option value="By Order Date">By Order Date</option>
              <option value="By Posting Date">By Posting Date</option>
              <option value="By Delivery Date">By Delivery Date</option>
            </select>
          </div>

          {/* Top Actions Block */}

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

        <hr className="border-emerald-900" />

        {/* Dynamic Modal Entry Multi-Select Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Customer Selector Filter Row */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Customer(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setCustomerModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Customers Selected"
                value={
                  selectedCustomerIds.length
                    ? `${selectedCustomerIds.length} Customers selected`
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

          {/* Salesperson Selector Filter Row */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Salesperson(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setSalespersonModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Salespersons Selected"
                value={
                  selectedSalespersonIds.length
                    ? `${selectedSalespersonIds.length} Salespersons selected`
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

          {/* Order Stage Selector Filter Row */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-200">
              Select Order Stage(s)
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setStageModalOpen(true)}
            >
              <input
                readOnly
                placeholder="All Workflow Stages Selected"
                value={
                  selectedOrderStageIds.length
                    ? `${selectedOrderStageIds.length} Order Stages selected`
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
        </div>
      </div>

      {/* Structured Ledger Presentation Sheet Wrapper */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden flex flex-col">
        {/* Document Header Metadata Section */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-emerald-700 h-5 w-5" /> Unposted Sales
              Orders
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

        {/* Ledger Presentation Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3">Order Date</th>
                <th className="p-3">Order No</th>
                <th className="p-3">Cust No</th>
                <th className="p-3 min-w-[150px]">Customer Name</th>
                <th className="p-3">Salesperson</th>
                <th className="p-3">Req. Delivery Date</th>
                <th className="p-3">Delivery Date</th>
                <th className="p-3 text-right">Amount(LCY)</th>
                <th className="p-3 text-right">Amount Incl. VAT(LCY)</th>
                <th className="p-3 text-center">Order Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    Recalculating ledger rows data arrays...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-12 text-center font-sans text-xs text-slate-400 italic"
                  >
                    No unposted sales orders found within specified constraint
                    bounds.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.order_date)}
                    </td>
                    <td className="p-3 font-semibold text-emerald-800 whitespace-nowrap">
                      {row.order_no}
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.cust_no}</td>
                    <td className="p-3 font-sans font-medium text-slate-900 max-w-[200px] truncate">
                      {row.customer_name}
                    </td>
                    <td className="p-3 font-sans text-slate-600 whitespace-nowrap">
                      {row.salesperson || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.req_delivery_date) || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(row.delivery_date) || "—"}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-800">
                      {formatCurrency(row.amount_lcy)}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                      {formatCurrency(row.amount_incl_vat_lcy)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                        {row.order_stage}
                      </span>
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
              Total Base Records Counter:{" "}
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
                Total Incl. VAT (LCY):{" "}
                <span className="text-emerald-800 font-bold font-mono ml-1">
                  {formatCurrency(
                    reportData.reduce(
                      (acc, curr) => acc + Number(curr.amount_incl_vat_lcy),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CONDITIONAL MODAL RENDER MOUNTINGS                                    */}
      {/* ==================================================================== */}

      {/* 1. Generic Order Stage Multi-Select Modal */}
      <OrderStageLookupModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        stageType="sales_order"
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(stages) => {
          setSelectedOrderStageIds(stages.map((s) => s.id));
        }}
      />

      {/* 2. Salespersons Multi-Select Modal */}
      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(salespersons) => {
          setSelectedSalespersonIds(salespersons.map((s) => s.id));
        }}
      />

      {/* 3. Customer Multi-Select Modal */}
      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(customers) => setSelectedCustomers(customers)}
      />
    </div>
  );
}

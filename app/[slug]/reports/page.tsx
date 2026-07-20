// app/[slug]/reports/page.tsx

"use client";

import React, { useState } from "react";
import { Star, FileText, Search } from "lucide-react";

// 1. Define strict TypeScript interfaces for our reports metadata
interface ReportItem {
  id: string;
  name: string;
}

interface ReportGroups {
  [category: string]: ReportItem[];
}

export default function ReportsPage() {
  // 2. Client-side state handling search and bookmarks (favorites)
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([
    "FIN_TRIAL_BALANCE",
    "FIN_VAT_REP",
    "FIN_PL_STMT",
    "FIN_BAL_SHEET",
    "FIN_CUST_LIST",
    "FIN_CRM_LIST",
    "FIN_FIG_GL",
    "FIN_HAULIER_ACCR",
    "SALES_UNPOSTED_SO",
    "SALES_POSTED_INV",
    
  ]);

  // Toggle favorite status safely
  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id],
    );
  };

  // 3. Complete structural data registry matching your legacy application screenshots
  const reportData: ReportGroups = {
    Finance: [
      { id: "FIN_TRIAL_BALANCE", name: "Trial Balance Report" },
    //   { id: "FIN_TRIAL_DET", name: "Trial Balance - Detailed  - Summary" },
      { id: "FIN_VAT_REP", name: "VAT Report" },
    //   { id: "FIN_OSS_VAT", name: "One Stop VAT Report" },
      { id: "FIN_EC_SALES", name: "EC Sales List" },
      { id: "FIN_PL_STMT", name: "Profit and Loss Statement" },
      { id: "FIN_BAL_SHEET", name: "Balance Sheet" },
      { id: "FIN_SRCH_ENTRY", name: "Search Record by Entry No." },
      { id: "FIN_CUST_LIST", name: "Customer Listing" },
      { id: "FIN_CRM_LIST", name: "CRM Listing" },
      { id: "FIN_CUST_ACT", name: "Customer Activity Report" },
      { id: "FIN_MARGIN_ANLYS", name: "Item(s) Sales Margin Analysis" },
      { id: "FIN_FIG_GL", name: "Figure By G.L" },
      { id: "FIN_HAULIER_ACCR", name: "Haulier Accruals Report" },
    ],
    "Purchases & Suppliers": [
      { id: "PUR_SUPP_AGEING", name: "Supplier Ageing Report" },
      { id: "PUR_UNPOSTED_PO", name: "Unposted Purchase Orders" },
      { id: "PUR_AVG_PAY_DAYS", name: "Supplier Average Payment Days" },
      { id: "PUR_GRNI", name: "Goods Received Not Invoiced" },
      {
        id: "PUR_POSTED_INV",
        name: "Posted Purchase Invoices and Debit Notes",
      },
      { id: "PUR_REMITTANCE", name: "Remittance Advice" },
      { id: "PUR_SUPP_ACT", name: "Supplier Activity Report" },
      { id: "PUR_SUPP_STMT", name: "Supplier Statement" },
      { id: "PUR_SUPP_REBATE", name: "Supplier Rebate" },
      { id: "PUR_CRED_AGEING", name: "Creditors Ageing Report" },
    ],
    "Sales & CRM": [
      { id: "SALES_COMM", name: "Salesperson Commission" },
      { id: "SALES_REBATE", name: "Customer Rebate" },
      { id: "SALES_FIG_CUST", name: "Sales Figures By Customer(s)" },
      { id: "SALES_FIG_SP", name: "Sales Figures By Salesperson(s)" },
      {
        id: "SALES_FIG_SEG",
        name: "Sales Figures By Buying Group, Segment & Territory",
      },
      { id: "SALES_AVG_PAY", name: "Customer Average Payment Days" },
      { id: "SALES_UNPOSTED_SO", name: "Unposted Sales Orders" },
      {
        id: "SALES_UNPOSTED_DET",
        name: "Unposted Customer Orders Detail - Breakdown by Items (G.L)",
      },
      { id: "SALES_POSTED_INV", name: "Posted Sales Invoice and Credit Note" },
      { id: "SALES_PAY_REF", name: "Payments and Refunds from Customers" },
      { id: "SALES_AGEING", name: "Customer Ageing Report" },
      { id: "SALES_TOP_CUST", name: "Top Customer Sales" },
      { id: "SALES_STMT", name: "Customer Statement" },
      { id: "SALES_SP_ACT", name: "Salesperson Activity Report" },
      { id: "SALES_DEPOT_ANLYS", name: "Customer Depot Sales Analysis" },
      { id: "SALES_NO_ORDERS", name: "Customer With No Orders" },
      { id: "SALES_FORECAST", name: "Sales Forecast" },
      { id: "SALES_PRICES", name: "Customer/Item Prices" },
      {
        id: "SALES_LOGIN_ACT",
        name: "Salesperson System Login Activity Report",
      },
      { id: "SALES_DIST_ANLYS", name: "Inland Distribution Analysis Report" },
      { id: "SALES_SRC_ORDER", name: "Source Of Sale Order(s)" },
      { id: "SALES_TICKETS", name: "Support Tickets" },
    ],
    Inventory: [
      { id: "INV_AVAIL", name: "Stock Availability Report" },
      { id: "INV_SUMMARY", name: "Stock Summary Report" },
      { id: "INV_FIG_ITEM", name: "Sales Figures By Item(s)" },
      { id: "INV_PUR_SUPP", name: "Item Purchases By Supplier(s)" },
      {
        id: "INV_SEG_ANLYS",
        name: "Item Sales by Category/Brand/Segment & Territory",
      },
      { id: "INV_LIST", name: "Inventory List" },
      { id: "INV_RAW_MAT", name: "Raw Material Inventory" },
      { id: "INV_UNPOSTED_CUST", name: "Unposted Customer Orders By Item(s)" },
      { id: "INV_UNALLOCATED", name: "Unallocated Stock" },
      { id: "INV_COST_PRICE", name: "Inventory Cost & Sales Price List" },
      { id: "INV_STATS", name: "Inventory Statistics" },
      { id: "INV_MONTHLY", name: "Monthly Items Sales" },
    ],
    "Human Resources": [
      { id: "HR_EMP_LIST", name: "Employee List" },
      { id: "HR_ABSENCE", name: "Employee Absence Report" },
      { id: "HR_BENEFITS", name: "Employee Benefits" },
    ],
  };

  return (
    <div className="space-y-6 container mx-auto p-2">
    
      {/* Upper Navigation Tracking Bar */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span>Reports</span>
          <span>/</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            All Reports
          </span>
        </div>

        {/* Real-time Filter Field */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports..."
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-4 text-xs outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Responsive Columns Layout Mapping (Balanced Grid System) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {Object.entries(reportData).map(([category, items]) => {
          // Filter items within this category group contextually
          const filteredItems = items.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()),
          );

          // Completely skip rendering if user searched something outside this component block
          if (filteredItems.length === 0) return null;

          return (
            <div
              key={category}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 shadow-sm"
            >
              {/* Category Header Bar (Emulating legacy dark forest green style) */}
              <div className="bg-emerald-950 px-4 py-3 text-xs font-semibold tracking-wide text-white">
                {category}
              </div>

              {/* Rows List */}
              <div className="divide-y divide-slate-100">
                {filteredItems.map((report, index) => {
                  const isFav = favorites.includes(report.id);
                  return (
                    <div
                      key={report.id}
                      className={`group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50 ${
                        index % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Bookmark / Star Indicator Trigger */}
                        <button
                          onClick={() => toggleFavorite(report.id)}
                          type="button"
                          className="text-slate-300 transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              isFav
                                ? "fill-amber-400 text-amber-400"
                                : "group-hover:text-slate-400"
                            }`}
                          />
                        </button>

                        {/* Interactive Execution Link */}
                        <a
                          href={`./reports/${report.id.toLowerCase()}`}
                          className="text-xs font-medium text-slate-700 hover:text-emerald-700 hover:underline"
                        >
                          {report.name}
                        </a>
                      </div>

                      {/* Execution Icon action utility */}
                      <FileText className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

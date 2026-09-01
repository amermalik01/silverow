// app/config/reports.ts

export interface ReportItem {
  id: string;
  name: string;
  path: string;
}

export interface ReportGroup {
  category: string;
  reports: ReportItem[];
}

export const REPORT_GROUPS: ReportGroup[] = [
  {
    category: "Finance",
    reports: [
      {
        id: "FIN_TRIAL_BALANCE",
        name: "Trial Balance Report",
        path: "trial-balance",
      },
      {
        id: "FIN_VAT_REP",
        name: "VAT Report",
        path: "vat-report",
      },
      {
        id: "FIN_EC_SALES",
        name: "EC Sales List",
        path: "ec-sales-list",
      },
      {
        id: "FIN_PL_STMT",
        name: "Profit and Loss Statement",
        path: "profit-and-loss",
      },
      {
        id: "FIN_BAL_SHEET",
        name: "Balance Sheet",
        path: "balance-sheet",
      },
      {
        id: "FIN_SRCH_ENTRY",
        name: "Search Record by Entry No.",
        path: "search-record-entry",
      },
      {
        id: "FIN_CUST_LIST",
        name: "Customer Listing",
        path: "customer-listing",
      },
      {
        id: "FIN_CRM_LIST",
        name: "CRM Listing",
        path: "crm-listing",
      },
      {
        id: "FIN_CUST_ACT",
        name: "Customer Activity Report",
        path: "customer-activity",
      },
      {
        id: "FIN_MARGIN_ANLYS",
        name: "Item(s) Sales Margin Analysis",
        path: "sales-margin-analysis",
      },
      {
        id: "FIN_FIG_GL",
        name: "Figure By G.L",
        path: "figure-by-gl",
      },
      {
        id: "FIN_HAULIER_ACCR",
        name: "Haulier Accruals Report",
        path: "haulier-accruals",
      },
    ],
  },

  {
    category: "Purchases & Suppliers",
    reports: [
      {
        id: "PUR_SUPP_AGEING",
        name: "Supplier Ageing Report",
        path: "supplier-ageing",
      },
      {
        id: "PUR_UNPOSTED_PO",
        name: "Unposted Purchase Orders",
        path: "unposted-purchase-orders",
      },
      {
        id: "PUR_AVG_PAY_DAYS",
        name: "Supplier Average Payment Days",
        path: "supplier-average-payment-days",
      },
      {
        id: "PUR_GRNI",
        name: "Goods Received Not Invoiced",
        path: "goods-received-not-invoiced",
      },
      {
        id: "PUR_POSTED_INV",
        name: "Posted Purchase Invoices and Debit Notes",
        path: "posted-purchase-invoices",
      },
      {
        id: "PUR_REMITTANCE",
        name: "Remittance Advice",
        path: "remittance-advice",
      },
      {
        id: "PUR_SUPP_ACT",
        name: "Supplier Activity Report",
        path: "supplier-activity",
      },
      {
        id: "PUR_SUPP_STMT",
        name: "Supplier Statement",
        path: "supplier-statement",
      },
      {
        id: "PUR_SUPP_REBATE",
        name: "Supplier Rebate",
        path: "supplier-rebate",
      },
      {
        id: "PUR_CRED_AGEING",
        name: "Creditors Ageing Report",
        path: "creditors-ageing",
      },
    ],
  },

  {
    category: "Sales & CRM",
    reports: [
      {
        id: "SALES_COMM",
        name: "Salesperson Commission",
        path: "salesperson-commission",
      },
      {
        id: "SALES_REBATE",
        name: "Customer Rebate",
        path: "customer-rebate",
      },
      {
        id: "SALES_FIG_CUST",
        name: "Sales Figures By Customer(s)",
        path: "sales-figures-customer",
      },
      {
        id: "SALES_FIG_SP",
        name: "Sales Figures By Salesperson(s)",
        path: "sales-figures-salesperson",
      },
      {
        id: "SALES_FIG_SEG",
        name: "Sales Figures By Buying Group, Segment & Territory",
        path: "sales-figures-segment",
      },
      {
        id: "SALES_AVG_PAY",
        name: "Customer Average Payment Days",
        path: "customer-average-payment-days",
      },
      {
        id: "SALES_UNPOSTED_SO",
        name: "Unposted Sales Orders",
        path: "unposted-sales-orders",
      },
      {
        id: "SALES_UNPOSTED_DET",
        name: "Unposted Customer Orders Detail - Breakdown by Items (G.L)",
        path: "unposted-customer-orders-detail",
      },
      {
        id: "SALES_POSTED_INV",
        name: "Posted Sales Invoice and Credit Note",
        path: "sales_posted_inv",
      },
      {
        id: "SALES_PAY_REF",
        name: "Payments and Refunds from Customers",
        path: "payments-refunds",
      },
      {
        id: "SALES_AGEING",
        name: "Customer Ageing Report",
        path: "customer-ageing",
      },
      {
        id: "SALES_TOP_CUST",
        name: "Top Customer Sales",
        path: "top-customer-sales",
      },
      {
        id: "SALES_STMT",
        name: "Customer Statement",
        path: "customer-statement",
      },
      {
        id: "SALES_SP_ACT",
        name: "Salesperson Activity Report",
        path: "salesperson-activity",
      },
      {
        id: "SALES_DEPOT_ANLYS",
        name: "Customer Depot Sales Analysis",
        path: "customer-depot-sales-analysis",
      },
      {
        id: "SALES_NO_ORDERS",
        name: "Customer With No Orders",
        path: "customers-with-no-orders",
      },
      {
        id: "SALES_FORECAST",
        name: "Sales Forecast",
        path: "sales-forecast",
      },
      {
        id: "SALES_PRICES",
        name: "Customer/Item Prices",
        path: "customer-item-prices",
      },
      {
        id: "SALES_LOGIN_ACT",
        name: "Salesperson System Login Activity Report",
        path: "salesperson-login-activity",
      },
      {
        id: "SALES_DIST_ANLYS",
        name: "Inland Distribution Analysis Report",
        path: "inland-distribution-analysis",
      },
      {
        id: "SALES_SRC_ORDER",
        name: "Source Of Sale Order(s)",
        path: "source-of-sales-orders",
      },
      {
        id: "SALES_TICKETS",
        name: "Support Tickets",
        path: "support-tickets",
      },
    ],
  },

  {
    category: "Inventory",
    reports: [
      {
        id: "INV_AVAIL",
        name: "Stock Availability Report",
        path: "stock-availability",
      },
      {
        id: "INV_SUMMARY",
        name: "Stock Summary Report",
        path: "stock-summary",
      },
      {
        id: "INV_FIG_ITEM",
        name: "Sales Figures By Item(s)",
        path: "sales-figures-items",
      },
      {
        id: "INV_PUR_SUPP",
        name: "Item Purchases By Supplier(s)",
        path: "item-purchases-supplier",
      },
      {
        id: "INV_SEG_ANLYS",
        name: "Item Sales by Category/Brand/Segment & Territory",
        path: "item-sales-analysis",
      },
      {
        id: "INV_LIST",
        name: "Inventory List",
        path: "inventory-list",
      },
      {
        id: "INV_RAW_MAT",
        name: "Raw Material Inventory",
        path: "raw-material-inventory",
      },
      {
        id: "INV_UNPOSTED_CUST",
        name: "Unposted Customer Orders By Item(s)",
        path: "unposted-customer-orders-items",
      },
      {
        id: "INV_UNALLOCATED",
        name: "Unallocated Stock",
        path: "unallocated-stock",
      },
      {
        id: "INV_COST_PRICE",
        name: "Inventory Cost & Sales Price List",
        path: "inventory-cost-sales-price",
      },
      {
        id: "INV_STATS",
        name: "Inventory Statistics",
        path: "inventory-statistics",
      },
      {
        id: "INV_MONTHLY",
        name: "Monthly Items Sales",
        path: "monthly-items-sales",
      },
    ],
  },

  {
    category: "Human Resources",
    reports: [
      {
        id: "HR_EMP_LIST",
        name: "Employee List",
        path: "employee-list",
      },
      {
        id: "HR_ABSENCE",
        name: "Employee Absence Report",
        path: "employee-absence",
      },
      {
        id: "HR_BENEFITS",
        name: "Employee Benefits",
        path: "employee-benefits",
      },
    ],
  },
];

export const ALL_REPORTS = REPORT_GROUPS.flatMap((group) => group.reports);

export function getReportById(id: string) {
  return ALL_REPORTS.find((report) => report.id === id);
}

export function getReportUrl(slug: string, reportId: string) {
  const report = getReportById(reportId);

  if (!report) {
    return `/${slug}/reports`;
  }

  return `/${slug}/reports/${report.path}`;
}

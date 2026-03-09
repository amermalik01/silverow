// app/components/layout/sidebar/company_sidebaritems.ts
import { uniqueId } from "lodash";

export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number | string;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  isPro?: boolean;
}

const CompanySidebarContent: MenuItem[] = [
  // ==================== NON-PRO SECTIONS ====================
  {
    heading: "Home",
    children: [
      {
        name: "Dashboard",
        icon: "solar:widget-2-linear",
        id: uniqueId(),
        url: "/",
        isPro: false,
      },

      {
        name: "Finance",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "Chart of Accounts",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
          {
            id: uniqueId(),
            name: "General Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Posted General Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Finance Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        name: "Sales",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "CRM",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
            icon: "solar:shield-keyhole-minimalistic-linear",

            children: [
              {
                id: uniqueId(),
                name: "Retailer CRM",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: uniqueId(),
            name: "Customers",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Orders",
            icon: "solar:shield-keyhole-minimalistic-linear",

            children: [
              {
                id: uniqueId(),
                name: "Sales Quotes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Sales Orders",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Sales Invoices",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Credit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Posted Credit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: uniqueId(),
            name: "Customer Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Posted Customer Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Support Tickets",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Sales Forecast",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Sales Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        name: "Purchases",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "SRM",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
          {
            id: uniqueId(),
            name: "Suppliers",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Orders",
            icon: "solar:shield-keyhole-minimalistic-linear",

            children: [
              {
                id: uniqueId(),
                name: "Purchase Orders",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Purchase Invoices",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Debit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Posted Debit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: uniqueId(),
            name: "Supplier Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Posted Supplier Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Purchase Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        name: "Inventory",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "Items",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
          {
            id: uniqueId(),
            name: "Stock Sheet",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Items Activity",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Transfer Stock",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Posted Transfer Stock",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Item Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Posted Item Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Inventory Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        name: "Reports",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "All Reports",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
        ],
      },

      {
        name: "Human Resources",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "Employees",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
          {
            id: uniqueId(),
            name: "View Bucket",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "HR Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },
    ],
  },

  {
    heading: "Management",
    children: [
      {
        name: "Settings",
        id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: uniqueId(),
            name: "General",
            children: [
              {
                id: uniqueId(),
                name: "Company",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Currency Setup",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Module Codes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Widget Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Reports Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: uniqueId(),
            name: "Finance",
            children: [
              {
                id: uniqueId(),
                name: "VAT Rates",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Posting Groups",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "VAT Posting Setup",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Inventory Setup",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Posting Date Range",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "Unit of Measure for G/L",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "G/L Account(s) Setup for Opening Balances",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: uniqueId(),
                name: "G/L Account for Goods Received Not Invoiced",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: uniqueId(),
            name: "Sales",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Purchases",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Warehouse",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Inventory",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Human Resources",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Data Migration",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Auto-email Templates",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: uniqueId(),
            name: "Shopify Setup",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },
    ],
  },
];

export default CompanySidebarContent;

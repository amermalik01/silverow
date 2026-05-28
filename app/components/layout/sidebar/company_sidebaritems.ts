// app/components/layout/sidebar/company_sidebaritems.ts
"use client";

// import { uniqueId } from "lodash";

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

export const getCompanySidebarItems = (slug: string): MenuItem[] => [
  // ==================== NON-PRO SECTIONS ====================
  {
    heading: "Home",
    children: [
      {
        name: "Dashboard",
        icon: "solar:widget-2-linear",
        id: "Dashboard",
        // id: uniqueId(),
        // url: "/",
        url: `/${slug}/dashboard`,
        isPro: false,
      },

      {
        name: "Finance",
        id: "Finance",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            // id: uniqueId(),
            id: "Chart of Accounts",
            name: "Chart of Accounts",
            url: `/${slug}/finance/chart-of-accounts`,
          },
          {
            id: "General Journals",
            name: "General Journals",
            url: `/${slug}/finance/general-journal`,
          },
          {
            id: "Posted General Journals",
            name: "Posted General Journals",
            url: `/${slug}/finance/posted-general-journal`,
            // url: `/${slug}/finance/posted-journal`,
          },
          {
            id: "Customer Journals",
            name: "Customer Journals",
            url: `/${slug}/finance/customer-journal`,
          },
          {
            id: "Posted Customer Journals",
            name: "Posted Customer Journals",
            url: `/${slug}/finance/posted-customer-journal`,
          },
          {
            id: "Supplier Journals",
            name: "Supplier Journals",
            url: `/${slug}/finance/supplier-journal`,
          },
          {
            id: "Posted Supplier Journals",
            name: "Posted Supplier Journals",
            url: `/${slug}/finance/posted-supplier-journal`,
          },
          {
            id: "Item Journals",
            name: "Item Journals",
            url: `/${slug}/finance/item-journal`,
          },
          {
            id: "Posted Item Journals",
            name: "Posted Item Journals",
            url: `/${slug}/finance/posted-item-journal`,
          },
          {
            // id: uniqueId(),
            id: "Finance Matrix",
            name: "Finance Matrix",
            url: `/${slug}/finance/matrix`,
          },
        ],
      },

      {
        id: "Sales",
        name: "Sales",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            // id: uniqueId(),
            id: "CRM",
            name: "CRM",
            url: `/${slug}/sales/crm`,
            icon: "solar:shield-keyhole-minimalistic-linear",

            // children: [
            //   {
            //     id: "Retailer CRM",
            //     name: "Retailer CRM",
            //     url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
            //   },
            // ],
          },
          {
            id: "Customers",
            name: "Customers",
            url: `/${slug}/sales/customer`,
          },
          {
            id: "Orders",
            name: "Orders",
            icon: "solar:shield-keyhole-minimalistic-linear",

            children: [
              {
                id: "Sales Quotes",
                name: "Sales Quotes",
                url: `/${slug}/sales/quotes`,
              },
              {
                id: "Sales Orders",
                name: "Sales Orders",
                url: `/${slug}/sales/orders`,
              },
              {
                // id: uniqueId(),
                id: "Sales Invoices",
                name: "Sales Invoices",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                // id: uniqueId(),
                id: "Credit Notes",
                name: "Credit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                // id: uniqueId(),
                id: "Posted Credit Notes",
                name: "Posted Credit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            // id: uniqueId(),
            id: "Customer Journal",
            name: "Customer Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Posted Customer Journal",
            name: "Posted Customer Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Support Tickets",
            name: "Support Tickets",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Sales Forecast",
            name: "Sales Forecast",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Sales Matrix",
            name: "Sales Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        id: "Purchases",
        name: "Purchases",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            // id: uniqueId(),
            id: "SRM",
            name: "SRM",
            url: `/${slug}/purchases/srm`,
          },
          {
            // id: uniqueId(),
            id: "Suppliers",
            name: "Suppliers",
            url: `/${slug}/purchases/supplier`,
          },
          {
            // id: uniqueId(),
            id: "Orders",
            name: "Orders",
            icon: "solar:shield-keyhole-minimalistic-linear",

            children: [
              {
                id: "Purchase Orders",
                name: "Purchase Orders",
                url: `/${slug}/purchases/purchase-orders`,
              },
              {
                // id: uniqueId(),
                id: "Purchase Invoices",
                name: "Purchase Invoices",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                // id: uniqueId(),
                id: "Debit Notes",
                name: "Debit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                // id: uniqueId(),
                id: "Posted Debit Notes",
                name: "Posted Debit Notes",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            // id: uniqueId(),
            id: "Supplier Journal",
            name: "Supplier Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Posted Supplier Journal",
            name: "Posted Supplier Journal",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Purchase Matrix",
            name: "Purchase Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        id: "Inventory",
        name: "Inventory",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "Items",
            name: "Items",
            url: `/${slug}/inventory/items`,
          },
          {
            // id: uniqueId(),
            id: "Stock Sheet",
            name: "Stock Sheet",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Items Activity",
            name: "Items Activity",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Transfer Stock",
            name: "Transfer Stock",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Posted Transfer Stock",
            name: "Posted Transfer Stock",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          // {
          //   // id: uniqueId(),
          //   id: "Item Journal",
          //   name: "Item Journal",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
          // {
          //   // id: uniqueId(),
          //   id: "Posted Item Journal",
          //   name: "Posted Item Journal",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
          {
            // id: uniqueId(),
            id: "Inventory Matrix",
            name: "Inventory Matrix",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },

      {
        id: "Reports",
        name: "Reports",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            // id: uniqueId(),
            id: "All Reports",
            name: "All Reports",
            url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
          },
        ],
      },

      {
        id: "Human Resources",
        name: "Human Resources",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "Employees",
            name: "Employees",
            url: `/${slug}/hr/employees`,
          },
          {
            id: "Departments",
            name: "Departments",
            url: `/${slug}/hr/departments`,
          },
          {
            id: "Designations",
            name: "Designations",
            url: `/${slug}/hr/designations`,
          },
          {
            id: "Leaves",
            name: "Leaves",
            url: `/${slug}/hr/leaves`,
          },
          {
            id: "Attendance",
            name: "Attendance",
            url: `/${slug}/hr/attendance`,
          },
          {
            // id: uniqueId(),
            id: "View Bucket",
            name: "View Bucket",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "HR Matrix",
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
        id: "Settings",
        name: "Settings",
        // id: uniqueId(),
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            // id: uniqueId(),
            id: "General",
            name: "General",
            children: [
              {
                id: "Company",
                name: "Company",
                url: `/${slug}/setup/system/company`,
              },
              {
                id: "Currency Setup",
                name: "Currency Setup",
                url: `/${slug}/setup/system/currencies`,
              },
              {
                id: "Module Codes",
                name: "Module Codes",
                url: `/${slug}/setup/system/sequences`,
              },
              {
                // id: uniqueId(),
                id: "Widget Roles",
                name: "Widget Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                // id: uniqueId(),
                id: "Reports Roles",
                name: "Reports Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            // id: uniqueId(),
            id: "Finance",
            name: "Finance",
            children: [
              {
                // id: uniqueId(),
                id: "VAT Rates",
                name: "VAT Rates",
                url: `/${slug}/setup/finance/vat-rates`,
              },
              // {
              //   id: uniqueId(),
              //   name: "Posting Groups",
              //   url: `/${slug}/setup/finance/posting-groups`,
              // },
              // {
              //   id: uniqueId(),
              //   name: "VAT Posting Setup",
              //   url: `/${slug}/setup/finance/posting-groups`,
              // },
              {
                // id: uniqueId(),
                id: "VAT Business Posting Groups",
                name: "VAT Business Posting Groups",
                url: `/${slug}/setup/finance/vat-business-posting-groups`,
              },
              {
                // id: uniqueId(),
                id: "VAT Product Posting Groups",
                name: "VAT Product Posting Groups",
                url: `/${slug}/setup/finance/vat-product-posting-groups`,
              },
              {
                // id: uniqueId(),
                id: "VAT Posting Setup",
                name: "VAT Posting Setup",
                url: `/${slug}/setup/finance/vat-posting-setup`,
              },
              {
                // id: uniqueId(),
                id: "Posting Setup",
                name: "Posting Setup",
                url: `/${slug}/setup/finance/posting-setup`,
              },
              // {
              //   id: uniqueId(),
              //   name: "Inventory Setup",
              //   url: `/${slug}/setup/finance/inventory-setup`,
              // },
              {
                // id: uniqueId(),
                id: "Posting Date Range",
                name: "Posting Date Range",
                url: `/${slug}/setup/finance/posting-date-range`,
              },
              // {
              //   id: uniqueId(),
              //   name: "Unit of Measure for G/L",
              //   url: `/${slug}/setup/finance/posting-groups`,
              // },
              {
                // id: uniqueId(),
                id: "G/L Account(s) Setup for Opening Balances",
                name: "G/L Account(s) Setup for Opening Balances",
                url: `/${slug}/setup/finance/posting-groups`,
              },
              {
                // id: uniqueId(),
                id: "G/L Account for Goods Received Not Invoiced",
                name: "G/L Account for Goods Received Not Invoiced",
                url: `/${slug}/setup/finance/posting-groups`,
              },
            ],
          },
          {
            id: "Sales",
            name: "Sales",
            children: [
              {
                id: "credit-ratings",
                name: "Credit Ratings",
                url: `/${slug}/setup/sales/credit_ratings`,
              },
              {
                id: "segments",
                name: "Segments",
                url: `/${slug}/setup/sales/segments`,
              },
              {
                id: "territories",
                name: "Territories",
                url: `/${slug}/setup/sales/territories`,
              },
              {
                id: "buying_groups",
                name: "Buying Groups",
                url: `/${slug}/setup/sales/buying_groups`,
              },
              {
                id: "sources_crm",
                name: "Source Of CRM",
                url: `/${slug}/setup/sales/sources`,
              },
              {
                id: "order_sources",
                name: "Source Of Order",
                url: `/${slug}/setup/sales/order_sources`,
              },
            ],
          },
          {
            // id: uniqueId(),
            id: "Purchases",
            name: "Purchases",
            children: [
              {
                id: "segments",
                name: "Segments",
                url: `/${slug}/setup/purchases/segments`,
              },
              {
                id: "territories",
                name: "Territories",
                url: `/${slug}/setup/purchases/territories`,
              },
              {
                id: "selling_groups",
                name: "Selling Groups",
                url: `/${slug}/setup/purchases/selling_groups`,
              },
            ],
          },
          {
            id: "Warehouse Setup",
            name: "Warehouse Setup",
            children: [
              {
                id: "Warehouse",
                name: "Warehouse",
                url: `/${slug}/setup/inventory/warehouses`,
              },
              {
                id: "Storage Types",
                name: "Storage Types",
                url: `/${slug}/setup/system/warehouse-storage-types`,
              },
            ],
          },

          {
            id: "Inventory Setup",
            name: "Inventory Setup",
            children: [
              {
                id: "Categories",
                name: "Categories",
                url: `/${slug}/setup/inventory/categories`,
              },
              {
                id: "Brands",
                name: "Brands",
                url: `/${slug}/setup/inventory/brands`,
              },
              {
                id: "UOM",
                name: "Unit of measure",
                url: `/${slug}/setup/inventory/uoms`,
              },
            ],
          },

          {
            // id: uniqueId(),
            id: "Human Resources",
            name: "Human Resources",

            children: [
              {
                id: "Roles",
                name: "Roles",
                url: `/${slug}/setup/system/roles`,
              },
              // {
              //   id: "Storage Types",
              //   name: "Storage Types",
              //   url: `/${slug}/setup/system/roles`,
              // },
            ],
          },
          {
            // id: uniqueId(),
            id: "Data Migration",
            name: "Data Migration",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Auto-email Templates",
            name: "Auto-email Templates",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            // id: uniqueId(),
            id: "Shopify Setup",
            name: "Shopify Setup",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
        ],
      },
    ],
  },
];

// export default CompanySidebarContent;

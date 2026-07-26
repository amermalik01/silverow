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
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "Chart of Accounts",
            name: "Chart of Accounts",
            url: `/${slug}/finance/chart-of-accounts`,
          },
          {
            id: "General Journals",
            name: "General Journals",
            url: `/${slug}/finance/general-journal`,
          },
          // {
          //   id: "Posted General Journals",
          //   name: "Posted General Journals",
          //   url: `/${slug}/finance/posted-general-journal`,
          // },
          {
            id: "Customer Journals",
            name: "Customer Journals",
            url: `/${slug}/finance/customer-journal`,
          },
          // {
          //   id: "Posted Customer Journals",
          //   name: "Posted Customer Journals",
          //   url: `/${slug}/finance/posted-customer-journal`,
          // },
          {
            id: "Supplier Journals",
            name: "Supplier Journals",
            url: `/${slug}/finance/supplier-journal`,
          },
          // {
          //   id: "Posted Supplier Journals",
          //   name: "Posted Supplier Journals",
          //   url: `/${slug}/finance/posted-supplier-journal`,
          // },
          {
            id: "Item Journals",
            name: "Item Journals",
            url: `/${slug}/finance/item-journal`,
          },
          // {
          //   id: "Posted Item Journals",
          //   name: "Posted Item Journals",
          //   url: `/${slug}/finance/posted-item-journal`,
          // },
          // {
          //   id: "Finance Matrix",
          //   name: "Finance Matrix",
          //   url: `/${slug}/finance/matrix`,
          // },
        ],
      },

      {
        id: "Sales",
        name: "Sales",
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "CRM",
            name: "CRM",
            url: `/${slug}/sales/crm`,
            icon: "solar:shield-keyhole-minimalistic-linear",
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
                id: "Sales Invoices",
                name: "Sales Invoices",
                url: `/${slug}/sales/invoices`,
              },
              {
                id: "Credit Notes",
                name: "Credit Notes",
                url: `/${slug}/sales/returns`,
              },
              {
                id: "Posted Credit Notes",
                name: "Posted Credit Notes",
                url: `/${slug}/sales/posted-credit-notes`,
              },
            ],
          },
          {
            id: "Support Tickets",
            name: "Support Tickets",
            url: `/${slug}/sales/support-ticket`,
          },
          {
            // id: uniqueId(),
            id: "Sales Forecast",
            name: "Sales Forecast",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          // {
          //   // id: uniqueId(),
          //   id: "Sales Matrix",
          //   name: "Sales Matrix",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
        ],
      },

      {
        id: "Purchases",
        name: "Purchases",
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "SRM",
            name: "SRM",
            url: `/${slug}/purchases/srm`,
          },
          {
            id: "Suppliers",
            name: "Suppliers",
            url: `/${slug}/purchases/supplier`,
          },
          {
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
                id: "Purchase Invoices",
                name: "Purchase Invoices",
                url: `/${slug}/purchases/purchase-invoices`,
              },
              {
                id: "Debit Notes",
                name: "Debit Notes",
                url: `/${slug}/purchases/debit-notes`,
              },
              {
                id: "Posted Debit Notes",
                name: "Posted Debit Notes",
                url: `/${slug}/purchases/posted-debit-notes`,
              },
            ],
          },
          // {
          //   // id: uniqueId(),
          //   id: "Purchase Matrix",
          //   name: "Purchase Matrix",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
        ],
      },

      {
        id: "Inventory",
        name: "Inventory",
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "Items",
            name: "Items",
            url: `/${slug}/inventory/items`,
          },
          // {
          //   id: "Stock Sheet",
          //   name: "Stock Sheet",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
          // {
          //   id: "Items Activity",
          //   name: "Items Activity",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
          {
            id: "Transfer Stock",
            name: "Transfer Stock",
            url: `/${slug}/inventory/transfer-stock`,
          },
          // {
          //   id: "Posted Transfer Stock",
          //   name: "Posted Transfer Stock",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
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
          // {
          //   // id: uniqueId(),
          //   id: "Inventory Matrix",
          //   name: "Inventory Matrix",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
        ],
      },

      {
        id: "Reports",
        name: "Reports",
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
            id: "All Reports",
            name: "All Reports",
            url: `/${slug}/reports`,
          },
        ],
      },

      {
        id: "Human Resources",
        name: "Human Resources",
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
            id: "View Bucket",
            name: "View Bucket",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          // {
          //   id: "HR Matrix",
          //   name: "HR Matrix",
          //   url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          // },
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
        icon: "solar:shield-keyhole-minimalistic-linear",
        children: [
          {
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
                id: "Widget Roles",
                name: "Widget Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
              {
                id: "Reports Roles",
                name: "Reports Roles",
                url: "https://react.tailwind-admin.com/auth/auth1/two-steps",
              },
            ],
          },
          {
            id: "Finance",
            name: "Finance",
            children: [
              {
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
                id: "VAT Business Posting Groups",
                name: "VAT Business Posting Groups",
                url: `/${slug}/setup/finance/vat-business-posting-groups`,
              },
              {
                id: "VAT Product Posting Groups",
                name: "VAT Product Posting Groups",
                url: `/${slug}/setup/finance/vat-product-posting-groups`,
              },
              {
                id: "VAT Posting Setup",
                name: "VAT Posting Setup",
                url: `/${slug}/setup/finance/vat-posting-setup`,
              },
              {
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
                id: "G/L Account(s) Setup for Opening Balances",
                name: "G/L Account(s) Setup for Opening Balances",
                url: `/${slug}/setup/finance/posting-groups`,
              },
              {
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
                id: "classification",
                name: "Classification",
                url: `/${slug}/setup/sales/classification`,
              },
              {
                id: "sources_crm",
                name: "Source Of CRM",
                url: `/${slug}/setup/sales/sources`,
              },
              {
                id: "ownership_type",
                name: "Ownership Type",
                url: `/${slug}/setup/sales/ownership_type`,
              },
              {
                id: "status",
                name: "Status",
                url: `/${slug}/setup/sales/status`,
              },
              {
                id: "order_sources",
                name: "Source Of Order",
                url: `/${slug}/setup/sales/order_sources`,
              },
              {
                id: "type",
                name: "CRM Type",
                url: `/${slug}/setup/sales/type`,
              },
              {
                id: "order_stages",
                name: "Sales Order Stages",
                url: `/${slug}/setup/sales/order_stages`,
              },
              {
                id: "credit_note_stages",
                name: "Credit Note Stages",
                url: `/${slug}/setup/sales/credit_note_stages`,
              },
              {
                id: "price_offer_method",
                name: "Price Offer Method",
                url: `/${slug}/setup/sales/price_offer_method`,
              },
              {
                id: "payment_terms",
                name: "Payment Terms",
                url: `/${slug}/setup/sales/payment_terms`,
              },
              {
                id: "payment_method",
                name: "Payment Method",
                url: `/${slug}/setup/sales/payment_method`,
              },
              {
                id: "shipment_method",
                name: "Shipment Method",
                url: `/${slug}/setup/sales/shipment_method`,
              },
            ],
          },
          {
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
                id: "classification",
                name: "Classification",
                url: `/${slug}/setup/purchases/classification`,
              },
              {
                id: "selling_groups",
                name: "Selling Groups",
                url: `/${slug}/setup/purchases/selling_groups`,
              },
              {
                id: "purchase_order_stages",
                name: "Purchase Order Stages",
                url: `/${slug}/setup/purchases/purchase_order_stages`,
              },
              {
                id: "debit_note_stages",
                name: "Debit Note Stages",
                url: `/${slug}/setup/purchases/debit_note_stages`,
              },
              {
                id: "price_offer_method",
                name: "Price Offer Method",
                url: `/${slug}/setup/purchases/price_offer_method`,
              },
              {
                id: "payment_terms",
                name: "Payment Terms",
                url: `/${slug}/setup/purchases/payment_terms`,
              },
              {
                id: "payment_method",
                name: "Payment Method",
                url: `/${slug}/setup/purchases/payment_method`,
              },
              {
                id: "shipment_method",
                name: "Shipment Method",
                url: `/${slug}/setup/purchases/shipment_method`,
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
            id: "Human Resources",
            name: "Human Resources",

            children: [
              {
                id: "Roles",
                name: "Roles",
                url: `/${slug}/setup/system/roles`,
              },
            ],
          },
          {
            id: "Data Migration",
            name: "Data Migration",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
            id: "Auto-email Templates",
            name: "Auto-email Templates",
            url: "https://react.tailwind-admin.com/auth/auth2/two-steps",
          },
          {
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

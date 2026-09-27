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
        url: `/${slug}/dashboard`,
        isPro: false,
      },

      {
        name: "Finance",
        id: "Finance",
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:wallet-money-linear",
        children: [
          {
            id: "Chart of Accounts",
            name: "Chart of Accounts",
            icon: "solar:book-2-linear",
            url: `/${slug}/finance/chart-of-accounts`,
          },
          {
            id: "General Journals",
            name: "General Journals",
            icon: "solar:notebook-linear",
            url: `/${slug}/finance/general-journal`,
          },
          {
            id: "Customer Journals",
            name: "Customer Journals",
            icon: "solar:users-group-rounded-linear",
            url: `/${slug}/finance/customer-journal`,
          },
          {
            id: "Supplier Journals",
            name: "Supplier Journals",
            icon: "solar:buildings-2-linear",
            url: `/${slug}/finance/supplier-journal`,
          },
          {
            id: "Item Journals",
            name: "Item Journals",
             icon: "solar:box-linear",
            url: `/${slug}/finance/item-journal`,
          },
        ],
      },

      {
        id: "Sales",
        name: "Sales",
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:cart-large-2-linear",
        children: [
          {
            id: "CRM",
            name: "CRM",
            icon: "solar:users-group-rounded-linear",
            url: `/${slug}/sales/crm`,
          },
          {
            id: "Customers",
            name: "Customers",
            icon: "solar:user-rounded-linear",
            url: `/${slug}/sales/customer`,
          },

          {
            id: "Sales Quotes",
            name: "Sales Quotes",
            icon: "solar:document-text-linear",
            url: `/${slug}/sales/quotes`,
          },
          {
            id: "Sales Orders",
            name: "Sales Orders",
            icon: "solar:clipboard-list-linear",
            url: `/${slug}/sales/orders`,
          },
          {
            id: "Sales Invoices",
            name: "Sales Invoices",
            icon: "solar:bill-list-linear",
            url: `/${slug}/sales/invoices`,
          },
          {
            id: "Credit Notes",
            name: "Credit Notes",
            icon: "solar:bill-cross-linear",
            url: `/${slug}/sales/returns`,
          },
          {
            id: "Posted Credit Notes",
            name: "Posted Credit Notes",
            icon: "solar:bill-check-linear",
            url: `/${slug}/sales/posted-credit-notes`,
          },
          {
            id: "Support Tickets",
            name: "Support Tickets",
            icon: "solar:chat-round-dots-linear",
            url: `/${slug}/sales/support-ticket`,
          },
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
            icon: "solar:handshake-linear",
            url: `/${slug}/purchases/srm`,
          },
          {
            id: "Suppliers",
            name: "Suppliers",
            icon: "solar:buildings-2-linear",
            url: `/${slug}/purchases/supplier`,
          },

          {
            id: "Purchase Orders",
            name: "Purchase Orders",
            icon: "solar:clipboard-list-linear",
            url: `/${slug}/purchases/purchase-orders`,
          },
          {
            id: "Purchase Invoices",
            name: "Purchase Invoices",
            icon: "solar:bill-list-linear",
            url: `/${slug}/purchases/purchase-invoices`,
          },
          {
            id: "Debit Notes",
            name: "Debit Notes",
            icon: "solar:bill-cross-linear",
            url: `/${slug}/purchases/debit-notes`,
          },
          {
            id: "Posted Debit Notes",
            name: "Posted Debit Notes",
            icon: "solar:bill-check-linear",
            url: `/${slug}/purchases/posted-debit-notes`,
          },
        ],
      },

      {
        id: "Inventory",
        name: "Inventory",
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:box-minimalistic-linear",
        children: [
          {
            id: "Items",
            name: "Items",
            icon: "solar:box-linear",
            url: `/${slug}/inventory/items`,
          },
          {
            id: "Transfer Stock",
            name: "Transfer Stock",
            icon: "solar:transfer-horizontal-linear",
            url: `/${slug}/inventory/transfer-stock`,
          },
        ],
      },

      {
        id: "Reports",
        name: "Reports",
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:chart-2-linear",
        children: [
          {
            id: "All Reports",
            name: "All Reports",
            icon: "solar:chart-square-linear",
            url: `/${slug}/reports`,
          },
        ],
      },

      {
        id: "Human Resources",
        name: "Human Resources",
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:users-group-two-rounded-linear",
        children: [
          {
            id: "Employees",
            name: "Employees",
            icon: "solar:user-id-linear",
            url: `/${slug}/hr/employees`,
          },
          {
            id: "Departments",
            name: "Departments",
            icon: "solar:buildings-linear",
            url: `/${slug}/hr/departments`,
          },
          {
            id: "Designations",
            name: "Designations",
             icon: "solar:medal-star-linear",
            url: `/${slug}/hr/designations`,
          },
          {
            id: "Leaves",
            name: "Leaves",
            icon: "solar:calendar-mark-linear",
            url: `/${slug}/hr/leaves`,
          },
          {
            id: "Attendance",
            name: "Attendance",
            icon: "solar:clock-circle-linear",
            url: `/${slug}/hr/attendance`,
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
        // icon: "solar:shield-keyhole-minimalistic-linear",
        icon: "solar:settings-linear",
        children: [
          {
            id: "General",
            name: "General",
            icon: "solar:buildings-linear",
            url: `/${slug}/setup/system/company`,
          },
          {
            id: "Finance",
            name: "Finance",
            icon: "solar:wallet-money-linear",
            url: `/${slug}/setup/finance`,
          },
          {
            id: "Sales",
            name: "Sales",
            icon: "solar:cart-large-2-linear",
            url: `/${slug}/setup/sales`,
          },
          {
            id: "Purchases",
            name: "Purchases",
            icon: "solar:cart-large-minimalistic-linear",
            url: `/${slug}/setup/purchases`,
          },
          {
            id: "Warehouse Setup",
            name: "Warehouse Setup",
            icon: "solar:warehouse-linear",
            url: `/${slug}/setup/inventory/warehouses`,
            // children: [
            //   {
            //     id: "Warehouse",
            //     name: "Warehouse",
            //     url: `/${slug}/setup/inventory/warehouses`,
            //   },
            //   {
            //     id: "Storage Types",
            //     name: "Storage Types",
            //     url: `/${slug}/setup/system/warehouse-storage-types`,
            //   },
            // ],
          },

          {
            id: "Inventory Setup",
            name: "Inventory Setup",
            icon: "solar:box-minimalistic-linear",
            url: `/${slug}/setup/inventory`,
          },

          {
            id: "Human Resources",
            name: "Human Resources",
            icon: "solar:users-group-two-rounded-linear",
            url: `/${slug}/setup/hr`,
          },
        ],
      },
    ],
  },
];

// children: [
//   {
//     id: "Company",
//     name: "Company",
//     url: `/${slug}/setup/system/company`,
//   },
//   {
//     id: "Module Codes",
//     name: "Module Codes",
//     url: `/${slug}/setup/system/sequences`,
//   },
// ],
// children: [
// {
//   id: "VAT Posting Setup",
//   name: "VAT Posting Setup",
//   url: `/${slug}/setup/finance/vat-posting-setup`,
// },
// {
//   id: "Posting Setup",
//   name: "Posting Setup",
//   url: `/${slug}/setup/finance/posting-setup`,
// },
// {
//   id: "Posting Date Range",
//   name: "Posting Date Range",
//   url: `/${slug}/setup/finance/posting-date-range`,
// },
// ],

// children: [
//   {
//     id: "setup",
//     name: "Setup",
//     url: `/${slug}/setup/sales`,
//   },
// ]
// children: [
//   {
//     id: "setup",
//     name: "Setup",
//     url: `/${slug}/setup/sales`,
//   },
//   {
//     id: "credit-ratings",
//     name: "Credit Ratings",
//     url: `/${slug}/setup/sales/credit_ratings`,
//   },
//   {
//     id: "segments",
//     name: "Segments",
//     url: `/${slug}/setup/sales/segments`,
//   },
//   {
//     id: "territories",
//     name: "Territories",
//     url: `/${slug}/setup/sales/territories`,
//   },
//   {
//     id: "buying_groups",
//     name: "Buying Groups",
//     url: `/${slug}/setup/sales/buying_groups`,
//   },
//   {
//     id: "classification",
//     name: "Classification",
//     url: `/${slug}/setup/sales/classification`,
//   },
//   {
//     id: "sources_crm",
//     name: "Source Of CRM",
//     url: `/${slug}/setup/sales/sources`,
//   },
//   {
//     id: "ownership_type",
//     name: "Ownership Type",
//     url: `/${slug}/setup/sales/ownership_type`,
//   },
//   {
//     id: "status",
//     name: "Status",
//     url: `/${slug}/setup/sales/status`,
//   },
//   {
//     id: "order_sources",
//     name: "Source Of Order",
//     url: `/${slug}/setup/sales/order_sources`,
//   },
//   {
//     id: "type",
//     name: "CRM Type",
//     url: `/${slug}/setup/sales/type`,
//   },
//   {
//     id: "order_stages",
//     name: "Sales Order Stages",
//     url: `/${slug}/setup/sales/order_stages`,
//   },
//   {
//     id: "credit_note_stages",
//     name: "Credit Note Stages",
//     url: `/${slug}/setup/sales/credit_note_stages`,
//   },
//   {
//     id: "price_offer_method",
//     name: "Price Offer Method",
//     url: `/${slug}/setup/sales/price_offer_method`,
//   },
//   {
//     id: "payment_terms",
//     name: "Payment Terms",
//     url: `/${slug}/setup/sales/payment_terms`,
//   },
//   {
//     id: "payment_method",
//     name: "Payment Method",
//     url: `/${slug}/setup/sales/payment_method`,
//   },
//   {
//     id: "shipment_method",
//     name: "Shipment Method",
//     url: `/${slug}/setup/sales/shipment_method`,
//   },
// ],

// children: [
//   {
//     id: "setup",
//     name: "Setup",
//     url: `/${slug}/setup/purchases`,
//   },
// ]
// children: [
//   {
//     id: "segments",
//     name: "Segments",
//     url: `/${slug}/setup/purchases/segments`,
//   },
//   {
//     id: "territories",
//     name: "Territories",
//     url: `/${slug}/setup/purchases/territories`,
//   },
//   {
//     id: "classification",
//     name: "Classification",
//     url: `/${slug}/setup/purchases/classification`,
//   },
//   {
//     id: "selling_groups",
//     name: "Selling Groups",
//     url: `/${slug}/setup/purchases/selling_groups`,
//   },
//   {
//     id: "purchase_order_stages",
//     name: "Purchase Order Stages",
//     url: `/${slug}/setup/purchases/purchase_order_stages`,
//   },
//   {
//     id: "debit_note_stages",
//     name: "Debit Note Stages",
//     url: `/${slug}/setup/purchases/debit_note_stages`,
//   },
//   {
//     id: "price_offer_method",
//     name: "Price Offer Method",
//     url: `/${slug}/setup/purchases/price_offer_method`,
//   },
//   {
//     id: "payment_terms",
//     name: "Payment Terms",
//     url: `/${slug}/setup/purchases/payment_terms`,
//   },
//   {
//     id: "payment_method",
//     name: "Payment Method",
//     url: `/${slug}/setup/purchases/payment_method`,
//   },
//   {
//     id: "shipment_method",
//     name: "Shipment Method",
//     url: `/${slug}/setup/purchases/shipment_method`,
//   },
// ],

// children: [
//   {
//     id: "Categories",
//     name: "Categories",
//     url: `/${slug}/setup/inventory/categories`,
//   },
//   {
//     id: "Brands",
//     name: "Brands",
//     url: `/${slug}/setup/inventory/brands`,
//   },
//   {
//     id: "UOM",
//     name: "Unit of measure",
//     url: `/${slug}/setup/inventory/uoms`,
//   },
// ],

// children: [
//   {
//     id: "Roles",
//     name: "Roles",
//     url: `/${slug}/setup/system/roles`,
//   },
// ],

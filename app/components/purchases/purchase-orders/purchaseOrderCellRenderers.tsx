// app/components/purchases/purchase-orders/purchaseOrderCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "-";
  }
};

const formatAmount = (val?: string | number | null): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return (
    <span className="font-mono text-right block">
      {num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
};

export function getPurchaseOrderCellRenderers(slug: string) {
  return {
    // Primary Key Navigation Link
    order_no: (row: PurchaseOrder) => (
      <Link
        href={`/${slug}/purchases/purchase-orders/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.order_no || "Draft"}
      </Link>
    ),

    // Status / Stage Badges
    current_stage: (row: PurchaseOrder & { current_stage?: string }) => (
      <PurchaseOrderStatusBadge
        status={row.current_stage || row.status || "Open"}
      />
    ),

    // Text Details
    supplier_name: (row: PurchaseOrder) => row.supplier_name || "-",
    supplier_no: (row: PurchaseOrder) => row.supplier_no || "-",
    supp_order_no: (row: PurchaseOrder) => row.supp_order_no || "-",
    previous_code: (row: PurchaseOrder) => row.previous_code || "-",
    purchaser: (row: PurchaseOrder) => row.purchaser || "-",
    contact: (row: PurchaseOrder) => row.contact || "-",
    phone: (row: PurchaseOrder & { phone?: string }) => row.phone || "-",
    email: (row: PurchaseOrder & { email?: string }) => row.email || "-",
    currency: (row: PurchaseOrder & { currency?: string }) =>
      row.currency || "-",

    // Address Fields
    supplier_address: (row: PurchaseOrder & { supplier_address?: string }) =>
      row.supplier_address || "-",
    supplier_address2: (row: PurchaseOrder & { supplier_address2?: string }) =>
      row.supplier_address2 || "-",
    city: (row: PurchaseOrder & { city?: string }) => row.city || "-",
    county: (row: PurchaseOrder & { county?: string }) => row.county || "-",
    post_code: (row: PurchaseOrder & { post_code?: string }) =>
      row.post_code || "-",
    country: (row: PurchaseOrder & { country?: string }) => row.country || "-",

    // Shipping Fields
    shipping_agent: (row: PurchaseOrder) => row.shipping_agent || "-",
    shipment_method: (row: PurchaseOrder & { shipment_method?: string }) =>
      row.shipment_method || "-",
    ship_to_address: (row: PurchaseOrder & { ship_to_address?: string }) =>
      row.ship_to_address || "-",
    ship_to_address2: (row: PurchaseOrder & { ship_to_address2?: string }) =>
      row.ship_to_address2 || "-",
    ship_to_city: (row: PurchaseOrder & { ship_to_city?: string }) =>
      row.ship_to_city || "-",
    ship_to_county: (row: PurchaseOrder & { ship_to_county?: string }) =>
      row.ship_to_county || "-",
    ship_to_post_code: (row: PurchaseOrder & { ship_to_post_code?: string }) =>
      row.ship_to_post_code || "-",

    // Book in Contacts
    book_in_contact: (row: PurchaseOrder) => row.book_in_contact || "-",
    book_in_phone: (row: PurchaseOrder) => row.book_in_phone || "-",
    book_in_email: (row: PurchaseOrder) => row.book_in_email || "-",
    warehouse_ref_no: (row: PurchaseOrder) => row.warehouse_ref_no || "-",
    consignment_no: (row: PurchaseOrder) => row.consignment_no || "-",
    link_to_so_no: (row: PurchaseOrder) => row.link_to_so_no || "-",
    cust_order_no: (row: PurchaseOrder & { cust_order_no?: string }) =>
      row.cust_order_no || "-",

    // Dates
    invoice_date: (row: PurchaseOrder) => formatDate(row.invoice_date),
    order_date: (row: PurchaseOrder) => formatDate(row.order_date),
    due_date: (row: PurchaseOrder) => formatDate(row.due_date),
    req_receipt_date: (row: PurchaseOrder) => formatDate(row.req_receipt_date),
    receipt_date: (row: PurchaseOrder) => formatDate(row.receipt_date),

    // Numeric Amounts
    net_amount: (row: PurchaseOrder) => formatAmount(row.subtotal),
    vat_amount: (row: PurchaseOrder) => formatAmount(row.tax_amount),
    total_amount: (row: PurchaseOrder) => formatAmount(row.total_amount),

    // Actions
    actions: (row: PurchaseOrder) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/purchases/purchase-orders/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
        {row.status?.toLowerCase() === "open" && (
          <Link
            href={`/${slug}/purchases/receipts/create?po=${row.id}`}
            className="rounded border border-emerald-600 px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
          >
            Receive
          </Link>
        )}
      </div>
    ),
  };
}

/* import React from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";


const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "-";
  }
};


const formatAmount = (val?: string | number | null): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return (
    <span className="font-mono text-right block">
      {num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
};

export function getPurchaseOrderCellRenderers(slug: string) {
  return {
    // Primary Key & Navigation Link
    order_no: (row: PurchaseOrder) => (
      <Link
        href={`/${slug}/purchases/purchase-orders/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.order_no || "Draft"}
      </Link>
    ),

    // Status Badge
    status: (row: PurchaseOrder) => (
      <PurchaseOrderStatusBadge status={row.status || "open"} />
    ),

    // Supplier & Purchaser Details
    supplier_name: (row: PurchaseOrder) => row.supplier_name || "-",
    supplier_no: (row: PurchaseOrder) => row.supplier_no || "-",
    purchaser: (row: PurchaseOrder) => row.purchaser || "-",
    contact: (row: PurchaseOrder) => row.contact || "-",

    // Key Dates
    order_date: (row: PurchaseOrder) => formatDate(row.order_date),
    expected_date: (row: PurchaseOrder) => formatDate(row.expected_date),
    created_at: (row: PurchaseOrder) => formatDate(row.created_at),
    updated_at: (row: PurchaseOrder) => formatDate(row.updated_at),
    approved_at: (row: PurchaseOrder) => formatDate(row.approved_at),
    posted_at: (row: PurchaseOrder) => formatDate(row.posted_at),
    closed_at: (row: PurchaseOrder) => formatDate(row.closed_at),
    cancelled_at: (row: PurchaseOrder) => formatDate(row.cancelled_at),
    req_receipt_date: (row: PurchaseOrder) => formatDate(row.req_receipt_date),
    receipt_date: (row: PurchaseOrder) => formatDate(row.receipt_date),
    invoice_date: (row: PurchaseOrder) => formatDate(row.invoice_date),
    due_date: (row: PurchaseOrder) => formatDate(row.due_date),

    // Amounts & Monetary Figures
    subtotal: (row: PurchaseOrder) => formatAmount(row.subtotal),
    tax_amount: (row: PurchaseOrder) => formatAmount(row.tax_amount),
    vat_amount: (row: PurchaseOrder) => formatAmount(row.tax_amount),
    // discount_amount: (row: PurchaseOrder) => formatAmount(row.discount_amount),
    net_amount: (row: PurchaseOrder) => formatAmount(row.subtotal),
    total_amount: (row: PurchaseOrder) => formatAmount(row.total_amount),
    exchange_rate: (row: PurchaseOrder) => (
      <span className="font-mono text-xs">
        {row.exchange_rate || "1.000000"}
      </span>
    ),

    // References & Documents
    reference: (row: PurchaseOrder) => row.reference || "-",
    consignment_no: (row: PurchaseOrder) => row.consignment_no || "-",
    supp_order_no: (row: PurchaseOrder) => row.supp_order_no || "-",
    link_to_so_no: (row: PurchaseOrder) => row.link_to_so_no || "-",
    linked_po: (row: PurchaseOrder) => row.linked_po || "-",
    link_to_cust: (row: PurchaseOrder) => row.link_to_cust || "-",
    previous_code: (row: PurchaseOrder) => row.previous_code || "-",

    // Payment & Terms
    payment_terms: (row: PurchaseOrder) => row.payment_terms || "-",
    payable_bank: (row: PurchaseOrder) => row.payable_bank || "-",

    // Booking & Contacts
    book_in_contact: (row: PurchaseOrder) => row.book_in_contact || "-",
    book_in_phone: (row: PurchaseOrder) => row.book_in_phone || "-",
    book_in_email: (row: PurchaseOrder) => row.book_in_email || "-",

    // Logistics & Shipping
    shipping_agent: (row: PurchaseOrder) => row.shipping_agent || "-",
    shipment_ref_no: (row: PurchaseOrder) => row.shipment_ref_no || "-",
    warehouse_ref_no: (row: PurchaseOrder) => row.warehouse_ref_no || "-",

    // Notes & Reasons
    notes: (row: PurchaseOrder) => row.notes || "-",
    internal_notes: (row: PurchaseOrder) => row.internal_notes || "-",
    reason: (row: PurchaseOrder) => row.reason || "-",

    // Flags & Booleans
    is_posted: (row: PurchaseOrder) => (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          row.is_posted
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.is_posted ? "Posted" : "Unposted"}
      </span>
    ),
    is_invoiced: (row: PurchaseOrder) => (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          row.is_posted
            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.is_posted ? "Invoiced" : "Pending"}
      </span>
    ),
    deduct_from_rebate: (row: PurchaseOrder) =>
      row.deduct_from_rebate ? "Yes" : "No",
    // shipment_po_not_req: (row: PurchaseOrder) =>
    //   row.shipment_po_not_req ? "Yes" : "No",
    anonymous_supplier: (row: PurchaseOrder) =>
      row.anonymous_supplier ? "Yes" : "No",

    // Actions Column
    actions: (row: PurchaseOrder) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/purchases/purchase-orders/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
        {row.status?.toLowerCase() === "open" && (
          <Link
            href={`/${slug}/purchases/receipts/create?po=${row.id}`}
            className="rounded border border-emerald-600 px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
          >
            Receive
          </Link>
        )}
      </div>
    ),
  };
} */

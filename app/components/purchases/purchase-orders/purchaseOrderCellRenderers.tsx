// app/components/purchases/purchase-orders/purchaseOrderCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";
import { format } from "date-fns";

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    return format(dateStr, "dd/MM/yyyy");
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
        status={row.current_stage ||  "Open"}
      />
    ),//row.status ||

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
        {/* {row.status?.toLowerCase() === "open" && (
          <Link
            href={`/${slug}/purchases/receipts/create?po=${row.id}`}
            className="rounded border border-emerald-600 px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
          >
            Receive
          </Link>
        )} */}
      </div>
    ),
  };
}

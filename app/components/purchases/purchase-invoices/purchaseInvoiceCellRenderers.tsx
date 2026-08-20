// app/components/purchases/purchase-invoices/purchaseInvoiceCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { PurchaseInvoice } from "@/types/purchase-invoice";
import PurchaseOrderStatusBadge from "../purchase-orders/PurchaseOrderStatusBadge";
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

export function getPurchaseInvoiceCellRenderers(slug: string) {
  return {
    invoice_code: (row: PurchaseInvoice) => (
      <Link
        href={`/${slug}/purchases/purchase-invoices/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.invoice_code || "Draft"}
      </Link>
    ),

    current_stage: (row: PurchaseInvoice) => (
      <PurchaseOrderStatusBadge status={row.current_stage || row.status || "Draft"} />
    ),

    order_code: (row: PurchaseInvoice) => row.order_code || "-",
    supp_order_no: (row: PurchaseInvoice) => row.supp_order_no || "-",
    prev_code: (row: PurchaseInvoice) => row.prev_code || "-",
    sell_to_cust_no: (row: PurchaseInvoice) => row.sell_to_cust_no || "-",
    sell_to_cust_name: (row: PurchaseInvoice) => row.sell_to_cust_name || "-",
    sell_to_address: (row: PurchaseInvoice) => row.sell_to_address || "-",
    sell_to_address2: (row: PurchaseInvoice) => row.sell_to_address2 || "-",
    sell_to_city: (row: PurchaseInvoice) => row.sell_to_city || "-",
    sell_to_county: (row: PurchaseInvoice) => row.sell_to_county || "-",
    sell_to_post_code: (row: PurchaseInvoice) => row.sell_to_post_code || "-",
    country: (row: PurchaseInvoice) => row.country || "-",
    sell_to_contact_no: (row: PurchaseInvoice) => row.sell_to_contact_no || "-",
    cust_phone: (row: PurchaseInvoice) => row.cust_phone || "-",
    cust_email: (row: PurchaseInvoice) => row.cust_email || "-",
    srm_purchase_code: (row: PurchaseInvoice) => row.srm_purchase_code || "-",
    posting_grp: (row: PurchaseInvoice) => row.posting_grp || "-",
    segment: (row: PurchaseInvoice) => row.segment || "-",
    crcode: (row: PurchaseInvoice) => row.crcode || "-",

    // Amounts
    net_amount: (row: PurchaseInvoice) => formatAmount(row.net_amount),
    tax_amount: (row: PurchaseInvoice) => formatAmount(row.tax_amount),
    grand_total: (row: PurchaseInvoice) => formatAmount(row.grand_total),

    // Dates
    invoice_date: (row: PurchaseInvoice) => formatDate(row.invoice_date),
    order_date: (row: PurchaseInvoice) => formatDate(row.order_date),
    due_date: (row: PurchaseInvoice) => formatDate(row.due_date),
    requested_delivery_date: (row: PurchaseInvoice) => formatDate(row.requested_delivery_date),
    receiptDate: (row: PurchaseInvoice) => formatDate(row.receiptDate),

    // Shipping & Booking
    shipping_agent: (row: PurchaseInvoice) => row.shipping_agent || "-",
    shipment_method: (row: PurchaseInvoice) => row.shipment_method || "-",
    ship_to_address: (row: PurchaseInvoice) => row.ship_to_address || "-",
    ship_to_address2: (row: PurchaseInvoice) => row.ship_to_address2 || "-",
    ship_to_city: (row: PurchaseInvoice) => row.ship_to_city || "-",
    ship_to_county: (row: PurchaseInvoice) => row.ship_to_county || "-",
    ship_to_post_code: (row: PurchaseInvoice) => row.ship_to_post_code || "-",
    book_in_contact: (row: PurchaseInvoice) => row.book_in_contact || "-",
    book_in_tel: (row: PurchaseInvoice) => row.book_in_tel || "-",
    book_in_email: (row: PurchaseInvoice) => row.book_in_email || "-",
    warehouse_booking_ref: (row: PurchaseInvoice) => row.warehouse_booking_ref || "-",
    consignmentNo: (row: PurchaseInvoice) => row.consignmentNo || "-",
    vatPosted: (row: PurchaseInvoice) => row.vatPosted || "-",
    LinkToSo: (row: PurchaseInvoice) => row.LinkToSo || "-",

    // Actions Column
    actions: (row: PurchaseInvoice) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/purchases/purchase-invoices/${row.id}`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          View
        </Link>
      </div>
    ),
  };
}
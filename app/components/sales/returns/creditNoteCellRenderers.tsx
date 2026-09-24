// /app/components/sales/returns/creditNoteCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { SalesReturn } from "@/types/sales-return";

const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
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

const formatStatusBadge = (status?: string | null): React.ReactNode => {
  if (!status) return "-";

  const statusUpper = status.toUpperCase();
  let badgeClass =
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  if (["POSTED", "PAID", "CREDITED", "COMPLETED"].includes(statusUpper)) {
    badgeClass =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  } else if (["DRAFT", "PENDING", "UNINVOICED"].includes(statusUpper)) {
    badgeClass =
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  } else if (["CANCELLED", "REJECTED", "VOID"].includes(statusUpper)) {
    badgeClass =
      "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClass}`}
    >
      {status}
    </span>
  );
};

export function getCreditNoteCellRenderers(slug: string, isPosted = false) {
  return {
    // Identifier Links & Numbers
    credit_note_no: (row: SalesReturn) => (
      <Link
        href={`/${slug}/sales/returns/${row.id}${!isPosted ? "/edit" : "/view"}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.credit_note_no || "Draft"}
      </Link>
    ),
    posted_credit_note_no: (row: SalesReturn) => (
      <Link
        href={`/${slug}/sales/returns/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.posted_credit_note_no || "-"}
      </Link>
    ),
    reference: (row: SalesReturn) => row.reference || "-",
    cust_return_no: (row: SalesReturn) => row.cust_return_no || "-",
    cust_order_no: (row: SalesReturn) => row.cust_order_no || "-",
    sq_no: (row: SalesReturn) => row.sq_no || "-",
    link_to_cm: (row: SalesReturn) => row.link_to_cm || "-",
    link_to_po: (row: SalesReturn) => row.link_to_po || "-",

    // Customer Information
    customer_no: (row: SalesReturn) => row.customer_no || "-",
    customer_name: (row: SalesReturn) => row.customer_name || "-",
    bill_to_customer_no: (row: SalesReturn) => row.bill_to_customer_no || "-",
    bill_to_customer_name: (row: SalesReturn) =>
      row.bill_to_customer_name || "-",
    contact: (row: SalesReturn) => row.contact || "-",
    email: (row: SalesReturn) => row.email || "-",

    // Statuses & Classifications
    status: (row: SalesReturn) => formatStatusBadge(row.status),
    credit_status: (row: SalesReturn) => formatStatusBadge(row.credit_status),
    shipment_status: (row: SalesReturn) =>
      formatStatusBadge(row.shipment_status),
    invoice_status: (row: SalesReturn) => formatStatusBadge(row.invoice_status),
    salesperson: (row: SalesReturn) => row.salesperson || "-",
    currency_id: (row: SalesReturn) => row.currency_id || "GBP",

    // Dates
    posting_date: (row: SalesReturn) => formatDate(row.posting_date),
    credit_note_date: (row: SalesReturn) => formatDate(row.credit_note_date),
    order_date: (row: SalesReturn) => formatDate(row.order_date),
    receipt_date: (row: SalesReturn) => formatDate(row.receipt_date),
    dispatch_date: (row: SalesReturn) => formatDate(row.dispatch_date),
    requested_delivery_date: (row: SalesReturn) =>
      formatDate(row.requested_delivery_date),
    delivery_date: (row: SalesReturn) => formatDate(row.delivery_date),
    due_date: (row: SalesReturn) => formatDate(row.due_date),
    created_at: (row: SalesReturn) => formatDate(row.created_at),
    posted_at: (row: SalesReturn) => formatDate(row.posted_at),
    // dispatched_at: (row: SalesReturn) => formatDate(row.dispatched_at),

    // Numeric Amounts
    subtotal: (row: SalesReturn) => formatAmount(row.subtotal),
    discount_amount: (row: SalesReturn) => formatAmount(row.discount_amount),
    freight_charges: (row: SalesReturn) => formatAmount(row.freight_charges),
    finance_charges: (row: SalesReturn) => formatAmount(row.finance_charges),
    insurance_charges: (row: SalesReturn) =>
      formatAmount(row.insurance_charges),
    vat_amount: (row: SalesReturn) => formatAmount(row.vat_amount),
    total_amount: (row: SalesReturn) => formatAmount(row.total_amount),
    credited_amount: (row: SalesReturn) => formatAmount(row.credited_amount),
    invoiced_amount: (row: SalesReturn) => formatAmount(row.invoiced_amount),

    // Payment & Shipping Terms
    payment_terms: (row: SalesReturn) => row.payment_terms || "-",
    payment_method: (row: SalesReturn) => row.payment_method || "-",
    receivable_bank: (row: SalesReturn) => row.receivable_bank || "-",
    shipment_method: (row: SalesReturn) => row.shipment_method || "-",
    shipping_agent: (row: SalesReturn) => row.shipping_agent || "-",
    shipment_ref_no: (row: SalesReturn) => row.shipment_ref_no || "-",
    warehouse_ref_no: (row: SalesReturn) => row.warehouse_ref_no || "-",
    cust_warehouse_ref_no: (row: SalesReturn) =>
      row.cust_warehouse_ref_no || "-",

    // Logistics & Book-In Contacts
    book_in_phone: (row: SalesReturn) => row.book_in_phone || "-",
    book_in_contact: (row: SalesReturn) => row.book_in_contact || "-",
    book_in_email: (row: SalesReturn) => row.book_in_email || "-",

    // Notes & Reasons
    reason: (row: SalesReturn) => row.reason || "-",
    notes: (row: SalesReturn) => row.notes || "-",

    // Actions Column
    actions: (row: SalesReturn) => (
      <div className="flex items-center gap-1.5">
        {isPosted || row.is_posted ? (
          <Link
            href={`/${slug}/sales/credit-notes/${row.id}/view`}
            className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          >
            View
          </Link>
        ) : (
          <Link
            href={`/${slug}/sales/credit-notes/${row.id}/edit`}
            className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          >
            Edit
          </Link>
        )}
      </div>
    ),
  };
}

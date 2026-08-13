// app/components/purchases/debit-notes/debitNoteCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { DebitNote } from "@/types/debit-note";
import DebitNoteStatusBadge from "./DebitNoteStatusBadge";

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

export function getDebitNoteCellRenderers(slug: string) {
  return {
    // Primary Key Navigation Link
    debitNoteCode: (row: DebitNote & { debitNoteCode?: string; debit_note_no?: string }) => (
      <Link
        href={`/${slug}/purchases/debit-notes/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.debitNoteCode || row.debit_note_no || "Draft"}
      </Link>
    ),

    // Status / Stage Badges
    current_stage: (row: DebitNote & { current_stage?: string; status?: string }) => (
      <DebitNoteStatusBadge status={row.current_stage || row.status || "OPEN"} />
    ),

    // Supplier Info
    supplierNo: (row: DebitNote & { supplierNo?: string; supplier_no?: string }) =>
      row.supplierNo || row.supplier_no || "-",
    supplierName: (row: DebitNote & { supplierName?: string; supplier_name?: string }) =>
      row.supplierName || row.supplier_name || "-",
    supplierCreditNoteNo: (row: DebitNote & { supplierCreditNoteNo?: string }) =>
      row.supplierCreditNoteNo || "-",
    prev_code: (row: DebitNote & { prev_code?: string }) => row.prev_code || "-",
    purchaser: (row: DebitNote & { purchaser?: string }) => row.purchaser || "-",
    posting_grp: (row: DebitNote & { posting_grp?: string }) => row.posting_grp || "-",
    segment: (row: DebitNote & { segment?: string }) => row.segment || "-",
    currency_code: (row: DebitNote & { currency_code?: string; currency?: string }) =>
      row.currency_code || row.currency || "-",

    // Contact Person Details
    supplierContactName: (row: DebitNote & { supplierContactName?: string }) =>
      row.supplierContactName || "-",
    supplierContactTelephone: (row: DebitNote & { supplierContactTelephone?: string }) =>
      row.supplierContactTelephone || "-",
    supplierContactEmail: (row: DebitNote & { supplierContactEmail?: string }) =>
      row.supplierContactEmail || "-",

    // Supplier Address
    supplierAddress: (row: DebitNote & { supplierAddress?: string }) =>
      row.supplierAddress || "-",
    supplierAddress2: (row: DebitNote & { supplierAddress2?: string }) =>
      row.supplierAddress2 || "-",
    supplierCity: (row: DebitNote & { supplierCity?: string }) =>
      row.supplierCity || "-",
    supplierCounty: (row: DebitNote & { supplierCounty?: string }) =>
      row.supplierCounty || "-",
    supplierPostCode: (row: DebitNote & { supplierPostCode?: string }) =>
      row.supplierPostCode || "-",
    country: (row: DebitNote & { country?: string }) => row.country || "-",

    // Shipping Info
    shipping_agent_code: (row: DebitNote & { shipping_agent_code?: string }) =>
      row.shipping_agent_code || "-",
    shipment_method: (row: DebitNote & { shipment_method?: string }) =>
      row.shipment_method || "-",
    shipToSupplierLocAddress: (
      row: DebitNote & { shipToSupplierLocAddress?: string }
    ) => row.shipToSupplierLocAddress || "-",
    shipToSupplierLocAaddress2: (
      row: DebitNote & { shipToSupplierLocAaddress2?: string }
    ) => row.shipToSupplierLocAaddress2 || "-",
    shipToSupplierLocCity: (row: DebitNote & { shipToSupplierLocCity?: string }) =>
      row.shipToSupplierLocCity || "-",
    shipToSupplierLocCounty: (
      row: DebitNote & { shipToSupplierLocCounty?: string }
    ) => row.shipToSupplierLocCounty || "-",
    shipToSupplierLocPostCode: (
      row: DebitNote & { shipToSupplierLocPostCode?: string }
    ) => row.shipToSupplierLocPostCode || "-",

    // Logistics & Refs
    book_in_contact: (row: DebitNote & { book_in_contact?: string }) =>
      row.book_in_contact || "-",
    book_in_tel: (row: DebitNote & { book_in_tel?: string }) => row.book_in_tel || "-",
    book_in_email: (row: DebitNote & { book_in_email?: string }) =>
      row.book_in_email || "-",
    shippingAgentRefNo: (row: DebitNote & { shippingAgentRefNo?: string }) =>
      row.shippingAgentRefNo || "-",
    warehouse_booking_ref: (row: DebitNote & { warehouse_booking_ref?: string }) =>
      row.warehouse_booking_ref || "-",
    customer_warehouse_ref: (row: DebitNote & { customer_warehouse_ref?: string }) =>
      row.customer_warehouse_ref || "-",
    purchaseInvoice: (row: DebitNote & { purchaseInvoice?: string }) =>
      row.purchaseInvoice || "-",
    purchaseOrderCode: (row: DebitNote & { purchaseOrderCode?: string }) =>
      row.purchaseOrderCode || "-",

    // Dates
    supplierCreditNoteDate: (
      row: DebitNote & { supplierCreditNoteDate?: string; document_date?: string }
    ) => formatDate(row.supplierCreditNoteDate || row.document_date),
    receipt_date: (row: DebitNote & { receipt_date?: string }) =>
      formatDate(row.receipt_date),
    dispatchDate: (row: DebitNote & { dispatchDate?: string }) =>
      formatDate(row.dispatchDate),
    deliveryDate: (row: DebitNote & { deliveryDate?: string }) =>
      formatDate(row.deliveryDate),

    // Financial Amounts
    Amount: (row: DebitNote & { Amount?: number; total_amount?: number }) =>
      formatAmount(row.Amount ?? row.total_amount),
    tax_amount: (row: DebitNote & { tax_amount?: number }) =>
      formatAmount(row.tax_amount),
    "Amount (incl VAT)": (
      row: DebitNote & { "Amount (incl VAT)"?: number; total_amount?: number }
    ) => formatAmount(row["Amount (incl VAT)"] ?? row.total_amount),

    // Numeric Counts
    documentDNCount: (row: DebitNote & { documentDNCount?: number }) => (
      <span className="font-mono text-right block">
        {row.documentDNCount ?? 0}
      </span>
    ),
    emailCount: (row: DebitNote & { emailCount?: number }) => (
      <span className="font-mono text-right block">
        {row.emailCount ?? 0}
      </span>
    ),

    // Actions
    actions: (row: DebitNote) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/purchases/debit-notes/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
}
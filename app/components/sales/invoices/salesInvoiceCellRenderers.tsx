// /app/components/sales/invoices/salesInvoiceCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { SalesInvoiceListing } from "@/types/sales-invoice";
import { format } from "date-fns";

const formatDate = (dateStr?: string | Date | null): string => {
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

const formatBoolean = (val?: boolean | null): React.ReactNode => {
  if (val === null || val === undefined) return "-";
  return (
    <span
      className={
        val
          ? "text-emerald-600 dark:text-emerald-400 font-medium"
          : "text-slate-400"
      }
    >
      {val ? "Yes" : "No"}
    </span>
  );
};

export function getSalesInvoiceCellRenderers(slug: string) {
  return {
    // Code / Identifier Links
    sales_invoice_code: (row: SalesInvoiceListing) => (
      <Link
        href={`/${slug}/sales/invoices/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.sales_order_no || row.invoice_no || "Draft"}
      </Link>
    ),
    sale_order_code: (row: SalesInvoiceListing) =>
      row.sale_order_code || row.sales_order_no || "-",
    // sale_quote_code: (row: SalesInvoiceListing) =>
    //   row.sale_quote_code || row.sales_quote_no || row.sq_no || "-",
    cust_order_no: (row: SalesInvoiceListing) => row.cust_order_no || "-",

    // Customer Information
    sell_to_cust_no: (row: SalesInvoiceListing) =>
      row.sell_to_cust_no || row.customer_no || "-",
    sell_to_cust_name: (row: SalesInvoiceListing) =>
      row.sell_to_cust_name || row.customer_name || "-",
    sell_to_address: (row: SalesInvoiceListing) => row.sell_to_address || "-",
    sell_to_address2: (row: SalesInvoiceListing) => row.sell_to_address2 || "-",
    sell_to_city: (row: SalesInvoiceListing) => row.sell_to_city || "-",
    sell_to_county: (row: SalesInvoiceListing) => row.sell_to_county || "-",
    sell_to_post_code: (row: SalesInvoiceListing) =>
      row.sell_to_post_code || "-",
    country_code: (row: SalesInvoiceListing) => row.country_code || "-",
    sell_to_contact_no: (row: SalesInvoiceListing) =>
      row.sell_to_contact_no || row.contact || "-",
    cust_phone: (row: SalesInvoiceListing) =>
      row.cust_phone || row.book_in_phone || "-",
    cust_email: (row: SalesInvoiceListing) =>
      row.cust_email || row.email || "-",

    // Meta & Classifications
    sale_person: (row: SalesInvoiceListing) =>
      row.sale_person || row.salesperson || "-",
    bill_to_posting_group_name: (row: SalesInvoiceListing) =>
      row.bill_to_posting_group_name || "-",
    segment: (row: SalesInvoiceListing) => row.segment || "-",
    currency_code: (row: SalesInvoiceListing) => row.currency_code || "-",
    payment_terms_code: (row: SalesInvoiceListing) => row.payment_terms || "-",

    // Dates
    posting_date: (row: SalesInvoiceListing) => formatDate(row.posting_date),
    // document_date: (row: SalesInvoiceListing) =>
    //   formatDate(row.document_date || row.invoice_date),
    due_date: (row: SalesInvoiceListing) => formatDate(row.due_date),
    dispatch_date: (row: SalesInvoiceListing) => formatDate(row.dispatch_date),

    // Numeric Amounts
    net_amount: (row: SalesInvoiceListing) =>
      formatAmount(row.net_amount ?? row.subtotal),
    tax_amount: (row: SalesInvoiceListing) =>
      formatAmount(row.tax_amount ?? row.vat_amount),
    grand_total: (row: SalesInvoiceListing) =>
      formatAmount(row.grand_total ?? row.total_amount),
    // remaining_amount: (row: SalesInvoiceListing) =>
    //   formatAmount(row.remaining_amount ?? row.balance_due),

    // Status & Flags
    // is_paid: (row: SalesInvoiceListing) => formatBoolean(row.is_paid),
    finance_charges_exists: (row: SalesInvoiceListing) =>
      formatBoolean(
        row.finance_charges_exists ??
          (row.finance_charges !== undefined
            ? Number(row.finance_charges) > 0
            : false),
      ),

    // Logistics & Shipping
    shipping_agent_code: (row: SalesInvoiceListing) =>
      row.shipping_agent_code || row.shipping_agent || "-",
    shipment_method_code: (row: SalesInvoiceListing) =>
      row.shipment_method_code || row.shipment_method || "-",
    ship_to_address: (row: SalesInvoiceListing) => row.ship_to_address || "-",
    ship_to_address2: (row: SalesInvoiceListing) => row.ship_to_address2 || "-",
    ship_to_city: (row: SalesInvoiceListing) => row.ship_to_city || "-",
    ship_to_county: (row: SalesInvoiceListing) => row.ship_to_county || "-",
    ship_to_post_code: (row: SalesInvoiceListing) =>
      row.ship_to_post_code || "-",

    // Warehouse & Contacts
    warehouse_booking_ref: (row: SalesInvoiceListing) =>
      row.warehouse_booking_ref || row.warehouse_ref_no || "-",
    customer_warehouse_ref: (row: SalesInvoiceListing) =>
      row.customer_warehouse_ref || row.cust_warehouse_ref_no || "-",

    // Actions Column
    actions: (row: SalesInvoiceListing) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/sales/invoices/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
}

// app/components/sales/quotes/salesQuoteCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { SalesQuoteListing } from "@/types/sales-quote";
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

export function getSalesQuoteCellRenderers(slug: string) {
  return {
    // Code / Identifier Links
    sale_order_code: (row: SalesQuoteListing) => (
      <Link
        href={`/${slug}/sales/orders/${row.id}/edit`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.sale_order_code || row.order_no || "Draft"}
      </Link>
    ),
    sale_quote_code: (row: SalesQuoteListing) =>
      row.sale_quote_code || row.sales_quote_no || row.sq_no || "-",
    cust_order_no: (row: SalesQuoteListing) => row.cust_order_no || "-",
    // prev_code: (row: SalesQuoteListing) => row.prev_code || "-",

    // Customer Information
    sell_to_cust_no: (row: SalesQuoteListing) =>
      row.sell_to_cust_no || row.customer_no || "-",
    sell_to_cust_name: (row: SalesQuoteListing) =>
      row.sell_to_cust_name || row.customer_name || "-",
    sell_to_address: (row: SalesQuoteListing) => row.sell_to_address || "-",
    sell_to_address2: (row: SalesQuoteListing) => row.sell_to_address2 || "-",
    sell_to_city: (row: SalesQuoteListing) => row.sell_to_city || "-",
    sell_to_county: (row: SalesQuoteListing) => row.sell_to_county || "-",
    sell_to_post_code: (row: SalesQuoteListing) => row.sell_to_post_code || "-",
    country_code: (row: SalesQuoteListing) => row.country_code || "-",
    sell_to_contact_no: (row: SalesQuoteListing) =>
      row.sell_to_contact_no || row.contact || "-",
    cust_phone: (row: SalesQuoteListing) =>
      row.cust_phone || row.book_in_phone || "-",
    cust_email: (row: SalesQuoteListing) => row.cust_email || row.email || "-",

    // Meta & Classifications
    sale_person: (row: SalesQuoteListing) =>
      row.sale_person || row.salesperson || "-",
    bill_to_posting_group_name: (row: SalesQuoteListing) =>
      row.bill_to_posting_group_name || "-",
    segment: (row: SalesQuoteListing) => row.segment || "-",
    currency_code: (row: SalesQuoteListing) => row.currency_code || "-",

    // Dates
    posting_date: (row: SalesQuoteListing) => formatDate(row.posting_date),
    offer_date: (row: SalesQuoteListing) =>
      formatDate(row.offer_date || row.order_date),
    due_date: (row: SalesQuoteListing) => formatDate(row.due_date),
    requested_delivery_date: (row: SalesQuoteListing) =>
      formatDate(row.requested_delivery_date),
    dispatch_date: (row: SalesQuoteListing) => formatDate(row.dispatch_date),
    delivery_date: (row: SalesQuoteListing) => formatDate(row.delivery_date),
    converted_to_so_on: (row: SalesQuoteListing) =>
      formatDate(row.converted_to_so_on),

    // Numeric Amounts
    net_amount: (row: SalesQuoteListing) =>
      formatAmount(row.net_amount ?? row.subtotal),
    tax_amount: (row: SalesQuoteListing) =>
      formatAmount(row.tax_amount ?? row.vat_amount),
    grand_total: (row: SalesQuoteListing) =>
      formatAmount(row.grand_total ?? row.total_amount),

    // Finance & Delivery Meta
    finance_charges_exists: (row: SalesQuoteListing) =>
      formatBoolean(
        row.finance_charges_exists ??
          (row.finance_charges !== undefined
            ? Number(row.finance_charges) > 0
            : false),
      ),
    insurance_charges_exists: (row: SalesQuoteListing) =>
      formatBoolean(
        row.insurance_charges_exists ??
          (row.insurance_charges !== undefined
            ? Number(row.insurance_charges) > 0
            : false),
      ),
    proof_of_delivery: (row: SalesQuoteListing) => (
      <span
        className={
          row.proof_of_delivery === "No"
            ? "text-red-600 dark:text-red-400 font-semibold"
            : ""
        }
      >
        {row.proof_of_delivery || "-"}
      </span>
    ),

    // Logistics & Shipping
    shipping_agent_code: (row: SalesQuoteListing) =>
      row.shipping_agent_code || row.shipping_agent || "-",
    shipment_method_code: (row: SalesQuoteListing) =>
      row.shipment_method_code || row.shipment_method || "-",
    ship_to_address: (row: SalesQuoteListing) => row.ship_to_address || "-",
    ship_to_address2: (row: SalesQuoteListing) => row.ship_to_address2 || "-",
    ship_to_city: (row: SalesQuoteListing) => row.ship_to_city || "-",
    ship_to_county: (row: SalesQuoteListing) => row.ship_to_county || "-",
    ship_to_post_code: (row: SalesQuoteListing) => row.ship_to_post_code || "-",

    // Warehouse & Contacts
    book_in_tel: (row: SalesQuoteListing) =>
      row.book_in_tel || row.book_in_phone || "-",
    comm_book_in_contact: (row: SalesQuoteListing) =>
      row.comm_book_in_contact || row.book_in_contact || "-",
    book_in_email: (row: SalesQuoteListing) =>
      row.book_in_email || row.book_in_email || "-",
    warehouse_booking_ref: (row: SalesQuoteListing) =>
      row.warehouse_booking_ref || row.warehouse_ref_no || "-",
    customer_warehouse_ref: (row: SalesQuoteListing) =>
      row.customer_warehouse_ref || row.cust_warehouse_ref_no || "-",
    linked_pos_1: (row: SalesQuoteListing) =>
      row.linked_pos_1 || row.link_to_po || "-",
    converted_to_so_by_name: (row: SalesQuoteListing) =>
      row.converted_to_so_by_name || row.converted_by || "-",

    // Actions Column
    actions: (row: SalesQuoteListing) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/sales/orders/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
}

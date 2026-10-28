// app/components/inventory/items/itemStockCellRenderers.tsx

import React from "react";
import Link from "next/link";
import type { StockDetailRow } from "./ItemStockModal";

// type CellRenderer = (row: StockDetailRow) => React.ReactNode;

// const formatDate = (
//   value: string | number | null | undefined,
// ): string => {
//   if (value === null || value === undefined || value === "") {
//     return "—";
//   }

//   const dateStr = String(value);

//   return dateStr.length >= 10
//     ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
//     : dateStr;
// };

// const formatQuantity = (value: string | number | null | undefined): string => {
//   if (value === null || value === undefined || value === "") {
//     return "-";
//   }

//   const number = Number(value);

//   if (!Number.isFinite(number)) {
//     return String(value);
//   }

//   return new Intl.NumberFormat("en-GB", {
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 4,
//   }).format(number);
// };

// const renderText = (
//   value: string | number | null | undefined,
// ): React.ReactNode => {
//   if (value === null || value === undefined || value === "") {
//     return <span className="text-slate-400">-</span>;
//   }

//   return String(value);
// };

// const dateRenderer = (
//   key: string,
// ): CellRenderer => {
//   return function renderDate(row: StockDetailRow): string {
//     return formatDate(row[key]);
//   };
// };

// const quantityRenderer = (
//   key: string,
// ): CellRenderer => {
//   return function renderQuantity(row: StockDetailRow): string {
//     return formatQuantity(row[key]);
//   };
// };


function getCurrentSlug(): string {
  if (typeof window === "undefined") return "";
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments.length > 0 ? segments[0] : "";
}

/**
 * Generates the appropriate ERP module URL for a given document type and reference ID/No.
 */
function getDocumentUrl(documentType: string, referenceId?: string | null): string {
  if (!referenceId) return "#";
  const slug = getCurrentSlug();
  if (!slug) return "#";

  const type = documentType?.toLowerCase().replace(/\s+/g, "_") || "";

  if (type.includes("purchase") && (type.includes("receipt") || type.includes("order"))) {
    return `/${slug}/purchases/purchase-orders/${referenceId}`;
  }
  if (type.includes("purchase") && (type.includes("receipt") || type.includes("invoice"))) {
    return `/${slug}/purchases/purchase-invoices/${referenceId}`;
  }
  if (type.includes("sales") && (type.includes("shipment") || type.includes("order"))) {
    return `/${slug}/sales/invoices/${referenceId}`;
  }
  if (type.includes("sales") && type.includes("invoice")) {
    return `/${slug}/sales/invoices/${referenceId}`;
  }
  if (type.includes("credit_note")) {
    return `/${slug}/sales/posted-credit-notes/${referenceId}`;
  }
  if (type.includes("debit_note")) {
    return `/${slug}/purchases/posted-debit-notes/${referenceId}`;
  }
  if (type.includes("transfer")) {
    return `/${slug}/inventory/transfers/${referenceId}`;
  }
  if (type.includes("journal")) {
    return `/${slug}/finance/journals/${referenceId}`;
  }

  return "#";
}

/* 
switch (type) {
        case "sales_invoice":
        case "invoice":
          return partyType === "customer"
            ? `/${slug}/sales/invoices/${targetId}`
            : `/${slug}/purchases/purchase-invoices/${targetId}`;

        case "purchase_invoice":
          return `/${slug}/purchases/purchase-invoices/${targetId}`;

        case "sales_order":
          return `/${slug}/sales/orders/${targetId}`;

        case "purchase_order":
          return `/${slug}/purchases/purchase-orders/${targetId}`;

        case "credit_memo":
        case "credit_note":
        case "debit_note":
        case "posted_debit_note":
        case "posted_credit_note":
          return partyType === "customer"
            ? `/${slug}/sales/posted-credit-notes/${targetId}`
            : `/${slug}/purchases/posted-debit-notes/${targetId}`;

        case "payment":
        case "receipt":
        case "refund":
        case "vendor_payment":
        case "customer_payment":
          return partyType === "customer"
            ? `/${slug}/finance/customer-journal/${targetId}`
            : `/${slug}/finance/supplier-journal/${targetId}`;

        default:
          return "#";
      }
*/

// export const itemStockCellRenderers: Record<string, CellRenderer> = {
//   document_type: (row) => renderText(row.document_type),
//   date: dateRenderer("date"),
//   document_no: (row) => renderText(row.document_no),
//   invoice_no: (row) => renderText(row.invoice_no),
//   consignment_no: (row) => renderText(row.consignment_no),
//   batch_no: (row) => renderText(row.batch_no),

//   production_date: dateRenderer("production_date"),
//   use_by_date: dateRenderer("use_by_date"),
//   received_date: dateRenderer("received_date"),
//   dispatch_date: dateRenderer("dispatch_date"),

//   warehouse: (row) => renderText(row.warehouse),
//   storage_location: (row) => renderText(row.storage_location),

//   qty: quantityRenderer("qty"),
//   sold_qty: quantityRenderer("sold_qty"),
//   allocated_qty: quantityRenderer("allocated_qty"),
//   available_qty: quantityRenderer("available_qty"),

//   uom: (row) => renderText(row.uom),
// };

export const itemStockCellRenderers: Record<
  string,
  (row: StockDetailRow) => React.ReactNode
> = {
  document_no: (row) => {
    const docNo = row.document_no;
    if (!docNo || docNo === "-") return "-";

    const url = getDocumentUrl(row.document_type || "", row.doc_id || row.id);

    if (url === "#") {
      return <span>{docNo}</span>;
    }

    return (
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
        title="Open document in new tab"
      >
        {docNo}
      </Link>
    );
  },

  invoice_no: (row) => {
    const invNo = row.invoice_no;
    if (!invNo || invNo === "-") return "-";

    const url = getDocumentUrl("sales_invoice", row.doc_id || row.id);

    if (url === "#") {
      return <span>{invNo}</span>;
    }

    return (
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
        title="Open invoice in new tab"
      >
        {invNo}
      </Link>
    );
  },
};

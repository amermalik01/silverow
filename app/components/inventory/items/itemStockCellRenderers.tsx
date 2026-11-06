// app/components/inventory/items/itemStockCellRenderers.tsx

import React from "react";
import Link from "next/link";
import type { StockDetailRow } from "./ItemStockModal";

function getCurrentSlug(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const segments = window.location.pathname
    .split("/")
    .filter(Boolean);

  return segments[0] ?? "";
}

function getTenantDocumentUrl(
  path: string | null | undefined,
): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  const slug = getCurrentSlug();

  if (!slug) {
    return null;
  }

  return `/${slug}${path}`;
}

// function getCurrentSlug(): string {
//   if (typeof window === "undefined") return "";
//   const segments = window.location.pathname.split("/").filter(Boolean);
//   return segments.length > 0 ? segments[0] : "";
// }

/**
 * Generates the appropriate ERP module URL for a given document type and reference ID/No.
 */
/* function getDocumentUrl(
  documentType: string,
  referenceId?: string | null,
): string {
  if (!referenceId) return "#";
  const slug = getCurrentSlug();
  if (!slug) return "#";

  const type = documentType?.toLowerCase().replace(/\s+/g, "_") || "";

  // if (
  //   type.includes("purchase") &&
  //   (type.includes("receipt") || type.includes("order"))
  // ) {
  //   return `/${slug}/purchases/purchase-orders/${referenceId}`;
  // }
  if (
    type.includes("purchase") &&
    (type.includes("receipt") || type.includes("invoice"))
  ) {
    return `/${slug}/purchases/purchase-invoices/${referenceId}`;
  }
  if (
    type.includes("sales") &&
    (type.includes("shipment") || type.includes("order"))
  ) {
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
} */

export const itemStockCellRenderers: Record<
  string,
  (row: StockDetailRow) => React.ReactNode
> = {
  document_no: (row) => {
    const documentUrl = getTenantDocumentUrl(row.document_url);

    return documentUrl ? (
      <Link
        href={documentUrl}
        // className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
        title="Open source document in new tab"
      >
        {row.document_no || "-"}
      </Link>
    ) : (
      <span>{row.document_no || "-"}</span>
    );

    // const docNo = row.document_no;

    // if (!docNo || docNo === "-") return "-";

    // if (!row.document_url) {
    //   return <span>{docNo}</span>;
    // }

    // return (
    //   <Link
    //     href={row.document_url}
    //     target="_blank"
    //     rel="noopener noreferrer"
    //     className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
    //     title="Open source document in new tab"
    //   >
    //     {docNo}
    //   </Link>
    // );
  },

  invoice_no: (row) => {
    // Invoice number cell
    const invoiceUrl = getTenantDocumentUrl(row.invoice_url);

    return invoiceUrl ? (
      <Link
        href={invoiceUrl}
        // className="text-emerald-600 hover:text-emerald-800 hover:underline dark:text-emerald-400"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
        title="Open related invoice in new tab"
      >
        {row.invoice_no || "-"}
      </Link>
    ) : (
      <span>{row.invoice_no || "-"}</span>
    );
    // const invoiceNo = row.invoice_no;

    // if (!invoiceNo || invoiceNo === "-") return "-";

    // if (!row.invoice_url) {
    //   return <span>{invoiceNo}</span>;
    // }

    // return (
    //   <Link
    //     href={row.invoice_url}
    //     target="_blank"
    //     rel="noopener noreferrer"
    //     className="font-medium text-[#1b431c] underline decoration-emerald-600/40 hover:decoration-emerald-600 dark:text-emerald-400"
    //     title="Open related invoice in new tab"
    //   >
    //     {invoiceNo}
    //   </Link>
    // );
  },
};

/* export const itemStockCellRenderers: Record<
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
}; */

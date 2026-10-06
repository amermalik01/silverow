// app/components/inventory/stock-transfer/transferStockCellRenderers.tsx

import React from "react";
import Link from "next/link";

/**
 * Stock Transfer listing record.
 *
 * Keep this interface aligned with the columns returned
 * by /api/inventory/transfer-stock/listing.
 */
export interface StockTransferRecord {
  id: string;

  transfer_no: string | number;

  transfer_date: string;

  warehouse_from_id?: string | null;
  warehouse_to_id?: string | null;

  /*
   * Prefer returning warehouse names from the listing API.
   * IDs remain optional as a fallback.
   */
  warehouse_from_name?: string | null;
  warehouse_to_name?: string | null;

  in_transit_code?: string | null;

  shipping_charge?: number | string | null;

  is_posted: boolean;

  posted_at?: string | null;
  posted_by?: string | null;

  description?: string | null;
}

/**
 * Format an ISO date string without introducing
 * timezone conversion on the client.
 *
 * Example:
 * 2026-10-05
 * =>
 * 05/10/2026
 */
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) {
    return "—";
  }

  return dateStr.length >= 10
    ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
    : dateStr;
};

/**
 * Format monetary values.
 */
const formatAmount = (value?: number | string | null): string => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Resolve warehouse display name.
 *
 * The preferred API response contains:
 * warehouse_from_name / warehouse_to_name.
 *
 * The ID fallback keeps the renderer compatible with
 * the current API until the listing query is updated.
 */
const getWarehouseName = (name?: string | null, id?: string | null): string => {
  if (name) {
    return name;
  }

  if (id) {
    return id;
  }

  return "—";
};

/**
 * Stock Transfer table cell renderers.
 */
export function getStockTransferCellRenderers(
  slug: string,
  createPath: string,
) {
  const basePath = createPath.replace("/create", "");

  return {
    transfer_no: (row: StockTransferRecord) => (
      <Link
        href={`${basePath}/${row.id}`}
        className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
      >
        {row.transfer_no}
      </Link>
    ),

    transfer_date: (row: StockTransferRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {formatDate(row.transfer_date)}
      </span>
    ),

    warehouse_from_name: (row: StockTransferRecord) => (
      <span className="text-slate-700 dark:text-slate-300 font-medium">
        {getWarehouseName(row.warehouse_from_name, row.warehouse_from_id)}
      </span>
    ),

    warehouse_to_name: (row: StockTransferRecord) => (
      <span className="text-slate-700 dark:text-slate-300 font-medium">
        {getWarehouseName(row.warehouse_to_name, row.warehouse_to_id)}
      </span>
    ),

    /*
     * These two renderers are useful if your table configuration
     * continues using warehouse_from_id / warehouse_to_id as
     * column keys.
     */
    warehouse_from_id: (row: StockTransferRecord) => (
      <span className="text-slate-700 dark:text-slate-300 font-medium">
        {getWarehouseName(row.warehouse_from_name, row.warehouse_from_id)}
      </span>
    ),

    warehouse_to_id: (row: StockTransferRecord) => (
      <span className="text-slate-700 dark:text-slate-300 font-medium">
        {getWarehouseName(row.warehouse_to_name, row.warehouse_to_id)}
      </span>
    ),

    in_transit_code: (row: StockTransferRecord) => (
      <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">
        {row.in_transit_code || "Direct"}
      </span>
    ),

    shipping_charge: (row: StockTransferRecord) => (
      <span className="text-slate-600 dark:text-slate-400 font-mono">
        {formatAmount(row.shipping_charge)}
      </span>
    ),

    posted_at: (row: StockTransferRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {row.posted_at ? formatDate(row.posted_at) : "—"}
      </span>
    ),

    posted_by: (row: StockTransferRecord) => (
      <span className="text-slate-600 dark:text-slate-400">
        {row.posted_by || "—"}
      </span>
    ),

    is_posted: (row: StockTransferRecord) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
          row.is_posted
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-800/20"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-amber-800/20"
        }`}
      >
        {row.is_posted ? "Posted" : "Draft"}
      </span>
    ),

    description: (row: StockTransferRecord) => (
      <span
        className="text-slate-600 dark:text-slate-400 truncate block"
        title={row.description ?? undefined}
      >
        {row.description || "—"}
      </span>
    ),
  };
}

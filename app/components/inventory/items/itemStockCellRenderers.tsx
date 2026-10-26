import React from "react";
import type { StockDetailRow } from "./ItemStockModal";

type CellRenderer = (row: StockDetailRow) => React.ReactNode;

// const formatDate = (value: string | number | null | undefined): string => {
//   if (value === null || value === undefined || value === "") {
//     return "-";
//   }

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return String(value);
//   }

//   return new Intl.DateTimeFormat("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   }).format(date);
// };

const formatDate = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const dateStr = String(value);

  return dateStr.length >= 10
    ? `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
    : dateStr;
};

const formatQuantity = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(number);
};

const renderText = (
  value: string | number | null | undefined,
): React.ReactNode => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">-</span>;
  }

  return String(value);
};

const dateRenderer = (
  key: string,
): CellRenderer => {
  return function renderDate(row: StockDetailRow): string {
    return formatDate(row[key]);
  };
};

const quantityRenderer = (
  key: string,
): CellRenderer => {
  return function renderQuantity(row: StockDetailRow): string {
    return formatQuantity(row[key]);
  };
};

export const itemStockCellRenderers: Record<string, CellRenderer> = {
  document_type: (row) => renderText(row.document_type),
  date: dateRenderer("date"),
  document_no: (row) => renderText(row.document_no),
  invoice_no: (row) => renderText(row.invoice_no),
  consignment_no: (row) => renderText(row.consignment_no),
  batch_no: (row) => renderText(row.batch_no),

  production_date: dateRenderer("production_date"),
  use_by_date: dateRenderer("use_by_date"),
  received_date: dateRenderer("received_date"),
  dispatch_date: dateRenderer("dispatch_date"),

  warehouse: (row) => renderText(row.warehouse),
  storage_location: (row) => renderText(row.storage_location),

  qty: quantityRenderer("qty"),
  sold_qty: quantityRenderer("sold_qty"),
  allocated_qty: quantityRenderer("allocated_qty"),
  available_qty: quantityRenderer("available_qty"),

  uom: (row) => renderText(row.uom),
};

// app/components/inventory/items/ItemStockModal.tsx


"use client";

import React, { useMemo, useState } from "react";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

import { itemStockCellRenderers } from "./itemStockCellRenderers";

type ColumnDef = {
  key: Extract<keyof StockDetailRow, string>;
  label: string;
  numeric?: boolean;
};

export type StockDetailRow = {
  id: string;

  doc_id?: string | null;
  reference_id?: string | null;

  document_type?: string;
  document_no?: string;
  invoice_no?: string;

  document_url?: string | null;
  invoice_url?: string | null;

  date?: string;
  consignment_no?: string;
  batch_no?: string;
  serial_no?: string;
  production_date?: string;
  use_by_date?: string;
  received_date?: string;
  dispatch_date?: string;
  warehouse?: string;
  storage_location?: string;
  qty?: number | string;
  sold_qty?: number | string;
  allocated_qty?: number | string;
  available_qty?: number | string;
  uom?: string;

  [key: string]: string | number | undefined | null;
};

type ItemStockModalProps = {
  isOpen: boolean;
  title: string;
  data: StockDetailRow[];
  onClose: () => void;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const columns: ColumnDef[] = [
  { key: "document_type", label: "Document Type" },
  { key: "date", label: "Date" },
  { key: "document_no", label: "Document No." },
  { key: "invoice_no", label: "Invoice No." },
  { key: "consignment_no", label: "Consignment No." },
  { key: "batch_no", label: "Batch No." },
  { key: "serial_no", label: "Serial No." },
  { key: "production_date", label: "Production Date" },
  { key: "use_by_date", label: "Use By Date" },
  { key: "received_date", label: "Received Date" },
  { key: "dispatch_date", label: "Dispatch Date" },
  { key: "warehouse", label: "Warehouse" },
  { key: "storage_location", label: "Storage Location" },
  { key: "qty", label: "Qty.", numeric: true },
  { key: "allocated_qty", label: "Allocated Qty.", numeric: true },
  { key: "available_qty", label: "Available Qty.", numeric: true },
  { key: "uom", label: "U.O.M" },
];

type ItemStockModalContentProps = Omit<
  ItemStockModalProps,
  "isOpen"
>;

function ItemStockModalContent({
  title,
  data,
  onClose,
  loading = false,
  error = null,
  onRetry,
}: ItemStockModalContentProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Global search across all displayed columns.
  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return data;
    }

    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];

        return String(value ?? "")
          .toLowerCase()
          .includes(query);
      }),
    );
  }, [data, search]);

  // Pagination calculations.
  const totalRecords = filteredData.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / pageSize),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;

  const endIndex = Math.min(
    startIndex + pageSize,
    totalRecords,
  );

  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const renderCell = (
    row: StockDetailRow,
    columnKey: string,
  ): React.ReactNode => {
    const renderer = itemStockCellRenderers[columnKey];

    if (renderer) {
      return renderer(row);
    }

    const value = row[columnKey];

    return value === null || value === undefined || value === ""
      ? "-"
      : String(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-[#1b431c] px-5 py-3 text-white">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">
              {title}
            </h2>

            <p className="mt-0.5 text-[11px] text-white/70">
              {loading
                ? "Loading stock records..."
                : `${data.length} stock ${
                    data.length === 1 ? "record" : "records"
                  }`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon icon="tabler:x" className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400"
            />

            <input
              type="text"
              placeholder="Search stock activity..."
              value={search}
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              disabled={loading || Boolean(error)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#103701] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-slate-600"
            />

            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {search && !loading && !error && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {filteredData.length} of {data.length}
              </span>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="flex min-h-0 flex-1 flex-col px-1 py-2">
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3">
                <Icon
                  icon="tabler:loader-2"
                  className="h-8 w-8 animate-spin text-[#1b431c] dark:text-emerald-400"
                />

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Loading stock details...
                </p>

                <p className="text-xs text-slate-400">
                  Please wait while the records are retrieved.
                </p>
              </div>
            ) : error ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3 px-4 text-center">
                <Icon
                  icon="tabler:alert-circle"
                  className="h-8 w-8 text-rose-500"
                />

                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                  Unable to load stock details
                </p>

                <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                  {error}
                </p>

                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-1 inline-flex items-center gap-2 rounded-md bg-[#1b431c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285b2a]"
                  >
                    <Icon icon="tabler:refresh" className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <Icon
                  icon="tabler:file-search"
                  className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-600"
                />

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {search
                    ? "No stock records match your search."
                    : "No stock activity records found."}
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="mt-1 text-xs font-medium text-[#1b431c] hover:underline dark:text-emerald-400"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[1900px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                  <tr className="border-b border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={[
                          "whitespace-nowrap p-2.5 font-semibold",
                          "border-r border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                          column.numeric ? "text-right" : "text-left",
                        ].join(" ")}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr
                      key={row.id || `${startIndex}-${index}`}
                      className="border-b border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={[
                            "whitespace-nowrap border-r border-slate-200 p-2 dark:border-slate-800",
                            "text-slate-700 dark:text-slate-300",
                            column.numeric
                              ? "text-right tabular-nums"
                              : "text-left",
                          ].join(" ")}
                        >
                          {renderCell(row, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-medium dark:border-slate-700 dark:bg-slate-800">
              {loading || error ? "—" : `${totalRecords} Total Records`}
            </span>

            <span>
              {loading || error
                ? "Records unavailable"
                : `Showing ${
                    totalRecords === 0 ? 0 : startIndex + 1
                  } to ${endIndex} records`}
            </span>

            <select
              value={pageSize}
              onChange={(event) =>
                handlePageSizeChange(Number(event.target.value))
              }
              aria-label="Records per page"
              disabled={loading || Boolean(error) || totalRecords === 0}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3">
            {!loading && !error && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  aria-label="Previous page"
                  className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Icon
                    icon="tabler:chevron-left"
                    className="h-4 w-4"
                  />
                </button>

                <span className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(totalPages, prev + 1),
                    )
                  }
                  aria-label="Next page"
                  className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Icon
                    icon="tabler:chevron-right"
                    className="h-4 w-4"
                  />
                </button>
              </div>
            )}

            <Button
              type="button"
              onClick={onClose}
              variant="cancel"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItemStockModal({
  isOpen,
  title,
  data,
  onClose,
  loading = false,
  error = null,
  onRetry,
}: ItemStockModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ItemStockModalContent
      title={title}
      data={data}
      onClose={onClose}
      loading={loading}
      error={error}
      onRetry={onRetry}
    />
  );
}


/* "use client";

import React, { useMemo, useState } from "react";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

import { itemStockCellRenderers } from "./itemStockCellRenderers";

type ColumnDef = {
  key: Extract<keyof StockDetailRow, string>;
  label: string;
  numeric?: boolean;
};

export type StockDetailRow = {
  id: string;

  doc_id?: string | null;
  reference_id?: string | null;

  document_type?: string;
  document_no?: string;
  invoice_no?: string;

  document_url?: string | null;
  invoice_url?: string | null;

  date?: string;
  consignment_no?: string;
  batch_no?: string;
  serial_no?: string;
  production_date?: string;
  use_by_date?: string;
  received_date?: string;
  dispatch_date?: string;
  warehouse?: string;
  storage_location?: string;
  qty?: number | string;
  sold_qty?: number | string;
  allocated_qty?: number | string;
  available_qty?: number | string;
  uom?: string;

  [key: string]: string | number | undefined | null;
};

type ItemStockModalProps = {
  isOpen: boolean;
  title: string;
  data: StockDetailRow[];
  onClose: () => void;
};

const columns: ColumnDef[] = [
  { key: "document_type", label: "Document Type" },
  { key: "date", label: "Date" },
  { key: "document_no", label: "Document No." },
  { key: "invoice_no", label: "Invoice No." },
  { key: "consignment_no", label: "Consignment No." },
  { key: "batch_no", label: "Batch No." },
  { key: "serial_no", label: "Serial No." },
  { key: "production_date", label: "Production Date" },
  { key: "use_by_date", label: "Use By Date" },
  { key: "received_date", label: "Received Date" },
  { key: "dispatch_date", label: "Dispatch Date" },
  { key: "warehouse", label: "Warehouse" },
  { key: "storage_location", label: "Storage Location" },
  { key: "qty", label: "Qty.", numeric: true },
  // { key: "sold_qty", label: "Sold Qty.", numeric: true },
  { key: "allocated_qty", label: "Allocated Qty.", numeric: true },
  { key: "available_qty", label: "Available Qty.", numeric: true },
  { key: "uom", label: "U.O.M" },
];

type ItemStockModalContentProps = Omit<ItemStockModalProps, "isOpen">;

function ItemStockModalContent({
  title,
  data,
  onClose,
}: ItemStockModalContentProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Global search across all displayed columns.
  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return data;
    }

    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];

        return String(value ?? "")
          .toLowerCase()
          .includes(query);
      }),
    );
  }, [data, search]);

  // Pagination calculations.
  const totalRecords = filteredData.length;

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;

  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const renderCell = (
    row: StockDetailRow,
    columnKey: string,
  ): React.ReactNode => {
    const renderer = itemStockCellRenderers[columnKey];

    if (renderer) {
      return renderer(row);
    }

    const value = row[columnKey];

    return value === null || value === undefined || value === ""
      ? "-"
      : String(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
   
        <div className="flex shrink-0 items-center justify-between bg-[#1b431c] px-5 py-3 text-white">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">
              {title}
            </h2>

            <p className="mt-0.5 text-[11px] text-white/70">
              {data.length} stock {data.length === 1 ? "record" : "records"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon icon="tabler:x" className="h-5 w-5" />
          </button>
        </div>

  
        <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row dark:border-slate-800 dark:bg-slate-900">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400"
            />

            <input
              type="text"
              placeholder="Search stock activity..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#103701] dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-slate-600"
            />

            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {search && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {filteredData.length} of {data.length}
              </span>
            )}
          </div>
        </div>


        <div className="flex min-h-0 flex-1 flex-col px-1 py-2">
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {filteredData.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <Icon
                  icon="tabler:file-search"
                  className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-600"
                />

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {search
                    ? "No stock records match your search."
                    : "No stock activity records found."}
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="mt-1 text-xs font-medium text-[#1b431c] hover:underline dark:text-emerald-400"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[1900px] border-collapse text-xs">

                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                  <tr className="border-b border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={[
                          "whitespace-nowrap p-2.5 font-semibold",
                          "text-slate-600 dark:text-slate-300",
                          "border-r border-slate-200 dark:border-slate-700",
                          column.numeric ? "text-right" : "text-left",
                        ].join(" ")}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

     
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr
                      key={`${startIndex}-${index}`}
                      className="border-b border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={[
                            "whitespace-nowrap p-2",
                            "border-r border-slate-200",
                            "dark:border-slate-800",
                            "text-slate-700 dark:text-slate-300",
                            column.numeric
                              ? "text-right tabular-nums"
                              : "text-left",
                          ].join(" ")}
                        >
                          {renderCell(row, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>


        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-medium dark:border-slate-700 dark:bg-slate-800">
              {totalRecords} Total Records
            </span>

            <span>
              Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex}{" "}
              records
            </span>

            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              aria-label="Records per page"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>


          <div className="flex items-center justify-end gap-3">
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  aria-label="Previous page"
                  className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Icon icon="tabler:chevron-left" className="h-4 w-4" />
                </button>

                <span className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  aria-label="Next page"
                  className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Icon icon="tabler:chevron-right" className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button type="button" onClick={onClose} variant="cancel">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItemStockModal({
  isOpen,
  title,
  data,
  onClose,
}: ItemStockModalProps) {
  if (!isOpen) {
    return null;
  }

  return <ItemStockModalContent title={title} data={data} onClose={onClose} />;
}
 */
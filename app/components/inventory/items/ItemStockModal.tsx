// app/components/inventory/items/ItemStockModal.tsx
"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

type ColumnDef = {
  key: string;
  label: string;
};

export type StockDetailRow = {
  document_type?: string;
  date?: string;
  document_no?: string;
  invoice_no?: string;
  consignment_no?: string;
  batch_no?: string;
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

export default function ItemStockModal({
  isOpen,
  title,
  data,
  onClose,
}: ItemStockModalProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState<number>(50);

  if (!isOpen) return null;

  const columns: ColumnDef[] = [
    { key: "document_type", label: "Document Type" },
    { key: "date", label: "Date" },
    { key: "document_no", label: "Document No." },
    { key: "invoice_no", label: "Invoice No." },
    { key: "consignment_no", label: "Consignment No." },
    { key: "batch_no", label: "Batch No." },
    { key: "production_date", label: "Production Date" },
    { key: "use_by_date", label: "Use By Date" },
    { key: "received_date", label: "Received Date" },
    { key: "dispatch_date", label: "Dispatch Date" },
    { key: "warehouse", label: "Warehouse" },
    { key: "storage_location", label: "Storage Location" },
    { key: "qty", label: "Qty." },
    { key: "sold_qty", label: "Sold Qty." },
    { key: "allocated_qty", label: "Allocated Qty." },
    { key: "available_qty", label: "Available Qty." },
    { key: "uom", label: "U.O.M" },
  ];

  // Filter rows based on column search inputs
  const filteredData = data.filter((row) => {
    return Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      return String(row[key] || "")
        .toLowerCase()
        .includes(val.toLowerCase());
    });
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-white">
          <button className="p-1 rounded bg-emerald-700 hover:bg-emerald-600">
            <Icon icon="tabler:settings" className="w-4 h-4" />
          </button>
          <button className="p-1 rounded bg-emerald-700 hover:bg-emerald-600">
            <Icon icon="tabler:filter" className="w-4 h-4" />
          </button>
          <button className="p-1 rounded bg-emerald-700 hover:bg-emerald-600">
            <Icon icon="tabler:help" className="w-4 h-4" />
          </button>
          <button className="p-1 rounded bg-emerald-700 hover:bg-emerald-600">
            <Icon icon="tabler:file-spreadsheet" className="w-4 h-4" />
          </button>
        </div>

        {/* Table Body with Horizontal Scroll */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead className="bg-emerald-950 text-white sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="p-2 border-r border-emerald-900 font-semibold min-w-[140px]"
                  >
                    <div>{col.label}</div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filters[col.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(col.key, e.target.value)
                      }
                      className="mt-1 w-full px-1.5 py-0.5 text-slate-900 bg-white rounded text-[11px] border border-emerald-800 focus:outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="p-2.5 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {row[col.key] !== undefined && row[col.key] !== null
                          ? String(row[col.key])
                          : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-6 text-slate-400"
                  >
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="px-2 py-1 bg-white dark:bg-slate-900 border rounded shadow-sm font-medium">
              {filteredData.length} Total Records
            </span>
            <span>Showing 1 to {filteredData.length} records</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-xs"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-4 py-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

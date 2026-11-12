// app/components/inventory/items/tabs/ItemActivityTab.tsx

// app/components/inventory/items/tabs/ItemActivityTab.tsx

"use client";

import { useCallback } from "react";
import Link from "next/link";

import { DataTable } from "@/app/components/DataTable/DataTable";

import type { FetchParams, FetchResponse, ColumnConfig } from "@/types/table";

import type { ItemMovement } from "@/lib/services/inventory/item-activity.service";

import { movementColumnsConfig } from "./activity/movement-columns";
import { activityTableConfigApi } from "./activity/activity-table-config";
import { fetchActivityListing } from "./activity/activity-listing-fetch";

interface Props {
  itemId: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  // Avoid timezone conversion for PostgreSQL DATE values.
  const datePart = value.slice(0, 10);
  const parts = datePart.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatNumber(value: number | null | undefined): string {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
}

function getTransactionLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getTransactionBadge(type: string) {
  const styles: Record<string, string> = {
    PURCHASE_RECEIPT:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",

    SALES_SHIPMENT:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",

    STOCK_TRANSFER_IN:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",

    STOCK_TRANSFER_OUT:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",

    OPENING_BALANCE:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",

    ITEM_JOURNAL_IN:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",

    ITEM_JOURNAL_OUT:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",

    DEBIT_NOTE_RETURN:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",

    CREDIT_NOTE_RETURN:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
  };

  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-[10px] font-semibold ${
        styles[type] ||
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {getTransactionLabel(type)}
    </span>
  );
}

function renderMovementCell(
  row: ItemMovement,
  columnKey: string,
): React.ReactNode {
  switch (columnKey) {
    case "posting_date":
      return (
        <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">
          {formatDate(row.posting_date)}
        </span>
      );

    case "transaction_no":
      return row.document_url ? (
        <Link
          href={row.document_url}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
        >
          {row.transaction_no || "—"}
        </Link>
      ) : (
        <span className="font-medium">{row.transaction_no || "—"}</span>
      );

    case "invoice_no":
      return row.invoice_no ? (
        row.invoice_url ? (
          <Link
            href={row.invoice_url}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.invoice_no}
          </Link>
        ) : (
          <span>{row.invoice_no}</span>
        )
      ) : (
        "—"
      );

    case "transaction_type":
      return getTransactionBadge(row.transaction_type);

    case "movement_direction": {
      const isInbound = row.movement_direction === "IN";

      return (
        <span
          className={`inline-flex min-w-12 justify-center rounded px-2 py-1 text-[10px] font-bold ${
            isInbound
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
          }`}
        >
          {isInbound ? "IN" : "OUT"}
        </span>
      );
    }

    case "quantity":
      return (
        <span className="block text-right font-semibold tabular-nums">
          {formatNumber(row.quantity)}
        </span>
      );

    case "unit_cost":
      return (
        <span className="block text-right tabular-nums">
          {formatNumber(row.unit_cost)}
        </span>
      );

    case "total_cost":
      return (
        <span className="block text-right font-semibold tabular-nums">
          {formatNumber(row.total_cost)}
        </span>
      );

    case "warehouse_name":
      return (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {row.warehouse_name || "—"}
        </span>
      );

    case "location_name":
      return row.location_name || "—";

    case "batch_no":
      return row.batch_no || "—";

    case "serial_no":
      return row.serial_no || "—";

    default:
      return undefined as unknown as React.ReactNode;
  }
}

export default function ItemActivityTab({ itemId }: Props) {
  const fetchMovements = useCallback(
    async (params: FetchParams): Promise<FetchResponse<ItemMovement>> => {
      return fetchActivityListing<ItemMovement>(itemId, "movements", params);
    },
    [itemId],
  );

  const renderRowCell = useCallback(
    (row: ItemMovement, columnKey: string) =>
      renderMovementCell(row, columnKey),
    [],
  );

  const columnsConfigApi = activityTableConfigApi as {
    get: (moduleKey: string) => Promise<ColumnConfig[]>;
    save: (moduleKey: string, columns: ColumnConfig[]) => Promise<void>;
    reset: (moduleKey: string) => Promise<ColumnConfig[]>;
  };

  if (!itemId) {
    return (
      <div className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
        Save the item before viewing its movement transactions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Movement Transactions
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Complete inventory ledger movements for this item. Each physical layer
          movement is displayed as an individual transaction row.
        </p>
      </div>

      <DataTable<ItemMovement>
        moduleKey="item_activity_movements"
        fetchApi={fetchMovements}
        columnsConfigApi={columnsConfigApi}
        renderRowCell={renderRowCell}
        rowKey="id"
        enableRowSelection={false}
      />
    </div>
  );
}

/* "use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import Link from "next/link";

interface WarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  location_title?: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost?: number;
  expiry_date?: string;
}

interface TransactionMovement {
  id: string;
  transaction_no: string;
  transaction_type: string;

  invoice_no: string | null;
  invoice_url: string | null;
  document_url: string | null;

  reference_type?: string;
  posting_date: string;
  status: string;
  warehouse_name: string;
  quantity: number;
  movement_direction: "IN" | "OUT";
  unit_cost: number;
  total_cost: number;
  batch_no?: string;
  serial_no?: string;
  created_at: string;
}

interface InventoryAllocation {
  id: string;
  warehouse_name: string;
  batch_no?: string;
  bin_code?: string;
  allocated_quantity: number;
  unit_cost: number;
  total_cost: number;
  allocation_method: string;
  status: string;
  created_at: string;
}

interface ActivityData {
  summary: {
    totalPhysical: number;
    totalReserved: number;
    totalAvailable: number;
  };
  warehouseStock: WarehouseStock[];
  transactions: TransactionMovement[];
  allocations: InventoryAllocation[];
}

interface Props {
  itemId: string;
}

export default function ItemActivityTab({ itemId }: Props) {
  const [data, setData] = useState<ActivityData>({
    summary: {
      totalPhysical: 0,
      totalReserved: 0,
      totalAvailable: 0,
    },
    warehouseStock: [],
    transactions: [],
    allocations: [],
  });

  const [activeSubView, setActiveSubView] = useState<"stock" | "transactions">(
    "stock",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(
    async (signal?: AbortSignal) => {
      if (!itemId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/inventory/items/${encodeURIComponent(itemId)}/activity`,
          {
            method: "GET",
            signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as {
            error?: string;
            message?: string;
          } | null;

          throw new Error(
            result?.error || result?.message || "Failed to load item activity.",
          );
        }

        const result = (await response.json()) as ActivityData;

        if (signal?.aborted) return;

        setData({
          summary: result.summary ?? {
            totalPhysical: 0,
            totalReserved: 0,
            totalAvailable: 0,
          },
          warehouseStock: Array.isArray(result.warehouseStock)
            ? result.warehouseStock
            : [],
          transactions: Array.isArray(result.transactions)
            ? result.transactions
            : [],
          allocations: Array.isArray(result.allocations)
            ? result.allocations
            : [],
        });
      } catch (err: unknown) {
        if (signal?.aborted) return;

        const message =
          err instanceof Error ? err.message : "Error fetching item activity.";

        setError(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [itemId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchActivity(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchActivity]);

  const filteredTransactions = data.transactions.filter((tx) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      (tx.transaction_no ?? "").toLowerCase().includes(query) ||
      (tx.warehouse_name ?? "").toLowerCase().includes(query) ||
      (tx.batch_no ?? "").toLowerCase().includes(query) ||
      (tx.serial_no ?? "").toLowerCase().includes(query);

    const matchesType =
      typeFilter === "ALL" || tx.transaction_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTransactionBadge = (type: string) => {
    const styles: Record<string, string> = {
      PURCHASE_RECEIPT:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      SALES_SHIPMENT:
        "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",
      STOCK_TRANSFER_IN:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",
      STOCK_TRANSFER_OUT:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",
      OPENING_BALANCE:
        "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      ITEM_JOURNAL_IN:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
      ITEM_JOURNAL_OUT:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
      DEBIT_NOTE_RETURN:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
      CREDIT_NOTE_RETURN:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
    };

    return (
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-bold capitalize ${
          styles[type] ||
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {type.replace(/_/g, " ")}
      </span>
    );
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy");
  };

  if (
    loading &&
    data.warehouseStock.length === 0 &&
    data.transactions.length === 0
  ) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Icon
          icon="tabler:loader-2"
          className="h-7 w-7 animate-spin text-[#1b431c] dark:text-emerald-400"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading item activity...
        </p>
      </div>
    );
  }

  if (
    error &&
    data.warehouseStock.length === 0 &&
    data.transactions.length === 0
  ) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-white px-4 dark:border-rose-900/50 dark:bg-slate-900">
        <Icon icon="tabler:alert-circle" className="h-8 w-8 text-rose-500" />
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        <button
          type="button"
          onClick={() => void fetchActivity()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-[#1b431c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285b2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon
            icon="tabler:refresh"
            className={loading ? "animate-spin" : ""}
          />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchActivity()}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800 sm:flex-row">
        <div className="flex w-fit items-center gap-1 rounded-xl border border-[#d5e2d2] bg-[#eef3ec] p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubView("stock")}
            className={`rounded-lg px-4 py-2 capitalize transition-all duration-200 ${
              activeSubView === "stock"
                ? "bg-[#d5e2d2] font-semibold text-[#36543b] shadow-sm dark:bg-[#45634a] dark:text-white"
                : "text-[#6b806c] hover:bg-[#e1eadf] hover:text-[#36543b] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            Warehouse Stock
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("transactions")}
            className={`rounded-lg px-4 py-2 capitalize transition-all duration-200 ${
              activeSubView === "transactions"
                ? "bg-[#d5e2d2] font-semibold text-[#36543b] shadow-sm dark:bg-[#45634a] dark:text-white"
                : "text-[#6b806c] hover:bg-[#e1eadf] hover:text-[#36543b] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            Movement Transactions
          </button>
        </div>

        {activeSubView === "transactions" && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="ALL">All Modules</option>
              <option value="OPENING_BALANCE">Opening Balance</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
              <option value="SALES_SHIPMENT">Sales Shipment</option>
              <option value="STOCK_TRANSFER_IN">Stock Transfer In</option>
              <option value="STOCK_TRANSFER_OUT">Stock Transfer Out</option>
              <option value="ITEM_JOURNAL_IN">Item Journal In</option>
              <option value="ITEM_JOURNAL_OUT">Item Journal Out</option>
              <option value="DEBIT_NOTE_RETURN">Debit Note</option>
              <option value="CREDIT_NOTE_RETURN">Credit Note</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reference, batch, serial..."
              className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:w-48"
            />
          </div>
        )}
      </div>

      {activeSubView === "stock" && (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5">Batch / Serial</th>
                <th className="p-2.5 text-right">Total Qty</th>
                <th className="p-2.5 text-right">Allocated Qty</th>
                <th className="p-2.5 text-right">Available Qty</th>
                <th className="p-2.5 text-right">Avg Cost</th>
                <th className="p-2.5 text-center">Expiry Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800">
              {data.warehouseStock.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center font-sans text-slate-400"
                  >
                    No active stock layers found in ledger.
                  </td>
                </tr>
              ) : (
                data.warehouseStock.map((row, index) => (
                  <tr
                    key={`${row.warehouse_id}-${row.batch_no ?? ""}-${index}`}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {row.warehouse_name}{" "}
                      <span className="text-[10px] text-slate-400">
                        ({row.warehouse_code})
                      </span>
                    </td>

                    <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">
                      {row.location_title || "-"}
                    </td>

                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {row.batch_no || row.serial_no || "-"}
                    </td>

                    <td className="p-2.5 text-right font-medium">
                      {Number(row.quantity || 0)}
                    </td>

                    <td className="p-2.5 text-right font-medium text-amber-600">
                      {Number(row.reserved_quantity || 0)}
                    </td>

                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(row.available_quantity || 0)}
                    </td>

                    <td className="p-2.5 text-right text-slate-500">
                      {row.average_cost != null
                        ? Number(row.average_cost).toFixed(2)
                        : "-"}
                    </td>

                    <td className="p-2.5 text-center font-sans text-slate-500">
                      {formatDate(row.expiry_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubView === "transactions" && (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
          <table className="w-full table-fixed border-collapse text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Invoice No.</th>
                <th className="p-2.5">Transaction Type</th>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Batch</th>
                <th className="p-2.5">Serial No.</th>
                <th className="p-2.5 text-center">Direction</th>
                <th className="p-2.5 text-right">Quantity</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-right">Total Cost</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center font-sans text-slate-400"
                  >
                    No ledger movement history recorded.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIn = tx.movement_direction?.toUpperCase() === "IN";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">
                        {formatDate(tx.posting_date)}
                      </td>

                      <td className="p-2.5 font-sans">
                        {tx.invoice_no && tx.invoice_url ? (
                          <Link
                            href={tx.invoice_url}
                            className="font-semibold text-[#1b431c] underline decoration-dotted underline-offset-2 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {tx.invoice_no}
                          </Link>
                        ) : (
                          <span className="text-slate-400">
                            {tx.invoice_no || "-"}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 font-sans">
                        {getTransactionBadge(tx.transaction_type)}
                      </td>

                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.warehouse_name || "-"}
                      </td>

                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.batch_no || "-"}
                      </td>

                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.serial_no || "-"}
                      </td>

                      <td className="p-2.5 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            isIn
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {isIn ? "IN" : "OUT"}
                        </span>
                      </td>

                      <td className="p-2.5 text-right font-bold">
                        {isIn ? "" : "-"}
                        {Number(tx.quantity || 0)}
                      </td>

                      <td className="p-2.5 text-right text-slate-500">
                        {Number(tx.unit_cost || 0).toFixed(2)}
                      </td>

                      <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                        {Number(tx.total_cost || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} */

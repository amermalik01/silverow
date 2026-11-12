// app/components/inventory/items/tabs/WarehouseStockTab.tsx

"use client";

import { useCallback } from "react";

import { DataTable } from "@/app/components/DataTable/DataTable";

import type { FetchParams, FetchResponse, ColumnConfig } from "@/types/table";

import type { ItemWarehouseStock } from "@/lib/services/inventory/item-activity.service";

import { warehouseStockColumnsConfig } from "./activity/warehouse-stock-columns";
import { activityTableConfigApi } from "./activity/activity-table-config";
import { fetchActivityListing } from "./activity/activity-listing-fetch";

interface Props {
  itemId: string;
}

export interface WarehouseStockListing extends ItemWarehouseStock {
  id: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  // Preserve the database DATE without timezone conversion.
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

function renderWarehouseCell(
  row: WarehouseStockListing,
  columnKey: string,
): React.ReactNode {
  switch (columnKey) {
    case "warehouse_name":
      return (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.warehouse_name || "—"}
        </span>
      );

    case "warehouse_code":
      return (
        <span className="text-slate-500 dark:text-slate-400">
          {row.warehouse_code || "—"}
        </span>
      );

    case "quantity":
      return (
        <span className="block text-right font-semibold tabular-nums">
          {formatNumber(row.quantity)}
        </span>
      );

    case "reserved_quantity":
      return (
        <span className="block text-right font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          {formatNumber(row.reserved_quantity)}
        </span>
      );

    case "available_quantity":
      return (
        <span className="block text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatNumber(row.available_quantity)}
        </span>
      );

    case "average_cost":
      return (
        <span className="block text-right tabular-nums">
          {formatNumber(row.average_cost)}
        </span>
      );

    case "expiry_date":
      return formatDate(row.expiry_date);

    case "last_movement_at":
      return formatDate(row.last_movement_at);

    default:
      return undefined as unknown as React.ReactNode;
  }
}

export default function WarehouseStockTab({ itemId }: Props) {
  const fetchWarehouseStock = useCallback(
    async (
      params: FetchParams,
    ): Promise<FetchResponse<WarehouseStockListing>> => {
      return fetchActivityListing<WarehouseStockListing>(
        itemId,
        "warehouse",
        params,
      );
    },
    [itemId],
  );

  const renderRowCell = useCallback(
    (row: WarehouseStockListing, columnKey: string) =>
      renderWarehouseCell(row, columnKey),
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
        Save the item before viewing warehouse stock.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Warehouse Stock
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Physical, reserved and available stock quantities by warehouse.
        </p>
      </div>

      <DataTable<WarehouseStockListing>
        moduleKey="item_activity_warehouse_stock"
        fetchApi={fetchWarehouseStock}
        columnsConfigApi={columnsConfigApi}
        renderRowCell={renderRowCell}
        rowKey="id"
        enableRowSelection={false}
      />
    </div>
  );
}

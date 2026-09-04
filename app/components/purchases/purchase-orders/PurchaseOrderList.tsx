// app/components/purchases/purchase-orders/PurchaseOrderList.tsx

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";

import { PurchaseOrder } from "@/types/purchase-order";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseOrderCellRenderers } from "./purchaseOrderCellRenderers";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  /**
   * Renderer registry.
   *
   * If getPurchaseOrderCellRenderers creates a new object on every
   * render, useMemo keeps the reference stable.
   */
  const cellRenderers = useMemo(
    () => getPurchaseOrderCellRenderers(slug),
    [slug],
  );

  /**
   * Custom cell dispatcher.
   */
  const renderRowCell = useCallback(
    (row: PurchaseOrder, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];

      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  /**
   * Purchase order listing API.
   */
  const fetchPurchaseOrders = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PurchaseOrder>> => {
      const res = await fetch("/api/purchase-orders/listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Failed to load purchase orders (${res.status})`);
      }

      return res.json();
    },
    [],
  );

  /**
   * Table customization API.
   */
  const columnsConfigApi = useMemo(
    () => ({
      get: async (moduleKey: string): Promise<ColumnConfig[]> => {
        const res = await fetch(
          `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
        );

        if (!res.ok) {
          throw new Error(`Failed to load table configuration (${res.status})`);
        }

        return res.json();
      },

      save: async (
        moduleKey: string,
        configs: ColumnConfig[],
      ): Promise<void> => {
        const res = await fetch("/api/table-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            moduleKey,
            configs,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save table configuration (${res.status})`);
        }
      },

      reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
        const resetRes = await fetch(
          `/api/table-config/reset?moduleKey=${encodeURIComponent(moduleKey)}`,
          {
            method: "POST",
          },
        );

        if (!resetRes.ok) {
          throw new Error(
            `Failed to reset table configuration (${resetRes.status})`,
          );
        }

        const res = await fetch(
          `/api/table-config?moduleKey=${encodeURIComponent(moduleKey)}`,
        );

        if (!res.ok) {
          throw new Error(
            `Failed to reload table configuration (${res.status})`,
          );
        }

        return res.json();
      },
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Purchase Order",
          },
        ]}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Purchase Orders</h2>

          <p className="text-xs text-gray-500">
            Manage supplier orders, shipments and invoices
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/purchases/purchase-orders/create`}>
            + Create
          </Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PurchaseOrder>
          moduleKey="purchase_orders"
          fetchApi={fetchPurchaseOrders}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          /**
           * Purchase Orders need row selection.
           *
           * Other DataTable instances can omit this prop.
           */
          enableRowSelection={true}
          /**
           * PurchaseOrder has an id property.
           */
          rowKey="id"
          /**
           * Optional:
           * This is where you can later connect bulk actions.
           */
          onSelectionChange={(selectedIds) => {
            console.log("Selected purchase orders:", selectedIds);
          }}
        />
      </div>
    </div>
  );
}

/* "use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseOrderCellRenderers } from "./purchaseOrderCellRenderers";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  // 1. Get registry renderers for purchase order table
  const cellRenderers = getPurchaseOrderCellRenderers(slug);

  // 2. Memoized cell dispatcher to preserve identity across renders
  const renderRowCell = useCallback(
    (row: PurchaseOrder, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  // 3. Memoized Fetch API reference to keep DataTable useEffect dependencies stable
  const fetchPurchaseOrders = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PurchaseOrder>> => {
      const res = await fetch("/api/purchase-orders/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    [],
  );

  // 4. Memoized columnsConfigApi object reference
  const columnsConfigApi = useMemo(
    () => ({
      get: async (moduleKey: string): Promise<ColumnConfig[]> => {
        const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
        return res.json();
      },
      save: async (
        moduleKey: string,
        configs: ColumnConfig[],
      ): Promise<void> => {
        await fetch("/api/table-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey, configs }),
        });
      },
      reset: async (moduleKey: string): Promise<ColumnConfig[]> => {
        await fetch(`/api/table-config/reset?moduleKey=${moduleKey}`, {
          method: "POST",
        });
        const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
        return res.json();
      },
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Purchase Order",
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Purchase Orders</h2>
          <p className="text-xs text-gray-500">
            Manage supplier orders, shipments and invoices
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/purchases/purchase-orders/create`}>
            + Create
          </Link>
        </Button>
      </div>


      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PurchaseOrder>
          moduleKey="purchase_orders"
          fetchApi={fetchPurchaseOrders}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          showSelection={false}
        />
      </div>
    </div>
  );
} */

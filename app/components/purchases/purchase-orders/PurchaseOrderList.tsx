// app/components/purchases/purchase-orders/PurchaseOrderList.tsx

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseOrderCellRenderers } from "./purchaseOrderCellRenderers";

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
    [cellRenderers]
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
    []
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
        configs: ColumnConfig[]
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
    []
  );

  return (
    <div className="space-y-4 container mx-auto p-4">
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
        />
      </div>
    </div>
  );
}

/* "use client";

import Link from "next/link";
import { PurchaseOrder } from "@/types/purchase-order";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseOrderCellRenderers } from "./purchaseOrderCellRenderers";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  // 1. Get registry renderers for purchase order table
  const cellRenderers = getPurchaseOrderCellRenderers(slug);

  // 2. Ultra-clean render row cell dispatcher
  const renderRowCell = (row: PurchaseOrder, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined; // Fallback to raw value in DataTable
  };

  // Data Fetching Handler
  const fetchPurchaseOrders = async (
    params: FetchParams,
  ): Promise<FetchResponse<PurchaseOrder>> => {
    const res = await fetch("/api/purchase-orders/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // Config Persistence APIs
  const columnsConfigApi = {
    get: async (moduleKey: string): Promise<ColumnConfig[]> => {
      const res = await fetch(`/api/table-config?moduleKey=${moduleKey}`);
      return res.json();
    },
    save: async (moduleKey: string, configs: ColumnConfig[]): Promise<void> => {
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
  };

  return (
    <div className="space-y-4 container mx-auto p-4">

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
        />
      </div>
    </div>
  );
} */


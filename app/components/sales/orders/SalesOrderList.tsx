// /app/components/sales/orders/SalesOrderList.tsx

"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { SalesOrder } from "@/types/sales-order";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getSalesOrderCellRenderers } from "./salesOrderCellRenderers";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

export default function SalesOrderList({ slug }: Props) {
  const cellRenderers = useMemo(() => getSalesOrderCellRenderers(slug), [slug]);

  const renderRowCell = useCallback(
    (row: SalesOrder, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];

      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  const fetchSalesOrders = async (
    params: FetchParams,
  ): Promise<FetchResponse<SalesOrder>> => {
    const res = await fetch("/api/sales/sales-orders/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

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
    <div className="space-y-4 ">
      <Breadcrumbs
        items={[
          {
            label: "Sales Order",
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Sales Orders</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer sales orders, dispatches, and invoicing
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/sales/orders/new`}>+ Create</Link>
        </Button>
      </div>

      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<SalesOrder>
          moduleKey="sales_orders"
          fetchApi={fetchSalesOrders}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
          enableRowSelection={true}
          rowKey="id"
        />
      </div>
    </div>
  );
}

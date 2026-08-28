// app/components/purchases/purchase-invoices/PurchaseInvoiceList.tsx

"use client";

import { useCallback, useMemo } from "react";
import { PurchaseInvoice } from "@/types/purchase-invoice";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseInvoiceCellRenderers } from "./purchaseInvoiceCellRenderers";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  const cellRenderers = getPurchaseInvoiceCellRenderers(slug);

  const renderRowCell = useCallback(
    (row: PurchaseInvoice, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  // Memoize Fetch API reference so DataTable useEffect dependencies remain stable
  const fetchPurchaseInvoice = useCallback(
    async (params: FetchParams): Promise<FetchResponse<PurchaseInvoice>> => {
      const res = await fetch("/api/purchase-invoices/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    [],
  );

  // Memoize columnsConfigApi object reference
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
    <div className="space-y-4 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Purchase Invoices</h2>
        </div>
      </div>

      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PurchaseInvoice>
          moduleKey="purchase_invoices"
          fetchApi={fetchPurchaseInvoice}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

/* "use client";

import { useCallback, useMemo } from "react";
import { PurchaseInvoice } from "@/types/purchase-invoice";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getPurchaseInvoiceCellRenderers } from "./purchaseInvoiceCellRenderers";

type Props = {
  slug: string;
};

export default function PurchaseOrderList({ slug }: Props) {
  // 1. Get registry renderers for purchase order table
  const cellRenderers = getPurchaseInvoiceCellRenderers(slug);

  // 2. Ultra-clean render row cell dispatcher
  const renderRowCell = (row: PurchaseInvoice, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined; // Fallback to raw value in DataTable
  };

  // Data Fetching Handler
  const fetchPurchaseInvoice = async (
    params: FetchParams,
  ): Promise<FetchResponse<PurchaseInvoice>> => {
    const res = await fetch("/api/purchase-invoices/listing", {
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
          <h2 className="text-xl font-semibold">Purchase Invoices</h2>
        </div>
      </div>


      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<PurchaseInvoice>
          moduleKey="purchase_invoices"
          fetchApi={fetchPurchaseInvoice}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
} */

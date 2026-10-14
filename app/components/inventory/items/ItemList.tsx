// app/components/inventory/items/ItemList.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { getItemCellRenderers } from "./ItemCellRenderers";
import { ItemListing } from "@/lib/services/inventory/Items.service";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

type Props = {
  slug: string;
};

export default function ItemList({ slug }: Props) {
  // 1. Cell renderers registry
  const cellRenderers = getItemCellRenderers(slug);

  // 2. Cell dispatcher
  const renderRowCell = (row: ItemListing, columnKey: string) => {
    const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
    return renderer ? renderer(row) : undefined;
  };

  // 3. Data Fetcher
  const fetchItems = async (
    params: FetchParams,
  ): Promise<FetchResponse<ItemListing>> => {
    const res = await fetch("/api/inventory/items/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  };

  // 4. Configuration APIs
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
            label: "Items",
          },
        ]}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Items</h2>{/* Inventory/ */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage inventory items, categories, brands, and product
            configurations
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href={`/${slug}/inventory/items/new`}>+ Create</Link>
        </Button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<ItemListing>
          moduleKey="inventory_items"
          fetchApi={fetchItems}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
      </div>
    </div>
  );
}

// app/components/inventory/items/ItemCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { ItemListRow } from "@/types/inventory";


export function getItemCellRenderers(slug: string) {
  return {
    item_code: (row: ItemListRow) => (
      <Link
        href={`/${slug}/inventory/items/${row.id}`}
        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {row.item_code || "-"}
      </Link>
    ),
    barcode: (row: ItemListRow) => row.barcode || "-",
    name: (row: ItemListRow) => row.name || "-",
    category_name: (row: ItemListRow) => row.category_name || "-",
    brand_name: (row: ItemListRow) => row.brand_name || "-",
    posting_group_name: (row: ItemListRow) => row.posting_group_name || "-",
    item_type_label: (row: ItemListRow) => row.item_type_label || "-",
    status_label: (row: ItemListRow) => {
      const isStatusActive = row.status === 1 || row.status_label === "Active";
      return (
        <span
          className={
            isStatusActive
              ? "text-emerald-600 dark:text-emerald-400 font-medium"
              : "text-rose-500 dark:text-rose-400 font-medium"
          }
        >
          {row.status_label || "-"}
        </span>
      );
    },
    actions: (row: ItemListRow) => (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/${slug}/inventory/items/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>
    ),
  };
}
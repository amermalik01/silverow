// app/components/inventory/items/ItemDetailHeader.tsx

"use client";

import { ItemFormData } from "@/types/inventory";

type MetricProps = {
  item: ItemFormData;
  metrics: {
    onRouteStock: number;
    totalStock: number;
    availableStock: number;
    allocatedStock: number;
  };
};

export default function ItemDetailHeader({ item, metrics }: MetricProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {item.name || "New Item"}
          {item.item_code && (
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-mono">
              {item.item_code}
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {item.description || "No description provided."}
        </p>
      </div>

      {/* Live Stock Indicators (Matching Legacy UI Top-Right) */}
      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-slate-400">On Route Stock:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {metrics.onRouteStock}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <div>
          <span className="text-slate-400">Total Stock:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {metrics.totalStock}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <div>
          <span className="text-slate-400">Available Stock:</span>{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {metrics.availableStock}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <div>
          <span className="text-slate-400">Allocated Stock:</span>{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {metrics.allocatedStock}
          </span>
        </div>
      </div>
    </div>
  );
}

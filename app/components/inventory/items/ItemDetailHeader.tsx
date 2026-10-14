// app/components/inventory/items/ItemDetailHeader.tsx

/* "use client";

import { ItemFormData } from "@/types/inventory";
import { Icon } from "@iconify/react";

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
  const formatQuantity = (value: number) =>
    Number(value || 0).toLocaleString(undefined, {
      maximumFractionDigits: 3,
    });

  const stockCards = [
    {
      title: "Total Stock",
      value: metrics.totalStock,
      subtitle: "Physical inventory",
      icon: "tabler:packages",
      color: "blue",
      container:
        "border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-sky-950/20",
      titleColor: "text-blue-700 dark:text-blue-400",
      valueColor: "text-blue-950 dark:text-blue-100",
      iconContainer:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
      decoration: "bg-blue-400/10",
    },
    {
      title: "Allocated Stock",
      value: metrics.allocatedStock,
      subtitle: "Reserved inventory",
      icon: "tabler:lock-check",
      color: "amber",
      container:
        "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/20",
      titleColor: "text-amber-700 dark:text-amber-400",
      valueColor: "text-amber-950 dark:text-amber-100",
      iconContainer:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
      decoration: "bg-amber-400/10",
    },
    {
      title: "Available Stock",
      value: metrics.availableStock,
      subtitle: "Ready to use",
      icon: "tabler:circle-check",
      color: "emerald",
      container:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/20",
      titleColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-emerald-950 dark:text-emerald-100",
      iconContainer:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
      decoration: "bg-emerald-400/10",
    },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Icon icon="tabler:package" className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {item.name || "Item"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Inventory overview
            </p>
          </div>
        </div>

        {item.item_code && (
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <Icon
              icon="tabler:barcode"
              className="h-4 w-4 text-slate-500"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Item No.
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {item.item_code}
            </span>
          </div>
        )}
      </div>

 
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stockCards.map((card) => (
          <div
            key={card.title}
            className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.container}`}
          >
            <div
              className={`absolute -right-5 -top-5 h-20 w-20 rounded-full transition-transform duration-300 group-hover:scale-125 ${card.decoration}`}
            />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${card.titleColor}`}
                >
                  <Icon icon={card.icon} className="h-4 w-4 shrink-0" />
                  {card.title}
                </div>

                <div
                  className={`mt-3 break-words text-2xl font-bold tracking-tight tabular-nums ${card.valueColor}`}
                >
                  {formatQuantity(card.value)}
                </div>

                <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {card.subtitle}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${card.iconContainer}`}
              >
                <Icon icon={card.icon} className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  card.color === "blue"
                    ? "w-full bg-blue-500"
                    : card.color === "amber"
                      ? "w-full bg-amber-500"
                      : "w-full bg-emerald-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} */

"use client";

import { ItemFormData } from "@/types/inventory";
import { Icon } from "@iconify/react";

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
  const formatQuantity = (value: number) =>
    Number(value || 0).toLocaleString(undefined, {
      maximumFractionDigits: 3,
    });

  const stockCards = [
    {
      title: "Total Stock",
      value: metrics.totalStock,
      subtitle: "Physical inventory",
      icon: "tabler:packages",
      color: "blue",
      container:
        "border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-sky-950/20",
      titleColor: "text-blue-700 dark:text-blue-400",
      valueColor: "text-blue-950 dark:text-blue-100",
      iconContainer:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
      decoration: "bg-blue-400/10",
    },
    {
      title: "Allocated Stock",
      value: metrics.allocatedStock,
      subtitle: "Reserved inventory",
      icon: "tabler:lock-check",
      color: "amber",
      container:
        "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/20",
      titleColor: "text-amber-700 dark:text-amber-400",
      valueColor: "text-amber-950 dark:text-amber-100",
      iconContainer:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
      decoration: "bg-amber-400/10",
    },
    {
      title: "Available Stock",
      value: metrics.availableStock,
      subtitle: "Ready to use",
      icon: "tabler:circle-check",
      color: "emerald",
      container:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/20",
      titleColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-emerald-950 dark:text-emerald-100",
      iconContainer:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
      decoration: "bg-emerald-400/10",
    },
  ];
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {item.name || "Item"}
            </h2>

            {item.item_code && (
              <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
                Item No. &nbsp;{item.item_code}
              </div>
            )}
          </div>
        </div>

        {/* <div className="grid grid-cols-1 sm:grid-cols-3">
          <div className="group relative overflow-hidden min-w-[180px] px-4 py-3 rounded-xl mr-2 border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-amber-400/10 group-hover:bg-amber-400/20 transition-colors" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Icon
                    icon="tabler:packages"
                    className="w-5 h-5 text-slate-400"
                  />
                  Total Stock
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-amber-600 shadow-sm dark:bg-amber-900/40 dark:text-amber-400">
                {metrics.totalStock}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden min-w-[180px] px-4 py-3 rounded-xl mr-2 border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-violet-400/10 group-hover:bg-violet-400/20 transition-colors" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  <Icon
                    icon="tabler:lock-check"
                    className="w-5 h-5 text-amber-500 dark:text-amber-400"
                  />
                  Allocated Stock
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-violet-600 shadow-sm dark:bg-violet-900/40 dark:text-violet-400">
                {metrics.allocatedStock}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden min-w-[180px] px-4 py-3 rounded-xl mr-2 border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-amber-400/10 group-hover:bg-amber-400/20 transition-colors" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Icon
                    icon="tabler:circle-check"
                    className="w-5 h-5 text-emerald-500 dark:text-emerald-400"
                  />
                  Available Stock
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-amber-600 shadow-sm dark:bg-amber-900/40 dark:text-amber-400">
                {metrics.availableStock}
              </div>
            </div>
          </div>
        </div> */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stockCards.map((card) => (
            <div
              key={card.title}
              className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.container}`}
            >
              <div
                className={`absolute -right-5 -top-5 h-20 w-20 rounded-full transition-transform duration-300 group-hover:scale-125 ${card.decoration}`}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${card.titleColor}`}
                  >
                    <Icon icon={card.icon} className="h-4 w-4 shrink-0" />
                    {card.title}
                  </div>

                  {/* <div
                  className={`mt-3 break-words text-2xl font-bold tracking-tight tabular-nums ${card.valueColor}`}
                >
                  {formatQuantity(card.value)}
                </div>

                <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {card.subtitle}
                </p> */}
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${card.iconContainer}`}
                >
                  {formatQuantity(card.value)}
                  {/* <Icon icon={card.icon} className="h-5 w-5" /> */}
                </div>
              </div>

              <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    card.color === "blue"
                      ? "w-full bg-blue-500"
                      : card.color === "amber"
                        ? "w-full bg-amber-500"
                        : "w-full bg-emerald-500"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

{
  /* {item.item_code && (
          <div className="flex items-center gap-4 border border-amber-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm transition-colors p-2.5 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
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
        )} */
}

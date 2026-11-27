// app/components/inventory/items/tabs/SalesTab.tsx

"use client";

import { Icon } from "@iconify/react";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { ItemFormData, ItemLookupOption } from "@/types/inventory";
import {
  cardClass,
  errorTextClass,
  fieldInputClass,
  fieldLabelClass,
  fieldRowClass,
  getInputClass,
  sectionHeaderClass,
  sectionIconClass,
} from "./itemStyles";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  uoms: ItemLookupOption[];
  isReadonly?: boolean;
};

const money = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SalesTab({
  item,
  setItem,
  uoms,
  isReadonly = false,
}: Props) {
  const ro = isReadonly;

  const salesPrice = Number(item.standard_sales_price || 0);
  const minPrice = Number(item.minimum_sales_price ?? item.standard_sales_price ?? 0);
  /* Margin against standard cost, falling back to the purchase price */
  const cost =
    Number(item.standard_cost || 0) || Number(item.standard_purchase_price || 0);
  const margin = salesPrice - cost;
  const marginPct = salesPrice > 0 ? (margin / salesPrice) * 100 : 0;
  const minBelowCost = cost > 0 && minPrice > 0 && minPrice < cost;
  const minAboveStandard = salesPrice > 0 && minPrice > salesPrice;

  const tiles = [
    { label: "Standard Price", value: money(salesPrice), icon: "tabler:tag" },
    { label: "Unit Cost", value: cost > 0 ? money(cost) : "—", icon: "tabler:coins" },
    {
      label: "Margin",
      value: cost > 0 ? `${money(margin)} (${marginPct.toFixed(1)}%)` : "—",
      icon: "tabler:trending-up",
      tone: cost > 0 ? (margin >= 0 ? "good" : "bad") : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Sales pricing */}
        <section className={`${cardClass} lg:col-span-7`}>
          <div className={sectionHeaderClass}>
            <Icon icon="tabler:receipt" className={sectionIconClass} />
            <span>Sales Pricing</span>
          </div>

          <div className="space-y-3">
            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Sales UOM</label>
              <div className={fieldInputClass}>
                <select
                  disabled={ro}
                  value={item.sales_uom_id}
                  onChange={(e) =>
                    setItem((prev) => ({ ...prev, sales_uom_id: e.target.value }))
                  }
                  className={getInputClass(false, ro)}
                >
                  <option value="">Default Base UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Standard Price</label>
              <div className={fieldInputClass}>
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={ro}
                  value={salesPrice}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: String(val),
                    }))
                  }
                  className={`${getInputClass(false, ro)} tabular-nums font-semibold`}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelClass}>Min. Sales Price</label>
              <div className={fieldInputClass}>
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={ro}
                  value={minPrice}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      minimum_sales_price: String(val),
                    }))
                  }
                  className={`${getInputClass(minAboveStandard, ro)} tabular-nums`}
                />
              </div>
              {minAboveStandard && (
                <p className={`col-span-8 col-start-5 ${errorTextClass}`}>
                  Minimum price is higher than the standard price.
                </p>
              )}
              {!minAboveStandard && minBelowCost && (
                <p className="col-span-8 col-start-5 mt-0.5 text-[11px] text-amber-600">
                  Minimum price is below the unit cost.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Margin overview */}
        <section className={`${cardClass} lg:col-span-5 flex flex-col`}>
          <div className={sectionHeaderClass}>
            <Icon icon="tabler:chart-pie" className={sectionIconClass} />
            <span>Margin Overview</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 dark:bg-emerald-500/20">
                  <Icon icon={t.icon} className="text-xl text-emerald-800 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-black dark:text-slate-400">{t.label}</p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      t.tone === "bad"
                        ? "text-red-600"
                        : t.tone === "good"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-black dark:text-slate-100"
                    }`}
                  >
                    {t.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

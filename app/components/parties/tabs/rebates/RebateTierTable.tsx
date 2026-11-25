// app/components/parties/tabs/rebates/RebateTierTable.tsx

"use client";

import { Icon } from "@iconify/react";

import type { RebateTier, RebatePriceType } from "@/types/rebate";
import {
  inputClass,
  primaryButtonClass,
  sectionHeaderClass,
  sectionIconClass,
  tableHeadRowClass,
} from "./styles";

interface Props {
  value: RebateTier[];
  onChange: (tiers: RebateTier[]) => void;
  priceType: RebatePriceType;
  readonly?: boolean;
}

export default function RebateTierTable({
  value,
  onChange,
  priceType,
  readonly = false,
}: Props) {
  const update = (i: number, patch: Partial<RebateTier>) =>
    onChange(value.map((x, j) => (i === j ? { ...x, ...patch } : x)));

  const addTier = () => {
    const last = value[value.length - 1];
    const nextMin =
      last?.max_quantity != null
        ? Number(last.max_quantity) + 1
        : last
          ? Number(last.min_quantity) + 1
          : 1;
    onChange([
      ...value,
      { min_quantity: nextMin, max_quantity: null, rebate_value: 0 },
    ]);
  };

  const unit = priceType === "PERCENTAGE" ? "%" : "AMT";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className={sectionHeaderClass}>
          <Icon icon="tabler:stairs-up" className={sectionIconClass} />
          <span>Quantity Rebate Tiers</span>
        </div>
        {!readonly && (
          <button type="button" className={primaryButtonClass} onClick={addTier}>
            <Icon icon="tabler:plus" className="text-base" />
            Add Tier
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[460px] text-left border-collapse text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className="py-2.5 px-3 w-12">#</th>
              <th className="py-2.5 px-3">Min Qty</th>
              <th className="py-2.5 px-3">Max Qty</th>
              <th className="py-2.5 px-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                Rebate {priceType === "PERCENTAGE" ? "%" : "Amount"}
              </th>
              {!readonly && <th className="py-2.5 px-3 w-12 text-right" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {value.length === 0 && (
              <tr>
                <td
                  colSpan={readonly ? 4 : 5}
                  className="py-6 text-center text-[12px] text-slate-400"
                >
                  No tiers defined. {readonly ? "" : "Add a tier to set quantity-based rebates."}
                </td>
              </tr>
            )}

            {value.map((t, i) => (
              <tr key={t.id || i}>
                <td className="py-2 px-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {i + 1}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min={0.000001}
                    step="any"
                    disabled={readonly}
                    className={`${inputClass} tabular-nums`}
                    value={t.min_quantity}
                    onChange={(e) =>
                      update(i, { min_quantity: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    disabled={readonly}
                    placeholder="No limit"
                    className={`${inputClass} tabular-nums`}
                    value={t.max_quantity ?? ""}
                    onChange={(e) =>
                      update(i, {
                        max_quantity:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="py-2 px-2 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={priceType === "PERCENTAGE" ? 100 : undefined}
                      step="any"
                      disabled={readonly}
                      className={`${inputClass} pr-11 tabular-nums font-semibold`}
                      value={t.rebate_value}
                      onChange={(e) =>
                        update(i, { rebate_value: Number(e.target.value) })
                      }
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                      {unit}
                    </span>
                  </div>
                </td>
                {!readonly && (
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      aria-label={`Remove tier ${i + 1}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                    >
                      <Icon icon="tabler:trash" className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

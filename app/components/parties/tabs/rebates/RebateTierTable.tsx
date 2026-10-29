// app/components/parties/tabs/rebates/RebateTierTable.tsx

"use client";

import type { RebateTier, RebatePriceType } from "@/types/rebate";
import { inputClass } from "./styles";

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Quantity Rebate Tiers
        </h3>
        {!readonly && (
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
            onClick={() =>
              onChange([
                ...value,
                { min_quantity: 1, max_quantity: null, rebate_value: 0 },
              ])
            }
          >
            + Add Tier
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="p-2">Min Qty</th>
              <th className="p-2">Max Qty (optional)</th>
              <th className="p-2">
                Rebate {priceType === "PERCENTAGE" ? "%" : "Amount"}
              </th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {value.map((t, i) => (
              <tr
                key={t.id || i}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="p-1">
                  <input
                    type="number"
                    min={0.000001}
                    step="any"
                    disabled={readonly}
                    className={inputClass}
                    value={t.min_quantity}
                    onChange={(e) =>
                      update(i, { min_quantity: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    disabled={readonly}
                    className={inputClass}
                    value={t.max_quantity ?? ""}
                    onChange={(e) =>
                      update(i, {
                        max_quantity:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    min={0}
                    max={priceType === "PERCENTAGE" ? 100 : undefined}
                    step="any"
                    disabled={readonly}
                    className={inputClass}
                    value={t.rebate_value}
                    onChange={(e) =>
                      update(i, { rebate_value: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="p-1">
                  {!readonly && (
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

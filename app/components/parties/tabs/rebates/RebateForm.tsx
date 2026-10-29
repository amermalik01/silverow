// app/components/parties/tabs/rebates/RebateForm.tsx

"use client";

import type { RebateDraft } from "@/types/rebate";
import RebateHeader from "./RebateHeader";
import RebateScopeFields from "./RebateScopeFields";
import RebateTierTable from "./RebateTierTable";
import { inputClass, labelClass, panelClass } from "./styles";

interface Props {
  value: RebateDraft;
  onChange: (value: RebateDraft) => void;
  readonly?: boolean;
  errors?: Record<string, string>;
  categoryLookupUrl?: string;
  itemLookupUrl?: string;
}

export default function RebateForm({
  value,
  onChange,
  readonly = false,
  errors = {},
  categoryLookupUrl,
  itemLookupUrl,
}: Props) {
  const patch = (p: Partial<RebateDraft>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-4">

      
        {/* <div className="space-y-2"></div> */}
      <div className={panelClass}>
        <RebateHeader
          value={value}
          onChange={patch}
          readonly={readonly}
          errors={errors}
        />
      </div>
      <RebateScopeFields
        value={value}
        onChange={patch}
        readonly={readonly}
        categoryLookupUrl={categoryLookupUrl}
        itemLookupUrl={itemLookupUrl}
      />
      <div className={panelClass}>
        <h3 className="mb-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
          Calculation & Settlement
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Rebate Base</label>
            <select
              className={inputClass}
              disabled={readonly}
              value={value.rebate_base}
              onChange={(e) =>
                patch({
                  rebate_base: e.target.value as RebateDraft["rebate_base"],
                })
              }
            >
              <option value="NET_PRICE">Net Price</option>
              <option value="STANDARD_PRICE">Standard Price</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Settlement Method</label>
            <select
              className={inputClass}
              disabled={readonly}
              value={value.settlement_method}
              onChange={(e) =>
                patch({
                  settlement_method: e.target
                    .value as RebateDraft["settlement_method"],
                })
              }
            >
              <option value="DEFERRED">Deferred</option>
              <option value="IMMEDIATE">Immediate</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <input
              className={inputClass}
              disabled={readonly}
              type="number"
              min={0}
              value={value.priority}
              onChange={(e) => patch({ priority: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={readonly}
              checked={value.is_stackable}
              onChange={(e) => patch({ is_stackable: e.target.checked })}
            />
            <label className={labelClass}>
              Allow stacking with other rebates
            </label>
          </div>
        </div>
      </div>
      {value.calculation_method === "TIERED" && (
        <div className={panelClass}>
          <RebateTierTable
            value={value.tiers}
            onChange={(tiers) => patch({ tiers })}
            priceType={value.price_type}
            readonly={readonly}
          />
        </div>
      )}
    </div>
  );
}

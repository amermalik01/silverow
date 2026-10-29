// app/components/parties/tabs/rebates/RebateHeader.tsx

"use client";

import type { RebateDraft } from "@/types/rebate";
import { inputClass, labelClass } from "./styles";

interface Props {
  value: RebateDraft;
  onChange: (patch: Partial<RebateDraft>) => void;
  readonly?: boolean;
  errors?: Record<string, string>;
}

export default function RebateHeader({
  value,
  onChange,
  readonly = false,
  errors = {},
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            Rebate Name <span className="text-red-500">*</span>
          </label>
          <div className="col-span-2">
            <input
              className={inputClass}
              disabled={readonly}
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputClass} col-span-2`}
            disabled={readonly}
            value={value.scope}
            onChange={(e) =>
              onChange({
                scope: e.target.value as RebateDraft["scope"],
                categories: [],
                items: [],
              })
            }
          >
            <option value="UNIVERSAL">
              Universal Rebate for the{" "}
              {value.rebate_type === "SALES" ? "Customer" : "Supplier"}
            </option>
            <option value="CATEGORY">Separate Rebate for Category(ies)</option>
            <option value="ITEM">Separate Rebate for Items</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            Rebate Type <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputClass} col-span-2`}
            disabled={readonly}
            value={value.calculation_method}
            onChange={(e) =>
              onChange({
                calculation_method: e.target
                  .value as RebateDraft["calculation_method"],
                tiers: e.target.value === "FLAT" ? [] : value.tiers,
              })
            }
          >
            <option value="FLAT">Universal Rebate (Flat)</option>
            <option value="TIERED">Quantity Tiered Rebate</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            Price Type <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputClass} col-span-2`}
            disabled={readonly}
            value={value.price_type}
            onChange={(e) =>
              onChange({
                price_type: e.target.value as RebateDraft["price_type"],
              })
            }
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed Amount</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>Rebate</label>
          <div className="col-span-2 relative">
            <input
              className={`${inputClass} pr-9`}
              type="number"
              min={0}
              max={value.price_type === "PERCENTAGE" ? 100 : undefined}
              step="any"
              disabled={readonly || value.calculation_method === "TIERED"}
              value={value.rebate_value}
              onChange={(e) =>
                onChange({ rebate_value: Number(e.target.value) })
              }
            />
            <span className="absolute right-3 top-2 text-xs text-slate-400">
              {value.price_type === "PERCENTAGE" ? "%" : "¤"}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClass} col-span-2`}
            type="date"
            disabled={readonly}
            value={value.start_date}
            onChange={(e) => onChange({ start_date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className={labelClass}>
            End Date <span className="text-red-500">*</span>
          </label>
          <div className="col-span-2">
            <input
              className={inputClass}
              type="date"
              disabled={readonly}
              min={value.start_date}
              value={value.end_date}
              onChange={(e) => onChange({ end_date: e.target.value })}
            />
            {errors.end_date && (
              <p className="text-xs text-red-500">{errors.end_date}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 items-start gap-3">
          <label className={`${labelClass} pt-2`}>Notes</label>
          <textarea
            className={`${inputClass} col-span-2 h-24 py-2`}
            disabled={readonly}
            value={value.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

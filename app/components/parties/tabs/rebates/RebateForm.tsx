// app/components/parties/tabs/rebates/RebateForm.tsx

"use client";

import { Icon } from "@iconify/react";

import type { RebateDraft } from "@/types/rebate";
import RebateHeader from "./RebateHeader";
import RebateScopeFields from "./RebateScopeFields";
import RebateTierTable from "./RebateTierTable";
import {
  cardClass,
  fieldInputColClass,
  fieldLabelColClass,
  fieldRowClass,
  inputClass,
  sectionHeaderClass,
  sectionIconClass,
} from "./styles";

interface Props {
  value: RebateDraft;
  onChange: (value: RebateDraft) => void;
  readonly?: boolean;
  errors?: Record<string, string>;
  categoryLookupUrl?: string;
  itemLookupUrl?: string;
}

function SwitchPill({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "bg-emerald-600 border-emerald-600"
            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
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
  const isTiered = value.calculation_method === "TIERED";
  const tierError = Object.entries(errors).find(([key]) =>
    key.startsWith("tiers"),
  )?.[1];
  const scopeError = Object.entries(errors).find(
    ([key]) => key.startsWith("categories") || key.startsWith("items"),
  )?.[1];

  return (
    <div className="space-y-4">
      <RebateHeader
        value={value}
        onChange={patch}
        readonly={readonly}
        errors={errors}
      />

      {value.scope !== "UNIVERSAL" && (
        <section className={cardClass}>
          <RebateScopeFields
            value={value}
            onChange={patch}
            readonly={readonly}
            categoryLookupUrl={categoryLookupUrl}
            itemLookupUrl={itemLookupUrl}
          />
          {scopeError && (
            <p className="mt-2 text-[11px] text-red-500">{scopeError}</p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Calculation & settlement */}
        <section
          className={`${cardClass} ${isTiered ? "lg:col-span-5" : "lg:col-span-12"}`}
        >
          <div className={`${sectionHeaderClass} mb-3.5`}>
            <Icon icon="tabler:calculator" className={sectionIconClass} />
            <span>Calculation &amp; Settlement</span>
          </div>

          <div
            className={
              isTiered
                ? "space-y-3"
                : "grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3"
            }
          >
            <div className={fieldRowClass}>
              <label className={fieldLabelColClass}>Rebate Base</label>
              <div className={fieldInputColClass}>
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
                  <option value="NET_PRICE">Net price</option>
                  <option value="STANDARD_PRICE">Standard price</option>
                </select>
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelColClass}>Settlement</label>
              <div className={fieldInputColClass}>
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
                  <option value="DEFERRED">Deferred (accrue &amp; settle later)</option>
                  <option value="IMMEDIATE">Immediate (on the invoice)</option>
                </select>
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={fieldLabelColClass}>Priority</label>
              <div className={fieldInputColClass}>
                <input
                  className={`${inputClass} tabular-nums`}
                  disabled={readonly}
                  type="number"
                  min={0}
                  value={value.priority}
                  onChange={(e) => patch({ priority: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <span className={fieldLabelColClass}>Stacking</span>
              <div className={fieldInputColClass}>
                <SwitchPill
                  checked={value.is_stackable}
                  disabled={readonly}
                  onChange={(next) => patch({ is_stackable: next })}
                  label="Combine with other rebates"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quantity tiers */}
        {isTiered && (
          <section className={`${cardClass} lg:col-span-7`}>
            <RebateTierTable
              value={value.tiers}
              onChange={(tiers) => patch({ tiers })}
              priceType={value.price_type}
              readonly={readonly}
            />
            {tierError && (
              <p className="mt-2 text-[11px] text-red-500">{tierError}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

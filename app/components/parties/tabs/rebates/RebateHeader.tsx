// app/components/parties/tabs/rebates/RebateHeader.tsx

"use client";

import { Icon } from "@iconify/react";
import { format, parse, parseISO, isValid } from "date-fns";

import type { RebateDraft } from "@/types/rebate";
import { DatePicker } from "@/components/ui/date-picker";
import {
  cardClass,
  errorTextClass,
  fieldInputColClass,
  fieldLabelColClass,
  fieldRowClass,
  getInputClass,
  sectionHeaderClass,
  sectionIconClass,
} from "./styles";

interface Props {
  value: RebateDraft;
  onChange: (patch: Partial<RebateDraft>) => void;
  readonly?: boolean;
  errors?: Record<string, string>;
}

function parseStoredDate(value?: string): Date | undefined {
  if (!value) return undefined;

  let date: Date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = parseISO(value);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    date = parse(value, "dd/MM/yyyy", new Date());
  } else {
    date = parseISO(value);
  }

  return isValid(date) ? date : undefined;
}

function daysBetween(start?: string, end?: string): number | null {
  const s = parseStoredDate(start);
  const e = parseStoredDate(end);
  if (!s || !e) return null;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export default function RebateHeader({
  value,
  onChange,
  readonly = false,
  errors = {},
}: Props) {
  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const partyLabel = value.rebate_type === "SALES" ? "Customer" : "Supplier";
  const isTiered = value.calculation_method === "TIERED";
  const duration = daysBetween(value.start_date, value.end_date);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Agreement details */}
      <section className={`${cardClass} lg:col-span-7`}>
        <div className={`${sectionHeaderClass} mb-3.5`}>
          <Icon icon="tabler:file-description" className={sectionIconClass} />
          <span>Agreement Details</span>
        </div>

        <div className="space-y-3">
          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              Rebate Name <span className="text-red-500">*</span>
            </label>
            <div className={fieldInputColClass}>
              <input
                className={getInputClass(Boolean(errors.name))}
                disabled={readonly}
                value={value.name}
                placeholder={`${partyLabel} rebate name`}
                onChange={(e) => onChange({ name: e.target.value })}
              />
              {errors.name && <p className={errorTextClass}>{errors.name}</p>}
            </div>
          </div>

          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              Applies To <span className="text-red-500">*</span>
            </label>
            <div className={fieldInputColClass}>
              <select
                className={getInputClass(Boolean(errors.scope))}
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
                  Universal rebate for the {partyLabel}
                </option>
                <option value="CATEGORY">Separate rebate for category(ies)</option>
                <option value="ITEM">Separate rebate for items</option>
              </select>
              {errors.scope && <p className={errorTextClass}>{errors.scope}</p>}
            </div>
          </div>

          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              Rebate Method <span className="text-red-500">*</span>
            </label>
            <div className={`${fieldInputColClass} grid grid-cols-2 gap-1.5`}>
              {(
                [
                  { id: "FLAT", label: "Flat rate", icon: "tabler:equal" },
                  { id: "TIERED", label: "Quantity tiers", icon: "tabler:stairs-up" },
                ] as const
              ).map((option) => {
                const active = value.calculation_method === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={readonly}
                    onClick={() =>
                      onChange({
                        calculation_method: option.id,
                        tiers: option.id === "FLAT" ? [] : value.tiers,
                      })
                    }
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    } ${readonly && !active ? "opacity-60" : ""}`}
                  >
                    <Icon icon={option.icon} className="text-base" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              Price Type <span className="text-red-500">*</span>
            </label>
            <div className={fieldInputColClass}>
              <select
                className={getInputClass(Boolean(errors.price_type))}
                disabled={readonly}
                value={value.price_type}
                onChange={(e) =>
                  onChange({
                    price_type: e.target.value as RebateDraft["price_type"],
                  })
                }
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </div>
          </div>

          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>Rebate Value</label>
            <div className={fieldInputColClass}>
              {isTiered ? (
                <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-2.5 py-1.5 text-[12px] text-emerald-800 dark:text-emerald-300">
                  Set per quantity tier below.
                </div>
              ) : (
                <div className="relative">
                  <input
                    className={`${getInputClass(Boolean(errors.rebate_value))} pr-12 tabular-nums`}
                    type="number"
                    min={0}
                    max={value.price_type === "PERCENTAGE" ? 100 : undefined}
                    step="any"
                    disabled={readonly}
                    value={value.rebate_value}
                    onChange={(e) =>
                      onChange({ rebate_value: Number(e.target.value) })
                    }
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                    {value.price_type === "PERCENTAGE" ? "%" : "AMT"}
                  </span>
                </div>
              )}
              {errors.rebate_value && (
                <p className={errorTextClass}>{errors.rebate_value}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Validity & notes */}
      <section className={`${cardClass} lg:col-span-5 flex flex-col`}>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className={sectionHeaderClass}>
            <Icon icon="tabler:calendar-stats" className={sectionIconClass} />
            <span>Validity &amp; Notes</span>
          </div>
          {duration !== null && duration > 0 && (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {duration} days
            </span>
          )}
        </div>

        <div className="space-y-3 flex-1 flex flex-col">
          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className={fieldInputColClass}>
              <DatePicker
                value={parseStoredDate(value.start_date || defaultStartDate)}
                disabled={readonly}
                maxDate={parseStoredDate(value.end_date)}
                onChange={(date: Date | undefined) => {
                  if (date && isValid(date)) {
                    onChange({ start_date: format(date, "yyyy-MM-dd") });
                  }
                }}
                className={getInputClass(Boolean(errors.start_date))}
              />
              {errors.start_date && (
                <p className={errorTextClass}>{errors.start_date}</p>
              )}
            </div>
          </div>

          <div className={fieldRowClass}>
            <label className={fieldLabelColClass}>
              End Date <span className="text-red-500">*</span>
            </label>
            <div className={fieldInputColClass}>
              <DatePicker
                value={parseStoredDate(value.end_date || defaultStartDate)}
                disabled={readonly}
                minDate={parseStoredDate(value.start_date)}
                onChange={(date: Date | undefined) => {
                  if (date && isValid(date)) {
                    onChange({ end_date: format(date, "yyyy-MM-dd") });
                  }
                }}
                className={getInputClass(Boolean(errors.end_date))}
              />
              {errors.end_date && (
                <p className={errorTextClass}>{errors.end_date}</p>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 pt-1">
            <label className="text-sm font-medium text-black dark:text-slate-400">
              Notes
            </label>
            <textarea
              className={`${getInputClass(false)} min-h-[96px] flex-1 resize-none`}
              disabled={readonly}
              value={value.notes}
              placeholder="Terms, conditions or internal remarks..."
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// app/components/crm/prospects/dashboard/ProspectDashboardControls.tsx

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import {
  PROSPECT_PRIORITIES,
  PROSPECT_SOURCES,
  PROSPECT_STATUSES,
} from "@/lib/validations/prospect.schema";
import type {
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
} from "@/lib/validations/prospect.schema";
import {
  DATE_PRESETS,
  formatRangeLabel,
  rangeForPreset,
  statusLabel,
  type DateRange,
} from "./dashboardUtils";

/* ============================================================
   POPOVER SHELL (closes on outside click / Escape)
============================================================ */

function Popover({
  trigger,
  children,
  open,
  setOpen,
  align = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          className={`absolute top-full z-40 mt-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const triggerClass =
  "flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

const fieldClass =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

/* ============================================================
   DATE RANGE
============================================================ */

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from ?? "");
  const [customTo, setCustomTo] = useState(value.to ?? "");

  return (
    <Popover
      open={open}
      setOpen={setOpen}
      trigger={
        <button
          type="button"
          onClick={() => {
            setCustomFrom(value.from ?? "");
            setCustomTo(value.to ?? "");
            setOpen(!open);
          }}
          className={triggerClass}
        >
          <Icon icon="tabler:calendar" className="text-lg text-slate-600" />
          <span className="whitespace-nowrap tabular-nums">
            {formatRangeLabel(value)}
          </span>
          <Icon icon="tabler:chevron-down" className="text-slate-500" />
        </button>
      }
    >
      <div className="flex w-72 flex-col gap-3">
        <div className="grid grid-cols-2 gap-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(rangeForPreset(preset.value));
                setOpen(false);
              }}
              className={`rounded-md px-2 py-1.5 text-left text-sm ${
                value.preset === preset.value
                  ? "bg-emerald-50 font-semibold text-emerald-800"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-1.5 text-xs font-semibold text-slate-600">
            Custom range
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => setCustomFrom(event.target.value)}
              className={fieldClass}
            />
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => setCustomTo(event.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            type="button"
            disabled={!customFrom && !customTo}
            onClick={() => {
              onChange({
                preset: "custom",
                from: customFrom || null,
                to: customTo || null,
              });
              setOpen(false);
            }}
            className="mt-2 h-8 w-full rounded-md bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </Popover>
  );
}

/* ============================================================
   FILTER MENU
============================================================ */

export type ProspectQuickFilters = {
  status: ProspectStatus | null;
  priority: ProspectPriority | null;
  source: ProspectSource | null;
};

export function FilterMenu({
  value,
  onChange,
}: {
  value: ProspectQuickFilters;
  onChange: (filters: ProspectQuickFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [value.status, value.priority, value.source].filter(
    Boolean,
  ).length;

  const statuses = PROSPECT_STATUSES.filter((status) => status !== "Converted");

  return (
    <Popover
      open={open}
      setOpen={setOpen}
      trigger={
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={triggerClass}
        >
          <Icon icon="tabler:filter" className="text-lg text-slate-600" />
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-emerald-700 px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      }
    >
      <div className="w-64 space-y-3">
        <label className="block space-y-1 text-xs font-semibold text-slate-600">
          Status
          <select
            value={value.status ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                status: (event.target.value || null) as ProspectStatus | null,
              })
            }
            className={fieldClass}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-xs font-semibold text-slate-600">
          Priority
          <select
            value={value.priority ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                priority: (event.target.value || null) as ProspectPriority | null,
              })
            }
            className={fieldClass}
          >
            <option value="">All priorities</option>
            {PROSPECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-xs font-semibold text-slate-600">
          Source
          <select
            value={value.source ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                source: (event.target.value || null) as ProspectSource | null,
              })
            }
            className={fieldClass}
          >
            <option value="">All sources</option>
            {PROSPECT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            disabled={activeCount === 0}
            onClick={() => onChange({ status: null, priority: null, source: null })}
            className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-emerald-800 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Done
          </button>
        </div>
      </div>
    </Popover>
  );
}

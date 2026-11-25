// app/components/parties/tabs/rebates/RebateCategorySelector.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import type { RebateCategory, RebateLookupOption } from "@/types/rebate";
import { inputClass, sectionHeaderClass, sectionIconClass } from "./styles";

interface Props {
  value: RebateCategory[];
  onChange: (value: RebateCategory[]) => void;
  readonly?: boolean;
  lookupUrl?: string;
}

export default function RebateCategorySelector({
  value,
  onChange,
  readonly = false,
  lookupUrl = "/api/setup/inventory/categories",
}: Props) {
  const [options, setOptions] = useState<RebateLookupOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(lookupUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error("Category lookup failed");
        return r.json();
      })
      .then((data) => {
        if (alive)
          setOptions(
            Array.isArray(data)
              ? data
              : Array.isArray(data.data)
                ? data.data
                : Array.isArray(data.rows)
                  ? data.rows
                  : [],
          );
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Lookup failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [lookupUrl]);

  const selected = new Set(value.map((x) => x.category_id));

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [options, query],
  );

  const nameOf = (v: RebateCategory) =>
    v.category_name ||
    options.find((o) => o.id === v.category_id)?.name ||
    v.category_id;

  const toggle = (o: RebateLookupOption, checked: boolean) =>
    onChange(
      checked
        ? [...value, { category_id: o.id, category_name: o.name }]
        : value.filter((x) => x.category_id !== o.id),
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={sectionHeaderClass}>
          <Icon icon="tabler:category" className={sectionIconClass} />
          <span>
            Applicable Categories <span className="text-red-500">*</span>
          </span>
          <span className="ml-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {value.length} selected
          </span>
        </div>

        {!readonly && value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] font-semibold text-slate-500 hover:text-red-600"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected chips */}
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-[12px] text-slate-400">
            No categories selected yet.
          </span>
        ) : (
          value.map((v) => (
            <span
              key={v.category_id}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {nameOf(v)}
              {!readonly && (
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(v)}`}
                  onClick={() =>
                    onChange(value.filter((x) => x.category_id !== v.category_id))
                  }
                  className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                >
                  <Icon icon="tabler:x" className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {!readonly && (
        <div className="space-y-2">
          <div className="relative">
            <Icon
              icon="tabler:search"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className={`${inputClass} pl-8`}
              placeholder="Search categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-[11px] text-amber-600">
              {error} — configure lookupUrl if your endpoint differs.
            </p>
          )}

          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2">
            {loading ? (
              <p className="py-3 text-center text-[12px] text-slate-400 animate-pulse">
                Loading categories...
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-slate-400">
                No categories found.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                {filtered.map((o) => {
                  const checked = selected.has(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                        checked
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggle(o, e.target.checked)}
                        className="rounded border-slate-300 accent-emerald-700"
                      />
                      <span className="truncate">{o.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

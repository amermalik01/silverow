// app/components/parties/tabs/rebates/RebateItemSelector.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import type { RebateItem, RebateLookupOption } from "@/types/rebate";
import {
  inputClass,
  sectionHeaderClass,
  sectionIconClass,
  tableHeadRowClass,
} from "./styles";

interface Props {
  value: RebateItem[];
  onChange: (value: RebateItem[]) => void;
  readonly?: boolean;
  lookupUrl?: string;
}

const keyOf = (itemId: string, uomId?: string | null) =>
  `${itemId}:${uomId || ""}`;

export default function RebateItemSelector({
  value,
  onChange,
  readonly = false,
  lookupUrl = "/api/lookups/items",
}: Props) {
  const [options, setOptions] = useState<RebateLookupOption[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(lookupUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error("Item lookup failed");
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

  const selected = new Set(value.map((v) => keyOf(v.item_id, v.uom_id)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) =>
      `${o.code || ""} ${o.name}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  const add = (o: RebateLookupOption) =>
    onChange([
      ...value,
      {
        item_id: o.id,
        item_code: o.code,
        item_name: o.name,
        uom_id: o.uom_id || null,
        uom_name: o.uom_name,
      },
    ]);

  const remove = (key: string) =>
    onChange(value.filter((v) => keyOf(v.item_id, v.uom_id) !== key));

  const describe = (v: RebateItem) => {
    const option = options.find(
      (o) => keyOf(o.id, o.uom_id) === keyOf(v.item_id, v.uom_id),
    );
    return {
      code: v.item_code || option?.code || "—",
      name: v.item_name || option?.name || v.item_id,
      uom: v.uom_name || option?.uom_name || "—",
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={sectionHeaderClass}>
          <Icon icon="tabler:box" className={sectionIconClass} />
          <span>
            Applicable Items <span className="text-red-500">*</span>
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

      <div className={`grid grid-cols-1 gap-4 ${readonly ? "" : "lg:grid-cols-2"}`}>
        {/* Picker */}
        {!readonly && (
          <div className="space-y-2">
            <div className="relative">
              <Icon
                icon="tabler:search"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search item code or name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[11px] text-amber-600">
                {error} — configure lookupUrl if needed.
              </p>
            )}

            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/70">
              {loading ? (
                <p className="py-4 text-center text-[12px] text-slate-400 animate-pulse">
                  Loading items...
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-slate-400">
                  No items found.
                </p>
              ) : (
                filtered.map((o) => {
                  const key = keyOf(o.id, o.uom_id);
                  const checked = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => (checked ? remove(key) : add(o))}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                        checked
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon
                        icon={checked ? "tabler:square-check-filled" : "tabler:square"}
                        className={`shrink-0 text-lg ${
                          checked ? "text-emerald-700 dark:text-emerald-400" : "text-slate-300"
                        }`}
                      />
                      <span className="font-mono text-[11px] text-slate-500 w-24 shrink-0 truncate">
                        {o.code || "—"}
                      </span>
                      <span className="flex-1 truncate text-black dark:text-slate-100">
                        {o.name}
                      </span>
                      {o.uom_name && (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {o.uom_name}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Selected items */}
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="max-h-[262px] overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0">
                <tr className={tableHeadRowClass}>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">UOM</th>
                  {!readonly && <th className="py-2 px-3 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {value.length === 0 ? (
                  <tr>
                    <td
                      colSpan={readonly ? 3 : 4}
                      className="py-6 text-center text-[12px] text-slate-400"
                    >
                      No items selected yet.
                    </td>
                  </tr>
                ) : (
                  value.map((v) => {
                    const key = keyOf(v.item_id, v.uom_id);
                    const info = describe(v);
                    return (
                      <tr key={key}>
                        <td className="py-2 px-3 font-mono text-[11px] text-black dark:text-slate-300 whitespace-nowrap">
                          {info.code}
                        </td>
                        <td className="py-2 px-3 font-medium text-black dark:text-slate-100">
                          {info.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {info.uom}
                        </td>
                        {!readonly && (
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              aria-label={`Remove ${info.name}`}
                              onClick={() => remove(key)}
                              className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <Icon icon="tabler:trash" className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

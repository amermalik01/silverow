// app/components/parties/tabs/rebates/RebateItemSelector.tsx

"use client";

import { useEffect, useState } from "react";
import type { RebateItem, RebateLookupOption } from "@/types/rebate";
import { inputClass } from "./styles";

interface Props {
  value: RebateItem[];
  onChange: (value: RebateItem[]) => void;
  readonly?: boolean;
  lookupUrl?: string;
}

export default function RebateItemSelector({
  value,
  onChange,
  readonly = false,
  lookupUrl = "/api/lookups/items",
}: Props) {
  const [options, setOptions] = useState<RebateLookupOption[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    // setLoading(true);
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

  const selected = new Set(value.map((v) => `${v.item_id}:${v.uom_id || ""}`));

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Item(s) <span className="text-red-500">*</span>
      </label>
      <input
        className={inputClass}
        placeholder="Search item code or name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={readonly}
      />
      {loading && <p className="text-xs text-slate-400">Loading items...</p>}
      {error && (
        <p className="text-xs text-amber-600">
          {error} — configure lookupUrl if needed.
        </p>
      )}
      <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700">
        {options
          .filter((o) =>
            `${o.code || ""} ${o.name}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((o) => {
            const key = `${o.id}:${o.uom_id || ""}`;
            return (
              <label
                key={key}
                className="flex items-center gap-2 py-1 text-xs text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  disabled={readonly}
                  checked={selected.has(key)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [
                            ...value,
                            {
                              item_id: o.id,
                              item_code: o.code,
                              item_name: o.name,
                              uom_id: o.uom_id || null,
                              uom_name: o.uom_name,
                            },
                          ]
                        : value.filter(
                            (v) => `${v.item_id}:${v.uom_id || ""}` !== key,
                          ),
                    )
                  }
                />
                <span>
                  {o.code ? `${o.code} — ` : ""}
                  {o.name}
                  {o.uom_name ? ` (${o.uom_name})` : ""}
                </span>
              </label>
            );
          })}
        {!options.length && !loading && (
          <p className="text-xs text-slate-400">No items loaded.</p>
        )}
      </div>
      <p className="text-xs text-slate-500">Selected: {value.length} item(s)</p>
    </div>
  );
}

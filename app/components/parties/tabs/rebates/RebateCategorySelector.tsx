// app/components/parties/tabs/rebates/RebateCategorySelector.tsx

"use client";
import { useEffect, useState } from "react";
import type { RebateCategory, RebateLookupOption } from "@/types/rebate";
import { inputClass } from "./styles";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    // setLoading(true);
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
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Category(ies) <span className="text-red-500">*</span>
      </label>
      <input
        className={inputClass}
        placeholder="Search categories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={readonly}
      />
      {loading && (
        <p className="text-xs text-slate-400">Loading categories...</p>
      )}
      {error && (
        <p className="text-xs text-amber-600">
          {error} — configure lookupUrl if your endpoint differs.
        </p>
      )}
      <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700">
        {options
          .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
          .map((o) => (
            <label
              key={o.id}
              className="flex items-center gap-2 py-1 text-xs text-slate-700 dark:text-slate-300"
            >
              <input
                type="checkbox"
                disabled={readonly}
                checked={selected.has(o.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, { category_id: o.id, category_name: o.name }]
                      : value.filter((x) => x.category_id !== o.id),
                  )
                }
              />
              {o.name}
            </label>
          ))}
        {!options.length && !loading && (
          <p className="text-xs text-slate-400">No categories loaded.</p>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Selected:{" "}
        {value
          .map(
            (v) =>
              v.category_name ||
              options.find((o) => o.id === v.category_id)?.name ||
              v.category_id,
          )
          .join("; ") || "None"}
      </p>
    </div>
  );
}

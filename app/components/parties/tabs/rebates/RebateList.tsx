// app/components/parties/tabs/rebates/RebateList.tsx

"use client";

import type { RebateDraft } from "@/types/rebate";

interface Props {
  rows: RebateDraft[];
  selectedId?: string;
  onSelect: (row: RebateDraft) => void;
  onAdd: () => void;
  readonly?: boolean;
}

export default function RebateList({
  rows,
  selectedId,
  onSelect,
  onAdd,
  readonly = false,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Rebate Agreements ({rows.length})
        </h3>
        {!readonly && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            + Add Rebate
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {[
                "Rebate No.",
                "Name",
                "Category",
                "Value",
                "Validity",
                "Status",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id || `draft-${i}`}
                onClick={() => onSelect(r)}
                className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${selectedId === (r.id || `draft-${i}`) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              >
                <td className="px-3 py-2">{r.rebate_no || "Draft"}</td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.scope}</td>
                <td className="px-3 py-2">
                  {r.rebate_value}
                  {r.price_type === "PERCENTAGE" ? "%" : ""}
                </td>
                <td className="px-3 py-2">
                  {r.start_date} — {r.end_date}
                </td>
                <td className="px-3 py-2">{r.status || "DRAFT"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No rebates assigned to this party.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

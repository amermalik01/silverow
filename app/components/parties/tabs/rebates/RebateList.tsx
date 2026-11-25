// app/components/parties/tabs/rebates/RebateList.tsx

"use client";

import { Icon } from "@iconify/react";

import type { RebateDraft } from "@/types/rebate";
import {
  SCOPE_ICONS,
  SCOPE_LABELS,
  cardClass,
  formatRebateDate,
  formatRebateValue,
  primaryButtonClass,
  sectionHeaderClass,
  sectionIconClass,
  statusBadgeClass,
  statusLabel,
  tableHeadRowClass,
} from "./styles";

interface Props {
  rows: RebateDraft[];
  selectedId?: string;
  onSelect: (row: RebateDraft) => void;
  onAdd: () => void;
  readonly?: boolean;
  loading?: boolean;
}

export default function RebateList({
  rows,
  selectedId,
  onSelect,
  onAdd,
  readonly = false,
  loading = false,
}: Props) {
  return (
    <section className={`${cardClass} p-0 overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className={sectionHeaderClass}>
          <Icon icon="tabler:receipt-refund" className={sectionIconClass} />
          <span>Rebate Agreements</span>
          <span className="ml-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {rows.length}
          </span>
        </div>

        {!readonly && (
          <button type="button" onClick={onAdd} className={primaryButtonClass}>
            <Icon icon="tabler:plus" className="text-base" />
            <span>Add Rebate</span>
          </button>
        )}
      </div>

      <div className="max-h-[320px] overflow-auto">
        <table className="w-full min-w-[760px] text-left border-collapse text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className={tableHeadRowClass}>
              <th className="py-2.5 pl-4 pr-3">Agreement</th>
              <th className="py-2.5 px-3">Applies To</th>
              <th className="py-2.5 px-3">Method</th>
              <th className="py-2.5 px-3 text-right">Rebate</th>
              <th className="py-2.5 px-3">Validity</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400 animate-pulse">
                  Loading rebates...
                </td>
              </tr>
            )}

            {rows.map((r, i) => {
              const rowKey = r.id || `draft-${i}`;
              const isSelected = selectedId === rowKey;

              return (
                <tr
                  key={rowKey}
                  onClick={() => onSelect(r)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  } ${readonly && !isSelected ? "opacity-70" : ""}`}
                >
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-emerald-600/15 border-emerald-300/70 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-800 dark:text-emerald-400"
                            : "bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Icon icon="tabler:discount-2" className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-black dark:text-slate-100 truncate">
                          {r.name || "Untitled rebate"}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {r.rebate_no || "Not numbered"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Icon
                        icon={SCOPE_ICONS[r.scope] || "tabler:world"}
                        className="text-emerald-700 dark:text-emerald-400"
                      />
                      {SCOPE_LABELS[r.scope] || r.scope}
                      {r.scope === "CATEGORY" && r.categories?.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          ({r.categories.length})
                        </span>
                      )}
                      {r.scope === "ITEM" && r.items?.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          ({r.items.length})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {r.calculation_method === "TIERED" ? "Quantity tiers" : "Flat"}
                    <span className="text-[11px] text-slate-400">
                      {" "}
                      · {r.settlement_method === "IMMEDIATE" ? "Immediate" : "Deferred"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {formatRebateValue(r.rebate_value, r.price_type, r.calculation_method)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRebateDate(r.start_date)}
                    <span className="text-slate-400"> → </span>
                    {formatRebateDate(r.end_date)}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={statusBadgeClass(r.status)}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <Icon
                    icon="tabler:receipt-off"
                    className="mx-auto text-3xl text-slate-300 dark:text-slate-600"
                  />
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    No rebates assigned to this party.
                  </p>
                  {!readonly && (
                    <button
                      type="button"
                      onClick={onAdd}
                      className={`${primaryButtonClass} mt-3`}
                    >
                      <Icon icon="tabler:plus" className="text-base" />
                      Create first rebate
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

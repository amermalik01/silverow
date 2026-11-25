// app/components/parties/tabs/rebates/RebateTransactions.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import type { RebateTransaction } from "@/types/rebate";
import {
  cardClass,
  formatRebateDate,
  formatRebateNumber,
  sectionHeaderClass,
  sectionIconClass,
  tableHeadRowClass,
} from "./styles";

interface Props {
  rebateId?: string;
  currencyCode?: string;
  onClose?: () => void;
}

export default function RebateTransactions({
  rebateId,
  currencyCode = "GBP",
  onClose,
}: Props) {
  const [rows, setRows] = useState<RebateTransaction[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rebateId) return;
    let alive = true;
    fetch(`/api/rebates/${rebateId}/transactions`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Transaction endpoint unavailable");
        return r.json();
      })
      .then((d) => {
        if (alive)
          setRows(Array.isArray(d) ? d : d.data || d.transactions || []);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [rebateId]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          base: acc.base + (Number(r.base_amount) || 0),
          rebate: acc.rebate + (Number(r.rebate_amount) || 0),
        }),
        { base: 0, rebate: 0 },
      ),
    [rows],
  );

  if (!rebateId) return null;

  return (
    <section className={`${cardClass} p-0 overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className={sectionHeaderClass}>
          <Icon icon="tabler:arrows-exchange" className={sectionIconClass} />
          <span>Rebate Transactions</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-black dark:text-slate-400">
          <span>
            Accrued:{" "}
            <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatRebateNumber(totals.rebate)} {currencyCode}
            </strong>
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide transactions"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Icon icon="tabler:x" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="px-4 pt-3 text-[12px] text-amber-600">{error}</p>
      )}

      <div className="max-h-[320px] overflow-auto">
        <table className="w-full min-w-[620px] text-left border-collapse text-sm">
          <thead className="sticky top-0">
            <tr className={tableHeadRowClass}>
              <th className="py-2.5 pl-4 pr-3">Posting Date</th>
              <th className="py-2.5 px-3">Document</th>
              <th className="py-2.5 px-3 text-right">Quantity</th>
              <th className="py-2.5 px-3 text-right">Base Amount</th>
              <th className="py-2.5 px-3 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
                Rebate Amount
              </th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[12px] text-slate-400 animate-pulse">
                  Loading transactions...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[12px] text-slate-400">
                  No transactions posted against this rebate yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pl-4 pr-3 tabular-nums whitespace-nowrap">
                    {formatRebateDate(r.posting_date)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-black dark:text-slate-100">
                    {r.source_document_type}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatRebateNumber(r.quantity, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatRebateNumber(r.base_amount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                    {formatRebateNumber(r.rebate_amount)}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 font-semibold">
                <td colSpan={3} className="py-2.5 pl-4 pr-3 text-[11px] text-black dark:text-slate-400">
                  Total ({currencyCode})
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {formatRebateNumber(totals.base)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatRebateNumber(totals.rebate)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

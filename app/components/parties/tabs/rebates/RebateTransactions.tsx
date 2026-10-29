// app/components/parties/tabs/rebates/RebateTransactions.tsx

"use client";

import { useEffect, useState } from "react";
import type { RebateTransaction } from "@/types/rebate";

interface Props {
  rebateId?: string;
  currencyCode?: string;
}

export default function RebateTransactions({
  rebateId,
  currencyCode = "GBP",
}: Props) {
  const [rows, setRows] = useState<RebateTransaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rebateId) return;
    let alive = true;
    // setError("");
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
      });
    return () => {
      alive = false;
    };
  }, [rebateId]);

  if (!rebateId) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <h3 className="p-3 text-xs font-semibold">Rebate Transactions</h3>

      {error && <p className="px-3 pb-2 text-xs text-amber-600">{error}</p>}

      <table className="w-full min-w-[550px] text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            {[
              "Posting Date",
              "Document",
              "Quantity",
              "Base Amount",
              "Rebate Amount",
              "Status",
            ].map((h) => (
              <th key={h} className="p-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-slate-100 dark:border-slate-800"
            >
              <td className="p-2">{r.posting_date}</td>
              <td className="p-2">{r.source_document_type}</td>
              <td className="p-2">{r.quantity}</td>
              <td className="p-2">
                {r.base_amount} {currencyCode}
              </td>
              <td className="p-2">
                {r.rebate_amount} {currencyCode}
              </td>
              <td className="p-2">{r.status}</td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-slate-400">
                No transactions available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

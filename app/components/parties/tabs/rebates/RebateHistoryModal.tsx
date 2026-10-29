// app/components/parties/tabs/rebates/RebateHistoryModal.tsx

"use client";

import { useEffect, useState } from "react";
import type { RebateHistoryEntry } from "@/types/rebate";

interface Props {
  rebateId: string | null;
  onClose: () => void;
}

export default function RebateHistoryModal({ rebateId, onClose }: Props) {
  const [rows, setRows] = useState<RebateHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rebateId) return;
    let alive = true;
    // setLoading(true);
    // setError("");
    fetch(`/api/rebates/${rebateId}/history`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load rebate history");
        return r.json();
      })
      .then((d) => {
        if (alive) setRows(Array.isArray(d) ? d : d.history || d.data || []);
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

  if (!rebateId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rebate history"
    >
      <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rebate History</h3>
          <button onClick={onClose} className="text-xs text-slate-500">
            Close ✕
          </button>
        </div>
        {loading && <p className="text-xs">Loading...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {rows.map((r) => (
          <div
            key={r.id}
            className="border-b border-slate-200 py-3 text-xs dark:border-slate-700"
          >
            <div className="flex justify-between">
              <strong>{r.action}</strong>
              <span>{r.changed_at}</span>
            </div>
            {r.changed_by && <p>Changed by: {r.changed_by}</p>}
            <details className="mt-1">
              <summary className="cursor-pointer text-blue-600">
                View changes
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-slate-100 p-2 text-[11px] dark:bg-slate-800">
                {JSON.stringify(
                  { before: r.old_data, after: r.new_data },
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        ))}
        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-slate-400">No history available.</p>
        )}
      </div>
    </div>
  );
}

// app/components/parties/tabs/rebates/RebateHistoryModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

import type { RebateHistoryEntry } from "@/types/rebate";

interface Props {
  rebateId: string | null;
  rebateName?: string;
  onClose: () => void;
}

const ACTION_ICONS: Record<string, string> = {
  CREATE: "tabler:plus",
  CREATED: "tabler:plus",
  UPDATE: "tabler:pencil",
  UPDATED: "tabler:pencil",
  ACTIVATE: "tabler:player-play",
  ACTIVATED: "tabler:player-play",
  SUSPEND: "tabler:player-pause",
  SUSPENDED: "tabler:player-pause",
  CANCEL: "tabler:ban",
  CANCELLED: "tabler:ban",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Lists the top-level fields whose values differ between before and after. */
function changedFields(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
) {
  if (!before || !after) return [];
  const ignore = new Set(["updated_at", "created_at", "updated_by", "created_by"]);
  return Object.keys(after)
    .filter((key) => !ignore.has(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      key,
      label: key.replace(/_/g, " "),
      before: before[key],
      after: after[key],
    }));
}

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return Array.isArray(v) ? `${v.length} entries` : "…";
  return String(v);
};

export default function RebateHistoryModal({
  rebateId,
  rebateName,
  onClose,
}: Props) {
  const [rows, setRows] = useState<RebateHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!rebateId) return;
    let alive = true;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Rebate history"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#11161D] rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 dark:bg-emerald-500/20 flex items-center justify-center">
              <Icon icon="tabler:history" className="text-emerald-800 dark:text-emerald-400 text-xl" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-black dark:text-slate-100">
                Rebate History
              </h4>
              {rebateName && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {rebateName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto text-sm">
          {loading ? (
            <p className="text-center py-6 text-slate-400 animate-pulse">
              Loading rebate history...
            </p>
          ) : error ? (
            <p className="text-center py-6 text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-center py-6 text-slate-400">
              No history recorded for this rebate.
            </p>
          ) : (
            <ol className="relative ml-3 border-l border-slate-200 dark:border-slate-800">
              {rows.map((r) => {
                const action = String(r.action || "").toUpperCase();
                const changes = changedFields(r.old_data, r.new_data);
                const isOpen = expanded === r.id;
                return (
                  <li key={r.id} className="mb-4 ml-5 last:mb-0">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
                      <Icon
                        icon={ACTION_ICONS[action] || "tabler:point"}
                        className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
                      />
                    </span>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold capitalize text-black dark:text-slate-100">
                          {String(r.action || "Change").toLowerCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {formatDateTime(r.changed_at)}
                        </span>
                      </div>
                      {r.changed_by && (
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          by {r.changed_by}
                        </p>
                      )}

                      {changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {changes.slice(0, isOpen ? undefined : 3).map((c) => (
                            <div
                              key={c.key}
                              className="grid grid-cols-12 gap-2 text-[12px]"
                            >
                              <span className="col-span-4 capitalize text-slate-500">
                                {c.label}
                              </span>
                              <span className="col-span-8 text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400">
                                  {show(c.before)}
                                </span>{" "}
                                → <strong>{show(c.after)}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(changes.length > 3 || r.old_data || r.new_data) && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="mt-2 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {isOpen ? "Hide details" : "View details"}
                        </button>
                      )}

                      {isOpen && (r.old_data || r.new_data) && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-[11px]">
                          {JSON.stringify(
                            { before: r.old_data, after: r.new_data },
                            null,
                            2,
                          )}
                        </pre>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// app/components/parties/tabs/rebates/RebateTab.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import type { RebateDraft, RebateTabProps } from "@/types/rebate";
import { newRebate } from "@/types/rebate";
import { rebateSchema } from "@/lib/validations/rebate.schema";
import RebateList from "./RebateList";
import RebateForm from "./RebateForm";
import RebateHistoryModal from "./RebateHistoryModal";
import RebateTransactions from "./RebateTransactions";
import {
  SCOPE_LABELS,
  cardClass,
  formatRebateDate,
  formatRebateValue,
  primaryButtonClass,
  secondaryButtonClass,
  statusBadgeClass,
  statusLabel,
} from "./styles";

interface Props extends RebateTabProps {
  categoryLookupUrl?: string;
  itemLookupUrl?: string;
}

const getError = (e: unknown) =>
  e instanceof Error ? e.message : "Unexpected error";

const DAY_MS = 86_400_000;

export default function RebateTab({
  partyId,
  rebateType,
  baseCurrencyId,
  isReadonly = false,
  categoryLookupUrl,
  itemLookupUrl,
}: Props) {
  const [rows, setRows] = useState<RebateDraft[]>([]);
  const [selected, setSelected] = useState<RebateDraft | null>(null);
  const [draft, setDraft] = useState<RebateDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  const partyLabel = rebateType === "SALES" ? "Customer" : "Supplier";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/parties/${partyId}/rebates?rebate_type=${rebateType}`,
      );
      if (!r.ok) throw new Error("Failed to load rebates");
      const data = await r.json();
      const records: RebateDraft[] = Array.isArray(data)
        ? data
        : data.rebates || data.data || [];
      const filtered = records.filter((x) => x.rebate_type === rebateType);
      setRows(filtered);
      setSelected(
        (old) => filtered.find((x) => x.id === old?.id) || filtered[0] || null,
      );
    } catch (e) {
      toast.error(getError(e));
    } finally {
      setLoading(false);
    }
  }, [partyId, rebateType]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const active = rows.filter((r) => r.status === "ACTIVE");
    const expiringSoon = active.filter((r) => {
      const end = new Date(r.end_date).getTime();
      return Number.isFinite(end) && end >= now && end - now <= 30 * DAY_MS;
    });
    return {
      total: rows.length,
      active: active.length,
      drafts: rows.filter((r) => !r.status || r.status === "DRAFT").length,
      expiringSoon: expiringSoon.length,
    };
  }, [rows]);

  const choose = (r: RebateDraft) => {
    if (editing) return;
    setSelected(r);
    setDraft(null);
    setErrors({});
    setShowTransactions(false);
  };

  const add = () => {
    if (isReadonly) return;
    setDraft(newRebate(partyId, rebateType, baseCurrencyId));
    setEditing(true);
    setErrors({});
    setShowTransactions(false);
  };

  const edit = () => {
    if (isReadonly || !selected || selected.status !== "DRAFT") return;
    setDraft(structuredClone(selected));
    setEditing(true);
    setErrors({});
  };

  const cancel = () => {
    setDraft(null);
    setEditing(false);
    setErrors({});
  };

  const save = async () => {
    if (!draft || isReadonly) return;
    const parsed = rebateSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".");
        next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please correct rebate validation errors");
      return;
    }
    setBusy(true);
    try {
      const isUpdate = Boolean(draft.id);
      const url = isUpdate
        ? `/api/rebates/${draft.id}`
        : `/api/parties/${partyId}/rebates`;
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to save rebate");
      toast.success("Rebate saved successfully");
      setEditing(false);
      setDraft(null);
      await load();
    } catch (e) {
      toast.error(getError(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    if (!selected?.id || isReadonly || selected.status !== "DRAFT") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rebates/${selected.id}/activate`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Activation failed");
      toast.success("Rebate activated");
      await load();
    } catch (e) {
      toast.error(getError(e));
    } finally {
      setBusy(false);
    }
  };

  const current = editing ? draft : selected;

  const kpiCards = [
    { label: "Agreements", value: kpis.total, icon: "tabler:receipt-refund" },
    { label: "Active", value: kpis.active, icon: "tabler:circle-check", accent: true },
    { label: "Drafts", value: kpis.drafts, icon: "tabler:file-pencil" },
    { label: "Expiring in 30 days", value: kpis.expiringSoon, icon: "tabler:calendar-exclamation" },
  ];

  return (
    <div className="space-y-4">
      {/* TOP KPI STRIP */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100 shrink-0 px-1">
          <Icon icon="tabler:discount-check" className="text-emerald-800 dark:text-emerald-400 text-3xl" />
          <span>{partyLabel} Rebates</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600/15 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Icon icon={card.icon} className="text-emerald-800 dark:text-emerald-400 text-2xl" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-black dark:text-slate-400">{card.label}</p>
                <p
                  className={`text-sm font-bold tabular-nums truncate ${
                    card.accent
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-black dark:text-slate-100"
                  }`}
                >
                  {loading ? "…" : card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RebateList
        rows={rows}
        selectedId={selected?.id}
        onSelect={choose}
        onAdd={add}
        readonly={isReadonly || editing}
        loading={loading}
      />

      {current && (
        <>
          {/* Selected agreement header + actions */}
          <section
            className={`${cardClass} flex flex-wrap items-center justify-between gap-3 ${
              editing ? "border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200/60 dark:ring-emerald-900/50" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/15 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Icon
                  icon={editing ? "tabler:pencil" : "tabler:discount-2"}
                  className="text-emerald-800 dark:text-emerald-400 text-2xl"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-black dark:text-slate-100 truncate">
                    {editing
                      ? draft?.id
                        ? `Edit: ${draft.name || "Rebate"}`
                        : "New Rebate Agreement"
                      : selected?.name}
                  </h3>
                  <span className={statusBadgeClass(current.status)}>
                    {statusLabel(current.status)}
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{current.rebate_no || "Not numbered yet"}</span>
                  <span>·</span>
                  <span>{SCOPE_LABELS[current.scope] || current.scope}</span>
                  <span>·</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatRebateValue(
                      current.rebate_value,
                      current.price_type,
                      current.calculation_method,
                    )}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {formatRebateDate(current.start_date)} → {formatRebateDate(current.end_date)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!editing && selected?.id && (
                <>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => setHistoryId(selected.id || null)}
                  >
                    <Icon icon="tabler:history" className="text-base" />
                    History
                  </button>
                  <button
                    type="button"
                    className={`${secondaryButtonClass} ${
                      showTransactions
                        ? "border-emerald-500 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : ""
                    }`}
                    onClick={() => setShowTransactions((v) => !v)}
                  >
                    <Icon icon="tabler:arrows-exchange" className="text-base" />
                    Transactions
                  </button>
                  {!isReadonly && selected.status === "DRAFT" && (
                    <>
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={edit}
                      >
                        <Icon icon="tabler:pencil" className="text-base" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className={primaryButtonClass}
                        onClick={() => void activate()}
                      >
                        <Icon
                          icon={busy ? "tabler:loader-2" : "tabler:player-play"}
                          className={`text-base ${busy ? "animate-spin" : ""}`}
                        />
                        Activate
                      </button>
                    </>
                  )}
                </>
              )}

              {editing && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className={secondaryButtonClass}
                    onClick={cancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={primaryButtonClass}
                    onClick={() => void save()}
                  >
                    <Icon
                      icon={busy ? "tabler:loader-2" : "tabler:device-floppy"}
                      className={`text-base ${busy ? "animate-spin" : ""}`}
                    />
                    {busy ? "Saving..." : "Save Rebate"}
                  </button>
                </>
              )}
            </div>
          </section>

          {!editing && selected && selected.status !== "DRAFT" && !isReadonly && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2 text-[12px] text-slate-600 dark:text-slate-400">
              <Icon icon="tabler:lock" className="text-slate-400" />
              Only draft rebates can be edited. This agreement is {statusLabel(selected.status).toLowerCase()}.
            </div>
          )}

          {showTransactions && !editing && selected?.id && (
            <RebateTransactions
              key={selected.id}
              rebateId={selected.id}
              onClose={() => setShowTransactions(false)}
            />
          )}

          <RebateForm
            value={current}
            onChange={(v) => setDraft(v)}
            readonly={!editing || isReadonly}
            errors={errors}
            categoryLookupUrl={categoryLookupUrl}
            itemLookupUrl={itemLookupUrl}
          />
        </>
      )}

      {!current && !loading && rows.length > 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400">
          Select a rebate agreement to view its details.
        </div>
      )}

      {historyId && (
        <RebateHistoryModal
          key={historyId}
          rebateId={historyId}
          rebateName={rows.find((r) => r.id === historyId)?.name}
          onClose={() => setHistoryId(null)}
        />
      )}
    </div>
  );
}

// app/components/parties/tabs/rebates/RebateTab.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { RebateDraft, RebateTabProps } from "@/types/rebate";
import { newRebate } from "@/types/rebate";
import { rebateSchema } from "@/lib/validations/rebate.schema";
import RebateList from "./RebateList";
import RebateForm from "./RebateForm";
import RebateHistoryModal from "./RebateHistoryModal";
import RebateTransactions from "./RebateTransactions";

interface Props extends RebateTabProps {
  categoryLookupUrl?: string;
  itemLookupUrl?: string;
}

const getError = (e: unknown) =>
  e instanceof Error ? e.message : "Unexpected error";

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

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <RebateList
        rows={rows}
        selectedId={selected?.id}
        onSelect={choose}
        onAdd={add}
        readonly={isReadonly || editing}
      />
      {loading && <p className="text-xs text-slate-500">Loading rebates...</p>}
      {current && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold">
                {editing
                  ? draft?.id
                    ? "Edit Rebate"
                    : "New Rebate"
                  : selected?.name}
              </h3>
              <p className="text-xs text-slate-500">
                {current.rebate_no || "Draft agreement"} ·{" "}
                {current.status || "DRAFT"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!editing && selected?.id && (
                <>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                    onClick={() => setHistoryId(selected.id || null)}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                    onClick={() => setShowTransactions((v) => !v)}
                  >
                    Transactions
                  </button>
                  {!isReadonly && selected.status === "DRAFT" && (
                    <>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                        onClick={edit}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                        onClick={activate}
                      >
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
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    onClick={() => void save()}
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
                    onClick={cancel}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          <RebateForm
            value={current}
            onChange={(v) => setDraft(v)}
            readonly={!editing || isReadonly}
            errors={errors}
            categoryLookupUrl={categoryLookupUrl}
            itemLookupUrl={itemLookupUrl}
          />
          {showTransactions && selected?.id && (
            <RebateTransactions rebateId={selected.id} />
          )}
        </>
      )}

      {!current && !loading && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400 dark:border-slate-700">
          Select or create a rebate agreement.
        </div>
      )}

      <RebateHistoryModal
        rebateId={historyId}
        onClose={() => setHistoryId(null)}
      />
    </div>
  );
}

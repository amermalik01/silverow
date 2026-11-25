// app/components/crm/prospects/components/ProspectFollowUpPanel.tsx

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";

export type ProspectFollowUpValues = {
  last_contacted_at: string;
  next_follow_up_at: string;
  reminder_enabled: boolean;
};

type Props = {
  prospectId: string;
  values: ProspectFollowUpValues;
  readOnly?: boolean;
  onSaved: (values: ProspectFollowUpValues) => void;
};

function toDateInput(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value: string, empty = "Not set"): string {
  if (!value) return empty;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd/MM/yyyy");
}

export default function ProspectFollowUpPanel({
  prospectId,
  values,
  readOnly = false,
  onSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProspectFollowUpValues>(values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* Keep the view in sync when the parent reloads the prospect. */
  useEffect(() => {
    if (!editing) setDraft(values);
  }, [values, editing]);

  useEffect(() => {
    if (readOnly) setEditing(false);
  }, [readOnly]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const startEdit = () => {
    setDraft(values);
    setError("");
    setNotice("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(values);
    setError("");
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sales/crm/prospects/${prospectId}/follow-up`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            last_contacted_at: draft.last_contacted_at || null,
            next_follow_up_at: draft.next_follow_up_at || null,
            reminder_enabled: draft.reminder_enabled,
          }),
        },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        prospect?: {
          last_contacted_at: string | null;
          next_follow_up_at: string | null;
          reminder_enabled: boolean;
        };
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to update follow-up.");
      }

      const saved: ProspectFollowUpValues = result.prospect
        ? {
            last_contacted_at: toDateInput(result.prospect.last_contacted_at),
            next_follow_up_at: toDateInput(result.prospect.next_follow_up_at),
            reminder_enabled: Boolean(result.prospect.reminder_enabled),
          }
        : draft;

      onSaved(saved);
      setEditing(false);
      setNotice("Follow-up updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const isOverdue =
    Boolean(values.next_follow_up_at) &&
    isBefore(parseISO(values.next_follow_up_at), startOfDay(new Date()));

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Icon icon="lucide:calendar-days" className="text-xl text-emerald-600" />
          Follow-up Schedule
        </h3>

        {!readOnly && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            <Icon icon="lucide:calendar-plus" className="text-sm" />
            {values.next_follow_up_at ? "Update Follow-up" : "Schedule Follow-up"}
          </button>
        )}

        {editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
            >
              <Icon
                icon={saving ? "lucide:loader-2" : "lucide:check"}
                className={saving ? "animate-spin text-sm" : "text-sm"}
              />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              Last Contacted
              <DatePicker
                value={
                  draft.last_contacted_at
                    ? parseISO(draft.last_contacted_at)
                    : undefined
                }
                containerClassName="text-sm"
                maxDate={new Date()}
                onChange={(date) =>
                  setDraft((current) => ({
                    ...current,
                    last_contacted_at: date ? format(date, "yyyy-MM-dd") : "",
                  }))
                }
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              Next Follow-up
              <DatePicker
                value={
                  draft.next_follow_up_at
                    ? parseISO(draft.next_follow_up_at)
                    : undefined
                }
                containerClassName="text-sm"
                onChange={(date) =>
                  setDraft((current) => ({
                    ...current,
                    next_follow_up_at: date ? format(date, "yyyy-MM-dd") : "",
                  }))
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.reminder_enabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  reminder_enabled: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-emerald-700"
            />
            Enable follow-up reminder
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500">Last Contacted</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {formatDate(values.last_contacted_at)}
            </div>
          </div>

          <div
            className={`rounded-lg p-3 ${
              isOverdue
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="text-xs font-medium">
              {isOverdue ? "Follow-up overdue" : "Next Follow-up"}
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatDate(values.next_follow_up_at, "Not scheduled")}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500">Reminder</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              <Icon
                icon={values.reminder_enabled ? "lucide:bell-ring" : "lucide:bell-off"}
                className={values.reminder_enabled ? "text-emerald-600" : "text-slate-400"}
              />
              {values.reminder_enabled ? "Enabled" : "Off"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

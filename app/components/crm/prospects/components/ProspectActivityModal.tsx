// app/components/crm/prospects/components/ProspectActivityModal.tsx

"use client";

import { useState } from "react";
import type { ProspectActivity, ProspectContact } from "@/types/prospect";

type Props = {
  prospectId: string;
  contacts: ProspectContact[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

type ActivityType = ProspectActivity["activity_type"];

const activityTypes: ActivityType[] = [
  "Email",
  "Call",
  "Meeting",
  "Task",
  "Note",
  "Other",
];

function toISOStringOrUndefined(
  value: string | null | undefined,
): string | undefined {
  if (!value?.trim()) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export default function ProspectActivityModal({
  prospectId,
  contacts,
  onClose,
  onSaved,
}: Props) {
  const [activityType, setActivityType] = useState<ActivityType>("Call");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [activityAt, setActivityAt] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [contactId, setContactId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!subject.trim()) {
      setError("Please enter an activity subject.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sales/crm/prospects/${prospectId}/activities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity_type: activityType,
            subject: subject.trim(),
            description: description.trim() || null,
            // activity_at: activityAt,
            activity_at: toISOStringOrUndefined(activityAt),
            contact_id: contactId || null,
            outcome: outcome.trim() || null,
            next_follow_up_at: nextFollowUp || null,
            reminder_enabled: reminderEnabled,
          }),
        },
      );

      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to save activity.";
        throw new Error(message);
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save activity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-emerald-900 px-5 py-4 text-white">
          <h3 className="font-semibold">Log Activity</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-white/80 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              Activity Type *
              <select
                value={activityType}
                onChange={(event) =>
                  setActivityType(event.target.value as ActivityType)
                }
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2"
              >
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600">
              Activity Date *
              <input
                type="datetime-local"
                value={activityAt}
                onChange={(event) => setActivityAt(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2"
              />
            </label>

            <label className="text-sm text-slate-600 sm:col-span-2">
              Subject *
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-3"
                placeholder="e.g. Initial discussion with customer"
              />
            </label>

            <label className="text-sm text-slate-600">
              Contact
              <select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2"
              >
                <option value="">No contact selected</option>
                {contacts
                  .filter((contact) => contact.id)
                  .map((contact) => (
                    <option key={contact.id} value={contact.id || ""}>
                      {contact.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-sm text-slate-600">
              Outcome
              <input
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-3"
                placeholder="Call outcome"
              />
            </label>

            <label className="text-sm text-slate-600 sm:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 p-3"
                placeholder="Activity details..."
              />
            </label>

            <label className="text-sm text-slate-600">
              Next Follow-up
              <input
                type="date"
                value={nextFollowUp}
                onChange={(event) => setNextFollowUp(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2"
              />
            </label>

            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(event) => setReminderEnabled(event.target.checked)}
                className="accent-emerald-800"
              />
              Set Reminder
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Activity"}
          </button>
        </div>
      </div>
    </div>
  );
}

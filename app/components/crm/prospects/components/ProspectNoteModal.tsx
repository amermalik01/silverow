// app/components/crm/prospects/components/ProspectNoteModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

export interface ProspectNote {
  id: string;
  prospect_id: string;
  author_id: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
}

interface Props {
  prospectId: string;
  note?: ProspectNote | null;
  onClose: () => void;
  onSaved: (note: ProspectNote) => void;
}

export default function ProspectNoteModal({
  prospectId,
  note,
  onClose,
  onSaved,
}: Props) {
  const isEditing = Boolean(note?.id);

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [note]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setError("Please enter the note content.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = isEditing
        ? `/api/sales/crm/prospects/${prospectId}/notes/${note?.id}`
        : `/api/sales/crm/prospects/${prospectId}/notes`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim() || "General Note Entry",
          content: content.trim(),
        }),
      });

      const result: {
        data?: ProspectNote;
        error?: string;
      } = await response.json();

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Unable to save prospect note.");
      }

      onSaved(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save prospect note.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-note-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11161D]"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
                <Icon icon="tabler:notes" className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="prospect-note-title"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  {isEditing ? "Edit Note" : "Add Note"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Add information to this prospect`s record.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Icon icon="tabler:x" className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label
                htmlFor="prospect-note-heading"
                className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Note Title
              </label>

              <input
                id="prospect-note-heading"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="e.g. Customer requirements"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="prospect-note-content"
                className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Note Content
                <span className="ml-1 text-red-500">*</span>
              </label>

              <textarea
                id="prospect-note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={7}
                maxLength={10000}
                required
                placeholder="Write your prospect note here..."
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500"
              />

              <p className="mt-1 text-right text-[11px] text-slate-400">
                {content.length}/10000
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                <Icon
                  icon="tabler:alert-circle"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {saving ? (
                <Icon icon="tabler:loader-2" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon icon="tabler:device-floppy" className="h-4 w-4" />
              )}

              {saving ? "Saving..." : isEditing ? "Update Note" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

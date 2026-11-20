// app/components/crm/prospects/components/ProspectNotesList.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import ProspectNoteModal, { type ProspectNote } from "./ProspectNoteModal";

interface Props {
  prospectId: string;
  readonly?: boolean;
}

export default function ProspectNotesList({
  prospectId,
  readonly = false,
}: Props) {
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProspectNote | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ProspectNote | null>(null);

  const [deleting, setDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await fetch(
        `/api/sales/crm/prospects/${prospectId}/notes`,
        {
          cache: "no-store",
        },
      );

      const result: {
        data?: ProspectNote[];
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load prospect notes.");
      }

      setNotes(result.data ?? []);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load prospect notes.",
      );
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleAdd = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const handleEdit = (note: ProspectNote) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const handleSaved = (savedNote: ProspectNote) => {
    setNotes((previous) => {
      const exists = previous.some((item) => item.id === savedNote.id);

      if (exists) {
        return previous.map((item) =>
          item.id === savedNote.id ? savedNote : item,
        );
      }

      return [savedNote, ...previous];
    });

    setModalOpen(false);
    setEditingNote(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/sales/crm/prospects/${prospectId}/notes/${deleteTarget.id}`,
        {
          method: "DELETE",
        },
      );

      const result: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete note.");
      }

      setNotes((previous) =>
        previous.filter((item) => item.id !== deleteTarget.id),
      );

      setDeleteTarget(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to delete note.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const cardClass =
    "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#11161D]";

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
              <Icon icon="tabler:notes" className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Prospect Notes
              </h3>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Internal notes and important information
              </p>
            </div>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
              {notes.length}
            </span>
          </div>

          {!readonly && (
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Icon icon="tabler:plus" className="h-4 w-4" />
              Add Note
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className={`${cardClass} py-10 text-center`}>
            <Icon
              icon="tabler:loader-2"
              className="mx-auto h-6 w-6 animate-spin text-emerald-600"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Loading prospect notes...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-red-700 dark:text-red-400">
                {loadError}
              </p>

              <button
                type="button"
                onClick={() => void loadNotes()}
                className="text-xs font-semibold text-red-700 underline dark:text-red-400"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && notes.length === 0 && (
          <div className={`${cardClass} border-dashed px-4 py-12 text-center`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Icon icon="tabler:notes-off" className="h-6 w-6" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              No notes added yet
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Keep important prospect information here.
            </p>

            {!readonly && (
              <button
                type="button"
                onClick={handleAdd}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <Icon icon="tabler:plus" className="h-4 w-4" />
                Create your first note
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        {!loading && !loadError && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <article
                key={note.id}
                className={`${cardClass} p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      <Icon icon="tabler:note" className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {note.title || "General Note Entry"}
                      </h4>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Icon icon="tabler:user" className="h-3.5 w-3.5" />
                          {note.author || "Unknown"}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Icon
                            icon="tabler:calendar"
                            className="h-3.5 w-3.5"
                          />
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!readonly && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(note)}
                        title="Edit note"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                      >
                        <Icon icon="tabler:edit" className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(note)}
                        title="Delete note"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Icon icon="tabler:trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-700 dark:text-slate-300">
                    {note.content}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <ProspectNoteModal
          prospectId={prospectId}
          note={editingNote}
          onClose={() => {
            setModalOpen(false);
            setEditingNote(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11161D]"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <Icon icon="tabler:trash" className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Delete this note?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    This note will be permanently deleted. This action cannot be
                    undone.
                  </p>

                  <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {deleteTarget.title || "General Note Entry"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && (
                  <Icon
                    icon="tabler:loader-2"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {deleting ? "Deleting..." : "Delete Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

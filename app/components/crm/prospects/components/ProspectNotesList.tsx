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

  return (
    <>
      <section>
        {/* Toolbar — same pattern as the Activity tab */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void loadNotes()}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline disabled:opacity-50 dark:text-emerald-400"
          >
            <Icon
              icon="lucide:refresh-cw"
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {/* {!readonly && notes.length > 0 && ( */}
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
            >
              Add Note
            </button>
          {/* )} */}
        </div>

        {/* Error */}
        {!loading && loadError && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/60 dark:bg-red-950/30">
            <p className="text-xs text-red-700 dark:text-red-400">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadNotes()}
              className="text-xs font-semibold text-red-700 underline dark:text-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {loading && notes.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading notes...
          </div>
        ) : !loadError && notes.length === 0 ? (
          /* Empty — same as the Activity tab */
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No notes yet
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Keep important prospect information here.
            </p>

            {!readonly && (
              <button
                type="button"
                onClick={handleAdd}
                className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
              >
                Add Note
              </button>
            )}
          </div>
        ) : notes.length > 0 ? (
          /* Timeline */
          <div className="relative">
            <div className="absolute bottom-4 left-[11px] top-3 w-px bg-emerald-200 dark:bg-emerald-900" />

            <div className="h-90 space-y-0 overflow-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group relative flex gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800"
                >
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-800 ring-4 ring-white dark:bg-emerald-950 dark:text-emerald-400 dark:ring-[#11161D]">
                    <Icon icon="andrsrxn:notes" className="text-lg" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {note.title || "General Note Entry"}
                      </h4>

                      <div className="flex items-center gap-1">
                        <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(note.created_at)}
                        </span>

                        {!readonly && (
                          <span className="ml-1 flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleEdit(note)}
                              title="Edit note"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                            >
                              <Icon icon="tabler:edit" className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(note)}
                              title="Delete note"
                              className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <Icon icon="tabler:trash" className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    {note.content && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                        {note.content}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      By: {note.author || "Unknown"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

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

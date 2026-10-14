// app/components/shared/NotesTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export type Note = {
  id?: string;
  module: string;
  record_id: string;
  note: string;
  created_at?: string;
  created_by?: string | null;
  created_by_name?: string | null;
};

type Props = {
  module: string;
  recordId: string;
  readonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

export default function NotesTab({
  module,
  recordId,
  readonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load notes.");
      }

      setNotes(data.data || []);
    } catch (err) {
      console.error("Load notes error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load notes.",
      );
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSave = async () => {
    if (readonly || saving) return;

    if (!note.trim()) {
      toast.error("Please enter a note.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          record_id: recordId,
          note: note.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add note.");
      }

      setNote("");
      await loadNotes();
      toast.success("Note added successfully.");
    } catch (err) {
      console.error("Add note error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to add note.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (item: Note) => {
    if (readonly || !item.id) return;

    setEditingId(item.id);
    setEditingNote(item.note);
    onRequestEdit?.();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNote("");
  };

  const handleUpdate = async (item: Note) => {
    if (readonly || saving || !item.id) return;

    if (!editingNote.trim()) {
      toast.error("Note cannot be empty.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        `/api/notes/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module,
            record_id: recordId,
            note: editingNote.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update note.");
      }

      cancelEditing();
      await loadNotes();
      toast.success("Note updated successfully.");
    } catch (err) {
      console.error("Update note error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update note.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Note) => {
    if (readonly || saving || !item.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(
        `/api/notes/${encodeURIComponent(item.id)}?${params.toString()}`,
        { method: "DELETE" },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete note.");
      }

      if (editingId === item.id) {
        cancelEditing();
      }

      await loadNotes();
      toast.success("Note deleted successfully.");
    } catch (err) {
      console.error("Delete note error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete note.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "Not available";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Not available";
    }

    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Add note */}
      <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Add Note
        </h3>

        <textarea
          value={note}
          disabled={readonly || saving}
          onChange={(e) => setNote(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg w-full text-xs bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
          rows={5}
          placeholder="Enter your note..."
        />

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          // disabled={readonly || saving || !note.trim()}
          variant="add_line"
        >
          {saving ? "Processing..." : "Add Note"}
        </Button>

        {/* <Button
          onClick={handleSave}
          disabled={saving} //  || !note.trim() || readonly
          variant="add_line"
        >
          {saving ? "Posting..." : "Add Notes"}
        </Button> */}
      </div>

      {/* Notes list */}
      <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6 animate-pulse">
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            <Icon
              icon="lucide:notebook-text"
              className="w-8 h-8 mx-auto mb-2 opacity-50"
            />
            No notes found for this record.
          </div>
        ) : (
          notes.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm"
            >
              {/* Note header and actions */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Icon icon="lucide:sticky-note" className="w-4 h-4" />
                  </div>
                  <span>Note</span>
                </div>

                {!readonly && editingId !== item.id && item.id && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      disabled={saving}
                      title="Edit note"
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 disabled:opacity-50"
                    >
                      <Icon icon="lucide:pencil" className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={saving}
                      title="Delete note"
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Note content */}
              {editingId === item.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingNote}
                    onChange={(e) => setEditingNote(e.target.value)}
                    disabled={saving}
                    rows={5}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                    autoFocus
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="cancel"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="save"
                      onClick={() => handleUpdate(item)}
                      disabled={saving || !editingNote.trim()}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {item.note}
                </p>
              )}

              {/* Audit details */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:user-round" className="w-3.5 h-3.5" />
                  <span>
                    Created by:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.created_by_name ||
                        (item.created_by
                          ? `User ${item.created_by}`
                          : "Unknown")}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:calendar-clock" className="w-3.5 h-3.5" />
                  <span>
                    Created on:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(item.created_at)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* "use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export type Note = {
  id?: string;
  module: string;
  record_id: string;
  note: string;
  created_at?: string;
};

type Props = {
  module: string;
  recordId: string;
  readonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

export default function NotesTab({
  module,
  recordId,
  readonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/notes?module=${module}&record_id=${recordId}`,
      );
      const data = await res.json();
      setNotes(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSave = async () => {
    onRequestEdit?.();

    if (!(note.length > 0)) {
      toast.error("Notes are empty");
      return false;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, record_id: recordId, note }),
      });

      if (!res.ok) throw new Error("Could not preserve comment index mapping.");
      setNote("");
      await loadNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
   
      <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-semibold text-xs text-slate-400 capitalize tracking-wider">
          Notes
        </h3>
        <textarea
          value={note}
          disabled={readonly}
          onChange={(e) => setNote(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg w-full text-xs bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100"
          rows={4}
          placeholder="Add Notes..."
        />
        <Button
          onClick={handleSave}
          disabled={saving} //  || !note.trim() || readonly
          variant="add_line"
        >
          {saving ? "Posting..." : "Add Notes"}
        </Button>
      </div>


      <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6 animate-pulse">
            Reading audit feed histories...
          </p>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No historical documentation notations recorded.
          </div>
        ) : (
          notes.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-xs"
            >
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {item.note}
              </p>
              {item.created_at && (
                <div className="text-[10px] font-medium text-slate-400 mt-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {new Date(item.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} */

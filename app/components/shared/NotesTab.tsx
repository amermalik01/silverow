// app/components/shared/NotesTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import NotesRichEditor from "./NotesRichEditor";

export type Note = {
  id?: string;
  module: string;
  record_id: string;
  subject: string;
  description: string; // Rich-text HTML
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

// async function parseJsonResponse<T>(res: Response): Promise<T> {
//   const text = await res.text();

//   try {
//     return JSON.parse(text) as T;
//   } catch {
//     console.error("Invalid JSON response from API:", {
//       url: res.url,
//       status: res.status,
//       contentType: res.headers.get("content-type"),
//       responseBody: text.slice(0, 500),
//     });

//     throw new Error(
//       `The server returned an invalid JSON response (HTTP ${res.status}). Check the browser Network tab and server logs.`,
//     );
//   }
// }

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: T;

  try {
    data = JSON.parse(text) as T;
  } catch {
    console.error("Non-JSON API response:", {
      url: res.url,
      status: res.status,
      contentType: res.headers.get("content-type"),
      responseBody: text.slice(0, 1000),
    });

    throw new Error(
      `Notes API returned a non-JSON response (HTTP ${res.status}). Check Vercel logs.`,
    );
  }

  return data;
}

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

  // Add Note Form State
  const [subject, setSubject] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");

  // Edit Note Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState("");
  const [editingDescriptionHtml, setEditingDescriptionHtml] = useState("");

  // View Modal State
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const NOTES_PER_PAGE = 5;
  const totalPages = Math.ceil(notes.length / NOTES_PER_PAGE);

  const paginatedNotes = notes.slice(
    (currentPage - 1) * NOTES_PER_PAGE,
    currentPage * NOTES_PER_PAGE,
  );

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(`/api/notes?${params.toString()}`);
      // const data = await res.json();
      const data = await parseJsonResponse<{
        data?: Note[];
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load notes.");
      }

      setNotes(data.data || []);
    } catch (err) {
      console.error("Load notes error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSave = async () => {
    if (readonly || saving) return;

    if (!subject.trim()) {
      toast.error("Subject is required.");
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
          subject: subject.trim(),
          description: descriptionHtml,
        }),
      });

      // const data = await res.json();
      const data = await parseJsonResponse<{
        data?: Note;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to add note.");
      }

      setSubject("");
      setDescriptionHtml("");
      await loadNotes();
      toast.success("Note added successfully.");
    } catch (err) {
      console.error("Add note error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (item: Note) => {
    if (readonly || !item.id) return;

    setEditingId(item.id);
    setEditingSubject(item.subject || "");
    setEditingDescriptionHtml(item.description || "");
    onRequestEdit?.();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingSubject("");
    setEditingDescriptionHtml("");
  };

  const handleUpdate = async (item: Note) => {
    if (readonly || saving || !item.id) return;

    if (!editingSubject.trim()) {
      toast.error("Subject cannot be empty.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/notes/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          record_id: recordId,
          subject: editingSubject.trim(),
          description: editingDescriptionHtml,
        }),
      });

      // const data = await res.json();
      const data = await parseJsonResponse<{
        data?: Note;
        error?: string;
      }>(res);

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

      // const data = await res.json();
      const data = await parseJsonResponse<{
        success?: boolean;
        error?: string;
      }>(res);

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
    if (Number.isNaN(parsed.getTime())) return "Not available";
    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Helper to extract plain text and check length for truncation
  const getPlainText = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").trim();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Add note section */}
      <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-semibold text-xs text-slate-500 dark:text-slate-400 capitalize tracking-wider">
          Add Note
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            disabled={readonly || saving}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Enter note subject..."
            className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg w-full text-xs bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Description <span className="text-red-500">*</span>
          </label>
          <NotesRichEditor
            value={descriptionHtml}
            onChange={(html) => setDescriptionHtml(html)}
            disabled={readonly || saving}
            maxLength={500}
          />
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          variant="add_line"
          className="w-full"
        >
          {saving ? "Processing..." : "Add Note"}
        </Button>
      </div>

      {/* Notes list section */}
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
          paginatedNotes.map((item) => {
            const plainText = getPlainText(item.description);
            const isLongText = plainText.length > 120;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm"
              >
                {/* Note header and actions */}
                <div className="flex items-start justify-between gap-3 mb-2">
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={editingSubject}
                        onChange={(e) => setEditingSubject(e.target.value)}
                        disabled={saving}
                        maxLength={200}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Description
                      </label>
                      <NotesRichEditor
                        value={editingDescriptionHtml}
                        onChange={(html) => setEditingDescriptionHtml(html)}
                        disabled={saving}
                        maxLength={500}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
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
                        disabled={saving || !editingSubject.trim()}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {item.subject}
                    </h4>
                    <div className="text-xs leading-6 text-slate-700 dark:text-slate-300">
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert line-clamp-2 inline"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      {isLongText && (
                        <button
                          type="button"
                          onClick={() => setViewingNote(item)}
                          className="ml-1 text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-0.5"
                        >
                          Read More
                        </button>
                      )}
                    </div>
                  </div>
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
                    <Icon
                      icon="lucide:calendar-clock"
                      className="w-3.5 h-3.5"
                    />
                    <span>
                      Created on:{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(item.created_at)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Showing{" "}
            {notes.length === 0 ? 0 : (currentPage - 1) * NOTES_PER_PAGE + 1}
            {"–"}
            {Math.min(currentPage * NOTES_PER_PAGE, notes.length)}
            {" of "}
            {notes.length} notes
          </p>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Previous
            </Button>

            <span className="px-2 text-xs">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* View Full Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon icon="lucide:sticky-note" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {viewingNote.subject}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Created on {formatDate(viewingNote.created_at)} by{" "}
                    {viewingNote.created_by_name || "Unknown"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div
                className="text-xs leading-6 text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: viewingNote.description }}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingNote(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* "use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

// export type Note = {
//   id?: string;
//   module: string;
//   record_id: string;
//   note: string;
//   created_at?: string;
//   created_by?: string | null;
//   created_by_name?: string | null;
// };

export type Note = {
  id?: string;
  module: string;
  record_id: string;
  subject: string;
  description: string; // Rich-text HTML
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

  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(
    null,
  );

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const NOTES_PER_PAGE = 5;

  const totalPages = Math.ceil(notes.length / NOTES_PER_PAGE);

  const paginatedNotes = notes.slice(
    (currentPage - 1) * NOTES_PER_PAGE,
    currentPage * NOTES_PER_PAGE,
  );

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
      toast.error(err instanceof Error ? err.message : "Failed to load notes.");
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
      toast.error(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (item: Note) => {
    if (readonly || !item.id) return;

    setEditingId(item.id);
    setEditingNote(item.subject);
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

      const res = await fetch(`/api/notes/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          record_id: recordId,
          note: editingNote.trim(),
        }),
      });

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

      <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-semibold text-xs text-slate-500 dark:text-slate-400 capitalize tracking-wider">
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

        <Button
          onClick={handleSave}
          disabled={saving} //  || !note.trim() || readonly
          variant="add_line"
        >
          {saving ? "Posting..." : "Add Notes"}
        </Button>
      </div>


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
          // notes.map((item) => (
          paginatedNotes.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm"
            >

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
                <>
                  <p className="text-xs leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {item.subject}
                  </p>
                  <p className="text-xs leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {item.description}
                  </p>
                </>
              )}


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

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Showing{" "}
            {notes.length === 0 ? 0 : (currentPage - 1) * NOTES_PER_PAGE + 1}
            {"–"}
            {Math.min(currentPage * NOTES_PER_PAGE, notes.length)}
            {" of "}
            {notes.length} notes
          </p>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Previous
            </Button>

            <span className="px-2 text-xs">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} */

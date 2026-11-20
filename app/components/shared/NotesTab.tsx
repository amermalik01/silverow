// app/components/shared/NotesTab.tsx

// app/components/shared/NotesTab.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import NotesRichEditor from "./NotesRichEditor";

export type NoteCategory = "General" | "Activity" | "Finance" | string;

export type Note = {
  id?: string;
  module: string;
  record_id: string;
  subject: string;
  description: string; // Rich-text HTML
  category?: NoteCategory;
  is_pinned?: boolean;
  is_archived?: boolean;
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

const NOTE_CATEGORIES: NoteCategory[] = ["General", "Activity", "Finance"];

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

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "SY";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getCategoryBadgeStyle(category?: string): string {
  switch ((category || "General").toLowerCase()) {
    case "activity":
      return "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60";
    case "finance":
      return "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60";
  }
}

function getCategoryIcon(category?: string): string {
  switch ((category || "General").toLowerCase()) {
    case "activity":
      return "tabler:phone-call";
    case "finance":
      return "tabler:coins";
    default:
      return "tabler:file-text";
  }
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
  const [category, setCategory] = useState<NoteCategory>("General");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [pinThisNote, setPinThisNote] = useState(false);

  // Edit Note Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState("");
  const [editingCategory, setEditingCategory] = useState<NoteCategory>("General");
  const [editingDescriptionHtml, setEditingDescriptionHtml] = useState("");

  // Search, Filter, Sort & Overflow Menu State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "pinned">(
    "newest",
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // View Modal State
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(`/api/notes?${params.toString()}`);
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

  const getPlainText = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const processedNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = notes.filter((n) => {
      if (n.is_archived) return false;
      if (
        categoryFilter !== "all" &&
        (n.category || "General").toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (n.subject || "").toLowerCase().includes(q) ||
        getPlainText(n.description || "")
          .toLowerCase()
          .includes(q) ||
        (n.created_by_name || "").toLowerCase().includes(q) ||
        (n.category || "").toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "pinned") {
        const pinDiff = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
        if (pinDiff !== 0) return pinDiff;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [notes, searchQuery, categoryFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(processedNotes.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedNotes.slice(start, start + rowsPerPage);
  }, [processedNotes, currentPage, rowsPerPage]);

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
          category,
          is_pinned: pinThisNote,
          description: descriptionHtml,
        }),
      });

      const data = await parseJsonResponse<{
        data?: Note;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to add note.");
      }

      setSubject("");
      setCategory("General");
      setDescriptionHtml("");
      setPinThisNote(false);
      setCurrentPage(1);
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

    setOpenMenuId(null);
    setEditingId(item.id);
    setEditingSubject(item.subject || "");
    setEditingCategory(item.category || "General");
    setEditingDescriptionHtml(item.description || "");
    onRequestEdit?.();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingSubject("");
    setEditingCategory("General");
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
          category: editingCategory,
          description: editingDescriptionHtml,
        }),
      });

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

  const handleTogglePin = async (item: Note) => {
    if (readonly || saving || !item.id) return;
    setOpenMenuId(null);
    const nextPinned = !item.is_pinned;

    setNotes((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_pinned: nextPinned } : n)),
    );

    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          record_id: recordId,
          is_pinned: nextPinned,
        }),
      });
      if (res.ok) {
        await parseJsonResponse(res);
      }
    } catch {
      // Optimistic toggle remains available even if backend omits is_pinned
    }
  };

  const handleArchive = async (item: Note) => {
    if (readonly || saving || !item.id) return;
    setOpenMenuId(null);

    try {
      setSaving(true);
      const res = await fetch(`/api/notes/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          record_id: recordId,
          is_archived: true,
        }),
      });

      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to archive note.");
      }

      await loadNotes();
      toast.success("Note archived.");
    } catch (err) {
      console.error("Archive note error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to archive note.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Note) => {
    if (readonly || saving || !item.id) return;
    setOpenMenuId(null);

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

  const cardClass =
    "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] shadow-2xs transition-colors";

  const fieldClass =
    "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500 disabled:opacity-60 transition-colors";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* LEFT PANEL: New Note Composer */}
      <section className={`${cardClass} lg:col-span-4 p-4 space-y-3.5`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Icon
            icon="tabler:note-plus"
            className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
          />
          <span>New Note</span>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            disabled={readonly || saving}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Enter note subject..."
            className={fieldClass}
          />
          {errors["notes.subject"] && (
            <p className="text-red-500 text-[11px]">{errors["notes.subject"]}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            disabled={readonly || saving}
            onChange={(e) => setCategory(e.target.value)}
            className={fieldClass}
          >
            {NOTE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Description <span className="text-red-500">*</span>
          </label>
          <NotesRichEditor
            value={descriptionHtml}
            onChange={(html) => setDescriptionHtml(html)}
            disabled={readonly || saving}
            maxLength={2000}
          />
        </div>

        {/* Pin This Note Switch */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={readonly || saving}
            onClick={() => setPinThisNote((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-60"
          >
            <Icon
              icon={pinThisNote ? "tabler:star-filled" : "tabler:star"}
              className={`w-4 h-4 ${
                pinThisNote
                  ? "text-amber-500"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            />
            <span>Pin this note</span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={pinThisNote}
            disabled={readonly || saving}
            onClick={() => setPinThisNote((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
              pinThisNote
                ? "bg-emerald-600 border-emerald-600"
                : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            } ${readonly || saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
                pinThisNote ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={readonly || saving}
          variant="add_line"
          className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold py-2"
        >
          {saving ? "Processing..." : "Add Note"}
        </Button>
      </section>

      {/* RIGHT PANEL: Notes Feed & Controls */}
      <section className={`${cardClass} lg:col-span-8 p-4 space-y-4`}>
        {/* Feed Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon
              icon="tabler:notes"
              className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
            />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notes
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 tabular-nums">
              {processedNotes.length}{" "}
              {processedNotes.length === 1 ? "Note" : "Notes"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Icon
                icon="tabler:search"
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search notes..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
              />
            </div>

            <select
              aria-label="Filter notes by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-600"
            >
              <option value="all">Filter</option>
              {NOTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort notes"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest" | "pinned")
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-600"
            >
              <option value="newest">Sort: Newest</option>
              <option value="pinned">Sort: Pinned First</option>
              <option value="oldest">Sort: Oldest</option>
            </select>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8 animate-pulse">
              Loading notes...
            </p>
          ) : paginatedNotes.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              <Icon
                icon="tabler:notebook"
                className="w-8 h-8 mx-auto mb-2 opacity-50"
              />
              {notes.length === 0
                ? "No notes found for this record."
                : "No notes match your current search or filter."}
            </div>
          ) : (
            paginatedNotes.map((item) => {
              const plainText = getPlainText(item.description);
              const isLongText = plainText.length > 140;
              const isEditing = editingId === item.id;
              const noteCat = item.category || "General";

              return (
                <article
                  key={item.id}
                  className="relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left Icon + Subject + Body */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mt-0.5">
                        <Icon
                          icon={getCategoryIcon(noteCat)}
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                                  Subject
                                </label>
                                <input
                                  type="text"
                                  value={editingSubject}
                                  onChange={(e) =>
                                    setEditingSubject(e.target.value)
                                  }
                                  disabled={saving}
                                  maxLength={200}
                                  className={fieldClass}
                                  autoFocus
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                                  Category
                                </label>
                                <select
                                  value={editingCategory}
                                  onChange={(e) =>
                                    setEditingCategory(e.target.value)
                                  }
                                  disabled={saving}
                                  className={fieldClass}
                                >
                                  {NOTE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Description
                              </label>
                              <NotesRichEditor
                                value={editingDescriptionHtml}
                                onChange={(html) =>
                                  setEditingDescriptionHtml(html)
                                }
                                disabled={saving}
                                maxLength={2000}
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
                          <>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.subject}
                              </h4>
                              {item.is_pinned && (
                                <Icon
                                  icon="tabler:star-filled"
                                  className="w-3.5 h-3.5 text-amber-500 shrink-0"
                                />
                              )}
                            </div>

                            <div className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                              <div
                                className="prose prose-xs max-w-none dark:prose-invert line-clamp-2 inline"
                                dangerouslySetInnerHTML={{
                                  __html: item.description,
                                }}
                              />
                              {isLongText && (
                                <button
                                  type="button"
                                  onClick={() => setViewingNote(item)}
                                  className="ml-1.5 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center"
                                >
                                  Read More
                                </button>
                              )}
                            </div>

                            {/* Footer Meta: Initials + Author + Timestamp */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {getInitials(
                                  item.created_by_name || item.created_by,
                                )}
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {item.created_by_name ||
                                  (item.created_by
                                    ? `User ${item.created_by}`
                                    : "Unknown")}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">
                                |
                              </span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Icon
                                  icon="tabler:calendar-event"
                                  className="w-3.5 h-3.5 text-slate-400"
                                />
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Category Badge + Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeStyle(
                            noteCat,
                          )}`}
                        >
                          {noteCat}
                        </span>

                        {!readonly && item.id && (
                          <div className="relative flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePin(item)}
                              disabled={saving}
                              title={item.is_pinned ? "Unpin note" : "Pin note"}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Icon
                                icon={
                                  item.is_pinned
                                    ? "tabler:pin-filled"
                                    : "tabler:pin"
                                }
                                className="w-3.5 h-3.5"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              disabled={saving}
                              title="Edit note"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Icon icon="tabler:pencil" className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === item.id ? null : item.id || null,
                                )
                              }
                              disabled={saving}
                              title="More actions"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Icon icon="tabler:dots" className="w-3.5 h-3.5" />
                            </button>

                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161D] shadow-lg py-1 text-sm">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                >
                                  <Icon
                                    icon="tabler:pin"
                                    className="w-3.5 h-3.5 text-slate-400"
                                  />
                                  <span>
                                    {item.is_pinned ? "Unpin note" : "Pin note"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => startEditing(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                >
                                  <Icon
                                    icon="tabler:pencil"
                                    className="w-3.5 h-3.5 text-slate-400"
                                  />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleArchive(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                >
                                  <Icon
                                    icon="tabler:archive"
                                    className="w-3.5 h-3.5 text-slate-400"
                                  />
                                  <span>Archive</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                >
                                  <Icon
                                    icon="tabler:trash"
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 pt-3">
          <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            Showing{" "}
            {processedNotes.length === 0
              ? 0
              : (currentPage - 1) * rowsPerPage + 1}
            {"–"}
            {Math.min(currentPage * rowsPerPage, processedNotes.length)} of{" "}
            {processedNotes.length} notes
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                <Icon icon="tabler:chevron-left" className="w-3.5 h-3.5" />
              </Button>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white text-sm font-semibold tabular-nums">
                {currentPage}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                <Icon icon="tabler:chevron-right" className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* View Full Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <Icon
                    icon={getCategoryIcon(viewingNote.category)}
                    className="w-4 h-4"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {viewingNote.subject}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                <Icon icon="tabler:x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div
                className="text-sm leading-6 text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: viewingNote.description }}
              />
            </div>

            <div className="flex justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
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


      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
    
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

 
            <div className="p-6 overflow-y-auto space-y-4">
              <div
                className="text-xs leading-6 text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: viewingNote.description }}
              />
            </div>


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
} */

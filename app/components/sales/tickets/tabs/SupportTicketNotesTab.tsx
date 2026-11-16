// tabs/SupportTicketNotesTab.tsx

"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import type { TicketNote } from "@/types/support-ticket";

interface Props {
  ticketNo: string;
  notes: TicketNote[];
  onChange: (notes: TicketNote[]) => void;
  defaultAuthor?: string;
  disabled?: boolean;
}

const inputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

function formatNoteDate(value: string): string {
  if (!value) return "Date unavailable";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function SupportTicketNotesTab({
  ticketNo,
  notes,
  onChange,
  defaultAuthor = "Current User",
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return notes;

    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.author.toLowerCase().includes(query)
      );
    });
  }, [notes, search]);

  const addNote = () => {
    if (!content.trim()) {
      toast.error("Please enter the note content.");
      return;
    }

    const newNote: TicketNote = {
      ticket_no: ticketNo,
      author: defaultAuthor || "Current User",
      title: title.trim() || "General Note Entry",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    onChange([newNote, ...notes]);

    setTitle("");
    setContent("");

    toast.success("Note added. Save the ticket to persist it.");
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon
              icon="lucide:message-square-plus"
              className="h-4 w-4 text-emerald-600"
            />
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Add Note
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Record an update or communication for this ticket.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <input
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Note title"
            disabled={disabled}
          />

          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your note..."
            disabled={disabled}
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:disabled:bg-slate-900"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={addNote}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon="lucide:plus" className="h-4 w-4" />
              Add Note
            </button>
          </div>
        </div>
      </section>

      {/* Note history */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Notes History
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {notes.length} note{notes.length === 1 ? "" : "s"} recorded
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
            />
            <input
              className={`${inputClass} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes..."
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredNotes.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Icon
                icon="lucide:messages-square"
                className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700"
              />
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {search ? "No matching notes found." : "No notes recorded yet."}
              </p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <article
                key={note.id || `${note.timestamp}-${index}`}
                className="p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {note.title || "General Note Entry"}
                      </h4>

                      {!note.id && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          Not saved yet
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {ticketNo || "New Ticket"} · {note.author || "Unknown"}
                    </p>
                  </div>

                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatNoteDate(note.timestamp)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {note.content}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

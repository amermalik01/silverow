// app/components/common/NotesWidget.tsx

"use client";

import { useEffect, useState, useCallback } from "react";

type Props = {
  module: string;
  recordId: string;
};

type Note = {
  id: string;
  note: string;
  created_at: string;
};

export default function NotesWidget({ module, recordId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notes?module=${module}&record_id=${recordId}`,
      );
      if (!res.ok) throw new Error("API downstream response reading failure");
      const result = await res.json();
      setNotes(result.data || []); // Fixed direct context setting to object child wrapper block
    } catch (err) {
      console.error("Notes processing thread error:", err);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = async () => {
    if (!noteText.trim()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, record_id: recordId, note: noteText }),
      });

      if (!res.ok) throw new Error("Failed to save note record interface");

      setNoteText("");
      await loadNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note permanently?")) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Mutation rejected");
      await loadNotes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 border rounded p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a clear transactional progress record note..."
        className="border p-2 rounded w-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        rows={3}
      />
      <button
        onClick={addNote}
        disabled={loading || !noteText.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded transition disabled:opacity-50"
      >
        {loading ? "Saving..." : "Add Note"}
      </button>

      <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No notes linked to this workflow entity.
          </p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="border p-3 rounded bg-gray-50 flex justify-between items-start group"
            >
              <div className="space-y-1 max-w-[85%]">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {n.note}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";

type Props = {
  module: string;
  recordId: string;
};

type Note = {
  id: string;
  note: string;
  created_at: string;
};

export default function NotesWidget({ module, recordId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadNotes = async () => {
    const res = await fetch(
      `/api/notes?module=${module}&record_id=${recordId}`,
    );

    const data = await res.json();

    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, [module, recordId]);

  const addNote = async () => {
    if (!noteText.trim()) return;

    try {
      setLoading(true);

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          module,
          record_id: recordId,
          note: noteText,
        }),
      });

      if (!res.ok) throw new Error("Failed to save note");

      setNoteText("");

      loadNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Notes</h3>

      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a note..."
        className="border p-2 rounded w-full"
      />

      <button
        onClick={addNote}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Saving..." : "Add Note"}
      </button>

      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="border p-3 rounded bg-gray-50">
            <p>{n.note}</p>

            <p className="text-xs text-gray-500">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} */

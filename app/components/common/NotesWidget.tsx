// app/components/common/NotesWidget.tsx
"use client";

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
}

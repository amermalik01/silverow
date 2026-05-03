// app/components/shared/NotesTab.tsx

"use client";

import { useEffect, useState } from "react";

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
};

export default function NotesTab({
  module,
  recordId,
  readonly = false,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [note, setNote] = useState("");

  const loadNotes = async () => {
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
  };

  useEffect(() => {
    loadNotes();
  }, [module, recordId]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/notes", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          module,
          record_id: recordId,
          note,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed");
      }

      setNote("");

      await loadNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!readonly && (
        <div className="border rounded p-4 space-y-4">
          <h2 className="font-semibold text-lg">Add Note</h2>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border p-2 rounded w-full"
            rows={5}
            placeholder="Write note..."
          />

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !note}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Notes</h2>

        {loading ? (
          <p>Loading notes...</p>
        ) : notes.length === 0 ? (
          <p>No notes found</p>
        ) : (
          notes.map((item) => (
            <div key={item.id} className="border rounded p-4">
              <p>{item.note}</p>

              {item.created_at && (
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

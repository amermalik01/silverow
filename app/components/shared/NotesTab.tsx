// app/components/shared/NotesTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";

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
      {!readonly && (
        <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-semibold text-xs text-slate-400 capitalize tracking-wider">
            Internal Activity Journal
          </h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg w-full text-xs bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100"
            rows={4}
            placeholder="Log conversation minutes, compliance milestones or remarks..."
          />
          <button
            onClick={handleSave}
            disabled={saving || !note.trim()}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition-all disabled:opacity-40"
          >
            {saving ? "Posting..." : "Append Note Entry"}
          </button>
        </div>
      )}

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
}

/* "use client";

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
} */

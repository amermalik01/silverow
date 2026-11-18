// app/components/crm/prospects/tabs/ProspectNotesTab.tsx

"use client";

type NoteInput = {
  id?: string | null;
  title: string;
  content: string;
};

type Props = {
  notes: NoteInput[];
  onChange: (notes: NoteInput[]) => void;
};

export default function ProspectNotesTab({ notes, onChange }: Props) {
  const update = (index: number, field: keyof NoteInput, value: string) => {
    onChange(
      notes.map((note, currentIndex) =>
        currentIndex === index ? { ...note, [field]: value } : note,
      ),
    );
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Notes</h3>
          <p className="text-xs text-slate-500">
            Keep useful information about this prospect.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...notes, { title: "", content: "" }])}
          className="rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
        >
          + Add Note
        </button>
      </div>

      <div className="space-y-3">
        {notes.map((note, index) => (
          <div
            key={note.id || `note-${index}`}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Note {index + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    notes.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
                className="text-xs font-medium text-rose-600"
              >
                Remove
              </button>
            </div>
            <input
              value={note.title}
              onChange={(event) => update(index, "title", event.target.value)}
              className="mb-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Note title"
            />
            <textarea
              rows={3}
              value={note.content}
              onChange={(event) => update(index, "content", event.target.value)}
              className="w-full rounded-md border border-slate-300 p-3 text-sm"
              placeholder="Write your note..."
            />
          </div>
        ))}
      </div>
    </section>
  );
}

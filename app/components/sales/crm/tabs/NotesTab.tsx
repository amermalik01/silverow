// app/components/sales/crm/tabs/NotesTab.tsx
"use client";

import { useState } from "react";

export default function NotesTab({
  module,
  recordId,
}: {
  module: string;
  recordId: string | undefined;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write a note..."
        className="border p-2 rounded w-full"
      />

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Save Note
      </button>
    </div>
  );
}

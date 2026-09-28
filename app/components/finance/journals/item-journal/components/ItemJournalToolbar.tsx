// app/components/finance/journals/item-journal/components/ItemJournalToolbar.tsx

"use client";

import React from "react";

import { Button } from "@/components/ui/button";

type Props = {
  entryNo: string;
  formDisabled: boolean;
  onAddLine: () => void;
};

export default function ItemJournalToolbar({
  entryNo,
  formDisabled,
  onAddLine,
}: Props) {
  return (
    <div className="flex justify-between items-center bg-zinc-50 dark:bg-slate-800 p-3 rounded border border-zinc-200 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          Journal No.
        </span>

        <input
          type="text"
          readOnly
          className="border bg-zinc-100 dark:bg-slate-700 p-1 px-2 rounded w-36 font-bold outline-none text-zinc-700 dark:text-zinc-100 text-sm"
          value={entryNo || "Draft"}
        />
      </div>

      {!formDisabled && (
        <Button
          type="button"
          onClick={onAddLine}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
        >
          + Add Line
        </Button>
      )}
    </div>
  );
}

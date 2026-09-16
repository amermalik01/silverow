// app/components/setup/SetupDataGridHeader.tsx

"use client";

import { Icon } from "@iconify/react";

interface SetupDataGridHeaderProps {
  title: string;
  recordCount: number;
}

export default function SetupDataGridHeader({
  title,
  recordCount,
}: SetupDataGridHeaderProps) {
  return (
    <div
      className="
        flex
        flex-col
        gap-3
        border-b
        border-slate-200
        bg-slate-50/60
        px-4
        py-4
        sm:flex-row
        sm:items-center
        sm:justify-between
        dark:border-slate-800
        dark:bg-slate-950/30
      "
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
          Create, edit and manage {title.toLowerCase()}.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
        <Icon icon="solar:database-linear" width={14} height={14} />
        {recordCount} {recordCount === 1 ? "Record" : "Records"}
      </div>
    </div>
  );
}

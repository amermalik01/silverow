// app/components/setup/SetupDataGridError.tsx

"use client";

import { Icon } from "@iconify/react";

interface SetupDataGridErrorProps {
  message: string | null;
  onClose: () => void;
}

export default function SetupDataGridError({
  message,
  onClose,
}: SetupDataGridErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="
        mx-4
        mt-4
        flex
        items-start
        gap-2
        rounded-lg
        border
        border-red-200
        bg-red-50
        px-3
        py-2.5
        text-xs
        text-red-700
        dark:border-red-900/50
        dark:bg-red-950/20
        dark:text-red-400
      "
    >
      <Icon
        icon="solar:danger-circle-linear"
        width={16}
        height={16}
        className="mt-0.5 shrink-0"
      />

      <span className="min-w-0 flex-1">{message}</span>

      <button
        type="button"
        onClick={onClose}
        className="
          shrink-0
          rounded
          p-0.5
          text-red-500
          hover:bg-red-100
          dark:hover:bg-red-900/30
        "
        aria-label="Dismiss error"
      >
        <Icon icon="solar:close-circle-linear" width={15} height={15} />
      </button>
    </div>
  );
}

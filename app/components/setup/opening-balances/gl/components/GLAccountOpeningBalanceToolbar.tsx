// app/components/setup/opening-balances/gl/components/GLAccountOpeningBalanceToolbar.tsx

"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;
  submitting: boolean;
  posting: boolean;
  hasLines: boolean;
  hasUnpostedLines: boolean;
  onAddLine: () => void;
  onRefresh: () => void;
};

export default function GLAccountOpeningBalanceToolbar({
  loading,
  submitting,
  posting,
  hasLines,
  hasUnpostedLines,
  onAddLine,
  onRefresh,
}: Props) {
  const disabled = loading || submitting || posting;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Opening Balance Entries
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Select posting accounts and enter opening debit or credit balances.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={disabled}
          className="text-xs"
        >
          <Icon icon="solar:refresh-linear" width={15} className="mr-1" />
          Refresh
        </Button>

        <Button
          type="button"
          onClick={onAddLine}
          disabled={disabled}
          variant="add_line"
        >
          <Icon icon="solar:add-circle-linear" width={16} className="mr-1" />
          Add Line
        </Button>

        {hasLines && (
          <span className="rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {hasUnpostedLines ? "Draft / unposted" : "All posted"}
          </span>
        )}
      </div>
    </div>
  );
}
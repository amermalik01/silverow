// app/components/setup/opening-balances/gl/components/GLAccountOpeningBalanceSummary.tsx

"use client";

import { Button } from "@/components/ui/button";

type Props = {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  totalLines: number;
  unpostedCount: number;
  loading: boolean;
  submitting: boolean;
  posting: boolean;
  onSave: () => void;
  onPost: () => void;
  onCancel: () => void;
};

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GLAccountOpeningBalanceSummary({
  totalDebit,
  totalCredit,
  difference,
  totalLines,
  unpostedCount,
  loading,
  submitting,
  posting,
  onSave,
  onPost,
  onCancel,
}: Props) {
  const busy = loading || submitting || posting;
  const balanced = Math.abs(difference) < 0.005;

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500">Total Lines</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {totalLines}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500">Total Debit</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {formatAmount(totalDebit)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500">Total Credit</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {formatAmount(totalCredit)}
          </p>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            balanced
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
          }`}
        >
          <p className="text-xs text-slate-500">
            {balanced ? "Journal Balanced" : "Difference"}
          </p>
          <p
            className={`mt-1 text-lg font-bold ${
              balanced
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {formatAmount(Math.abs(difference))}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          onClick={onPost}
          disabled={busy || totalLines === 0 || unpostedCount === 0}
          variant="save"
        >
          {posting ? "Posting..." : "Post"}
        </Button>

        <Button
          type="button"
          onClick={onSave}
          disabled={busy || totalLines === 0 || unpostedCount === 0}
          variant="save"
        >
          {submitting ? "Saving..." : "Save"}
        </Button>

        <Button
          type="button"
          variant="cancel"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Save opening balance entries before posting. Posted entries cannot be
        edited or deleted here; use your authorized reversal process.
      </p>
    </div>
  );
}

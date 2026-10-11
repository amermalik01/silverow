// app/components/setup/opening-balances/stock/components/StockOpeningBalanceSummary.tsx

"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

type Props = {
  totalAmount: number;
  totalLines: number;
  unpostedCount: number;
  loading: boolean;
  submitting: boolean;
  posting: boolean;
  onSave: () => void;
  onPost: () => void;
  onCancel: () => void;
};

export default function StockOpeningBalanceSummary({
  totalAmount,
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

  const formattedTotal = totalAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500">Total Lines</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {totalLines}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-500">Unposted Lines</p>
          <p className="mt-1 text-lg font-bold text-amber-600">
            {unpostedCount}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-xs text-slate-500">Total Stock Value</p>
          <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {formattedTotal}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
          className="text-xs"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={onSave}
          disabled={busy || totalLines === 0 || unpostedCount === 0}
          className="bg-slate-700 text-xs text-white hover:bg-slate-800"
        >
          <Icon icon="solar:diskette-linear" width={15} className="mr-1" />
          {submitting ? "Saving..." : "Save Opening Balances"}
        </Button>

        <Button
          type="button"
          onClick={onPost}
          disabled={busy || totalLines === 0 || unpostedCount === 0}
          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
        >
          <Icon icon="solar:check-circle-linear" width={15} className="mr-1" />
          {posting ? "Posting..." : "Post to Ledger"}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Save your opening balances before posting. Posted entries should be
        corrected through your authorized reversal process.
      </p>
    </div>
  );
}

// app/components/setup/opening-balances/stock/components/StockOpeningBalanceToolbar.tsx

"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;
  submitting: boolean;
  posting: boolean;
  hasLines: boolean;
  hasUnpostedLines: boolean;
  onSelectItems: () => void;
  onRefresh: () => void;
};

export default function StockOpeningBalanceToolbar({
  loading,
  submitting,
  posting,
  hasLines,
  hasUnpostedLines,
  onSelectItems,
  onRefresh,
}: Props) {
  const disabled = loading || submitting || posting;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">


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
          onClick={onSelectItems}
          disabled={disabled}
          variant="add_line"
        >
          Select Items
        </Button>

        {hasLines && (
          <span className="rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {hasUnpostedLines ? "Draft / unposted" : "All posted"}
          </span>
        )}
      </div>
    </div>
  );
}      {/* <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Stock Opening Balances
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add and value your initial inventory.
        </p>
      </div> */}
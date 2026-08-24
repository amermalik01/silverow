// app/components/purchases/purchase-orders/PurchaseOrderStatusBadge.tsx

import React from "react";

interface Props {
  status?: string;
  className?: string;
}

export default function PurchaseOrderStatusBadge({ status, className = "" }: Props) {
  const displayStatus = status?.trim() || "Draft";

  return (
    <span
      title={displayStatus}
      className={`inline-flex items-center justify-center max-w-[140px] px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border whitespace-nowrap overflow-hidden text-ellipsis transition-colors shadow-xs ${
        "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-750"
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0 mr-1.5" />
      <span className="truncate">{displayStatus}</span>
    </span>
  );
}

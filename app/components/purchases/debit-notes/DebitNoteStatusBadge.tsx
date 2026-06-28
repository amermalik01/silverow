// app/components/purchases/debit-notes/DebitNoteStatusBadge.tsx
"use client";

type BadgeProps = {
  status?: string;
};

export default function DebitNoteStatusBadge({ status }: BadgeProps) {
  const normalized = status?.toLowerCase() || "draft";
  
  let styles = "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300";
  if (normalized === "open" || normalized === "posted") {
    styles = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400";
  } else if (normalized === "cancelled") {
    styles = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles}`}>
      {normalized}
    </span>
  );
}
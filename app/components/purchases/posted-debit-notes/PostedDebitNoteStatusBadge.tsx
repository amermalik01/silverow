// app/components/purchases/posted-debit-notes/PostedDebitNoteStatusBadge.tsx

import { DebitNoteStatus } from "@/types/debit-note";

type Props = {
  status?: DebitNoteStatus;
};

export default function PostedDebitNoteStatusBadge({ status }: Props) {
  const normalized = status?.toLowerCase() || "draft";

  let styles = "bg-gray-100 border-gray-300 text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";

  if (normalized === "posted") {
    styles = "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400";
  } else if (normalized === "cancelled") {
    styles = "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 border rounded-full text-xs font-medium capitalize ${styles}`}>
      {normalized}
    </span>
  );
}
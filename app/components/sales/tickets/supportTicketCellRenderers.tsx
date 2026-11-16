// app/components/sales/tickets/supportTicketCellRenderers.tsx

import Link from "next/link";

import type { SupportTicketListRecord } from "@/lib/services/sales/support-ticket/support-ticket.service";

type Props = {
  ticket: SupportTicketListRecord;
  columnKey: string;
  slug: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  const parts = value.slice(0, 10).split("-");

  if (parts.length !== 3) return value;

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    Open: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    "In Progress":
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    "Waiting Return":
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    Repair:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    Closed:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
        styles[stage] ??
        "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {stage || "Unknown"}
    </span>
  );
}

export function supportTicketCellRenderer({
  ticket,
  columnKey,
  slug,
}: Props): React.ReactNode {
  switch (columnKey) {
    case "open_date":
      return (
        <span className="whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
          {formatDate(ticket.open_date)}
        </span>
      );

    case "close_date":
      return (
        <span className="whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
          {formatDate(ticket.close_date)}
        </span>
      );

    case "ticket_no":
      return (
        <Link
          href={`/${slug}/sales/support-ticket/${ticket.ticket_no}`}
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          onClick={(event) => event.stopPropagation()}
        >
          {ticket.ticket_no}
        </Link>
      );

    case "customer_name":
      return (
        <span
          className="block max-w-[220px] truncate font-medium text-slate-800 dark:text-slate-200"
          title={ticket.customer_name}
        >
          {ticket.customer_name || "-"}
        </span>
      );

    case "status":
      return <StageBadge stage={ticket.status} />;

    case "docs_attached":
      return (
        <span className="inline-flex min-w-8 justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {ticket.docs_attached}
        </span>
      );

    case "apply_to_si":
      return (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {ticket.apply_to_si || "-"}
        </span>
      );

    case "apply_to_item":
      return (
        <span
          className="block max-w-[240px] truncate text-slate-600 dark:text-slate-300"
          title={ticket.apply_to_item || ""}
        >
          {ticket.apply_to_item || "-"}
        </span>
      );

    case "ref_no":
      return (
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
          {ticket.ref_no || "-"}
        </span>
      );

    case "batch_frame_no":
      return (
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
          {ticket.batch_frame_no || "-"}
        </span>
      );

    case "cust_order_no":
      return (
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
          {ticket.cust_order_no || "-"}
        </span>
      );

    case "city":
      return (
        <span className="text-slate-600 dark:text-slate-300">
          {ticket.city || "-"}
        </span>
      );

    default:
      return undefined;
  }
}
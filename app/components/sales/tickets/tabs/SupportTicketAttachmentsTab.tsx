// tabs/SupportTicketAttachmentsTab.tsx

"use client";

import { Icon } from "@iconify/react";
import AttachmentsTab from "@/app/components/shared/AttachmentsTab";

interface Props {
  ticketId?: string;
  readonly?: boolean;
  onRequestEdit?: () => void;
}

export default function SupportTicketAttachmentsTab({
  ticketId,
  readonly = false,
  onRequestEdit,
}: Props) {
  if (!ticketId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <Icon
          icon="lucide:paperclip"
          className="mx-auto h-8 w-8 text-slate-400"
        />

        <h3 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Save the support ticket first
        </h3>

        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
          Attachments can be uploaded after the ticket has been saved and a
          ticket number has been generated.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <Icon icon="lucide:paperclip" className="h-4 w-4 text-emerald-600" />

        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Ticket Attachments
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Documents and images associated with this support ticket.
          </p>
        </div>
      </div>

      <AttachmentsTab
        module="support_ticket"
        recordId={ticketId}
        readonly={readonly}
        onRequestEdit={onRequestEdit}
      />
    </div>
  );
}

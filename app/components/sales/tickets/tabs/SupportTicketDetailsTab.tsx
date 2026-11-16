// tabs/SupportTicketDetailsTab.tsx

"use client";

import { Icon } from "@iconify/react";
import type { SupportTicket } from "@/types/support-ticket";

interface Props {
  ticket: SupportTicket;
  onChange: <K extends keyof SupportTicket>(
    field: K,
    value: SupportTicket[K],
  ) => void;
}

const inputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

const sectionClass =
  "rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950";

function DocumentReference({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <div className="flex gap-1.5">
        <input
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />

        <button
          type="button"
          disabled
          title="Document lookup is not connected yet"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900"
        >
          <Icon icon="lucide:external-link" className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onChange("")}
          title={`Clear ${label}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/40"
        >
          <Icon icon="lucide:rotate-ccw" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SupportTicketDetailsTab({ ticket, onChange }: Props) {
  return (
    <div className="space-y-4">
      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:workflow" className="h-4 w-4 text-emerald-600" />
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Related Documents
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Link this support ticket to related ERP documents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DocumentReference
            label="Sales Order"
            value={ticket.link_to_so}
            onChange={(value) => onChange("link_to_so", value)}
            placeholder="Enter sales order reference"
          />

          <DocumentReference
            label="Purchase Order"
            value={ticket.link_to_po}
            onChange={(value) => onChange("link_to_po", value)}
            placeholder="Enter purchase order reference"
          />

          <DocumentReference
            label="Credit Note"
            value={ticket.link_to_cn}
            onChange={(value) => onChange("link_to_cn", value)}
            placeholder="Enter credit note reference"
          />
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:align-left" className="h-4 w-4 text-emerald-600" />
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              General Description
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Describe the reported issue, investigation and required action.
            </p>
          </div>
        </div>

        <textarea
          rows={9}
          value={ticket.general_description}
          onChange={(event) =>
            onChange("general_description", event.target.value)
          }
          placeholder="Enter the issue description and any relevant details..."
          className="w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        />
      </section>
    </div>
  );
}

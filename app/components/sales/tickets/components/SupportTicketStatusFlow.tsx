// components/SupportTicketStatusFlow.tsx

"use client";

import { Icon } from "@iconify/react";
import type { TicketStage } from "@/types/support-ticket";

interface Props {
  status: TicketStage;
  disabled?: boolean;
  onChange: (stage: TicketStage) => void;
}

const stages: TicketStage[] = [
  "Open",
  "In Progress",
  "Waiting Return",
  "Repair",
  "Closed",
];

export default function SupportTicketStatusFlow({
  status,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
      {stages.map((stage, index) => {
        const active = status === stage;
        const completed = stages.indexOf(status) > index;

        return (
          <div key={stage} className="flex items-center">
            <button
              type="button"
              disabled={disabled || active}
              onClick={() => onChange(stage)}
              aria-current={active ? "step" : undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2",
                "text-[11px] font-semibold transition-all",
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : completed
                    ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              {completed && !active && (
                <Icon icon="lucide:check" className="h-3.5 w-3.5" />
              )}

              {stage}
            </button>

            {index < stages.length - 1 && (
              <Icon
                icon="lucide:chevron-right"
                className="mx-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

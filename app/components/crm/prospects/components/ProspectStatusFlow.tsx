// app/components/crm/prospects/components/ProspectStatusFlow.tsx

"use client";

import type { Prospect } from "@/types/prospect";

type Props = {
  status: Prospect["status"];
  onChange: (status: Prospect["status"]) => void;
};

const statuses: Prospect["status"][] = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Converted",
];

export default function ProspectStatusFlow({ status, onChange }: Props) {
  const activeIndex = statuses.indexOf(status);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-[680px] items-center">
        {statuses.map((item, index) => {
          const completed = activeIndex >= 0 && index <= activeIndex;
          const current = item === status;

          return (
            <div key={item} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={status === "Converted" || item === "Converted"}
                onClick={() => onChange(item)}
                className="flex flex-col items-center gap-1 disabled:cursor-not-allowed"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                    current
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : completed
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {completed && !current ? "✓" : index + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-xs ${current ? "font-semibold text-emerald-800" : "text-slate-500"}`}
                >
                  {item}
                </span>
              </button>
              {index < statuses.length - 1 && (
                <div
                  className={`mx-2 mb-5 h-0.5 flex-1 ${completed && index < activeIndex ? "bg-emerald-500" : "bg-slate-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>
      {status === "Lost" && (
        <p className="mt-2 text-xs font-medium text-rose-600">
          This prospect has been marked as lost.
        </p>
      )}
    </div>
  );
}

// app/components/crm/prospects/components/ProspectSalesInformation.tsx


"use client";

import { Icon } from "@iconify/react";
import type { Prospect } from "@/types/prospect";
import NumericTextInput from "@/components/ui/NumericTextInput";

type Props = {
  status: Prospect["status"];
  source: NonNullable<Prospect["source"]>;
  priority: Prospect["priority"];
  assignedToName: string;
  estimatedDealValue: string;
  currencyCode: string;
  lostReason: string;
  onStatusChange: (value: Prospect["status"]) => void;
  onSourceChange: (value: NonNullable<Prospect["source"]>) => void;
  onPriorityChange: (value: Prospect["priority"]) => void;
  onAssignedToClick: () => void;
  onDealValueChange: (value: string) => void;
  onLostReasonChange: (value: string) => void;
  /** Item names from the primary price offer. */
  interestedProducts?: string[];
  /** False until the prospect has been saved. */
  productsEnabled?: boolean;
  /** Opens the item picker in the Pricing tab. */
  onManageProducts?: () => void;
  /** View mode: all fields disabled. */
  readOnly?: boolean;
};

const selectClass =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-default disabled:opacity-100 disabled:bg-slate-50";

const labelClass = "text-sm text-slate-800";

export default function ProspectSalesInformation({
  status,
  source,
  priority,
  assignedToName,
  estimatedDealValue,
  currencyCode,
  lostReason,
  onStatusChange,
  onSourceChange,
  onPriorityChange,
  onAssignedToClick,
  onDealValueChange,
  onLostReasonChange,
  interestedProducts = [],
  productsEnabled = false,
  onManageProducts,
  readOnly = false,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Icon
          icon="iconmind:sale-tag-outline-thin"
          className="text-emerald-600 text-2xl"
        />
        <h2 className="text-base font-bold text-slate-900">
          Sales Information
        </h2>
      </div>

      <fieldset
        disabled={readOnly}
        className="grid min-w-0 grid-cols-1 items-center gap-x-3 gap-y-2 p-5 sm:grid-cols-[135px_minmax(0,1fr)]"
      >
        <label className={labelClass}>
          Status <span className="text-rose-600">*</span>
        </label>

        <select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as Prospect["status"])
          }
          className={`${selectClass} border-emerald-200 bg-emerald-50 font-medium text-emerald-800`}
        >
          {[
            "New",
            "Contacted",
            "Interested",
            "Qualified",
            "Proposal",
            "Negotiation",
            "Lost",
          ].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className={labelClass}>Source</label>

        <select
          value={source}
          onChange={(event) =>
            onSourceChange(
              event.target.value as NonNullable<Prospect["source"]>,
            )
          }
          className={selectClass}
        >
          {[
            "Website",
            "Referral",
            "Social Media",
            "Email Campaign",
            "Cold Call",
            "Trade Show",
            "Advertisement",
            "Other",
          ].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className={labelClass}>Priority</label>

        <select
          value={priority}
          onChange={(event) =>
            onPriorityChange(
              event.target.value as Prospect["priority"],
            )
          }
          className={selectClass}
        >
          {["Low", "Medium", "High"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className={labelClass}>Assigned To</label>

        <div className="flex min-w-0 gap-1">
          <input
            readOnly
            value={assignedToName}
            placeholder="Select Person..."
            className={selectClass}
          />

          <button
            type="button"
            onClick={onAssignedToClick}
            title="Select salesperson"
            className="flex h-8 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-emerald-700 hover:bg-emerald-50"
          >
            <Icon icon="lucide:external-link" className="text-lg" />
          </button>
        </div>

        <label className={labelClass}>
          Estimated Deal Value ({currencyCode})
        </label>

        <NumericTextInput
          value={Number(estimatedDealValue) || 0}
          allowDecimals
          decimalScale={2}
          className="h-8 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 focus:border-emerald-600"
          onChange={(value) => onDealValueChange(String(value))}
        />

        <label className={`${labelClass} self-start pt-1.5`}>
          Interested Products
        </label>

        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1">
          {interestedProducts.map((name) => (
            <span
              key={name}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
            >
              {name}
            </span>
          ))}

          {readOnly ? (
            interestedProducts.length === 0 && (
              <span className="text-xs text-slate-400">—</span>
            )
          ) : productsEnabled ? (
            <button
              type="button"
              onClick={onManageProducts}
              className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Icon icon="lucide:plus" />
              {interestedProducts.length ? "Add" : "Select products"}
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Save the prospect to add products
            </span>
          )}
        </div>

        {status === "Lost" && (
          <>
            <label className={labelClass}>
              Lost Reason <span className="text-rose-600">*</span>
            </label>

            <textarea
              value={lostReason}
              onChange={(event) =>
                onLostReasonChange(event.target.value)
              }
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-emerald-600"
              placeholder="Enter reason..."
            />
          </>
        )}
      </fieldset>
    </div>
  );
}

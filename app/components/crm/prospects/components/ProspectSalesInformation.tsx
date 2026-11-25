// app/components/crm/prospects/components/ProspectSalesInformation.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import type { Prospect } from "@/types/prospect";

type InterestedProductChip = {
  item_id: string | null;
  item_code: string | null;
  item_name: string;
};

type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type PostingGroupOption = {
  id: string;
  name: string;
};

type Props = {
  status: Prospect["status"];
  source: NonNullable<Prospect["source"]>;
  priority: Prospect["priority"];
  assignedToName: string;
  estimatedDealValue: string;
  currencyCode: string;
  /** Company currencies (same list as the parties Finance tab). */
  currencies?: CurrencyOption[];
  currencyId?: string;
  onCurrencyChange?: (value: string) => void;
  /** VAT business posting groups (parties Finance tab "Posting Group"). */
  postingGroups?: PostingGroupOption[];
  vatBusinessGroupId?: string;
  onPostingGroupChange?: (value: string) => void;
  lostReason: string;
  onStatusChange: (value: Prospect["status"]) => void;
  onSourceChange: (value: NonNullable<Prospect["source"]>) => void;
  onPriorityChange: (value: Prospect["priority"]) => void;
  onAssignedToClick: () => void;
  onDealValueChange: (value: string) => void;
  onLostReasonChange: (value: string) => void;
  /** Interested products — separate from pricing offers. */
  interestedProducts?: InterestedProductChip[];
  /** Kept for compatibility; products can be added before the first save. */
  productsEnabled?: boolean;
  /** Opens the product picker. */
  onManageProducts?: () => void;
  /** Removes a product from the list (edit mode). */
  onRemoveProduct?: (itemId: string | null, index: number) => void;
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
  currencies = [],
  currencyId = "",
  onCurrencyChange,
  postingGroups = [],
  vatBusinessGroupId = "",
  onPostingGroupChange,
  lostReason,
  onStatusChange,
  onSourceChange,
  onPriorityChange,
  onAssignedToClick,
  onDealValueChange,
  onLostReasonChange,
  interestedProducts = [],
  onManageProducts,
  onRemoveProduct,
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
            onPriorityChange(event.target.value as Prospect["priority"])
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

        <label className={labelClass}>Currency</label>

        <div>
          <select
            value={currencyId}
            onChange={(event) => onCurrencyChange?.(event.target.value)}
            className={selectClass}
          >
            <option value="">Select Currency...</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.code} - {currency.name}
                {currency.is_base ? " (Base)" : ""}
              </option>
            ))}
          </select>
          {!readOnly &&
            (() => {
              const selected = currencies.find((c) => c.id === currencyId);
              return selected && !selected.is_base ? (
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                  Rate: {selected.exchange_rate}
                </p>
              ) : null;
            })()}
        </div>

        <label className={labelClass}>Posting Group</label>

        <select
          value={vatBusinessGroupId}
          onChange={(event) => onPostingGroupChange?.(event.target.value)}
          className={selectClass}
        >
          <option value="">Select Posting Group</option>
          {postingGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <label className={labelClass}>Estimated Deal Value</label>

        <DealValueInput
          value={estimatedDealValue}
          currencyCode={currencyCode}
          onChange={onDealValueChange}
        />

        <label className={`${labelClass} self-start pt-1.5`}>
          Interested Products
        </label>

        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1">
          {interestedProducts.map((product, index) => (
            <span
              key={product.item_id ?? `${product.item_name}-${index}`}
              title={[product.item_code, product.item_name]
                .filter(Boolean)
                .join(" · ")}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-emerald-50 py-0.5 pl-2 pr-1 text-xs font-medium text-emerald-800"
            >
              {product.item_code && (
                <span className="font-semibold text-emerald-900">
                  {product.item_code}
                </span>
              )}
              {product.item_code && <span className="text-emerald-400">·</span>}
              <span className="truncate">{product.item_name}</span>

              {!readOnly && onRemoveProduct && (
                <button
                  type="button"
                  onClick={() => onRemoveProduct(product.item_id, index)}
                  title="Remove product"
                  aria-label={`Remove ${product.item_name}`}
                  className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                >
                  <Icon icon="lucide:x" className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {readOnly ? (
            interestedProducts.length === 0 && (
              <span className="text-xs text-slate-400">—</span>
            )
          ) : (
            <button
              type="button"
              onClick={onManageProducts}
              className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Icon icon="lucide:plus" />
              {interestedProducts.length ? "Add" : "Select products"}
            </button>
          )}
        </div>

        {status === "Lost" && (
          <>
            <label className={labelClass}>
              Lost Reason <span className="text-rose-600">*</span>
            </label>

            <textarea
              value={lostReason}
              onChange={(event) => onLostReasonChange(event.target.value)}
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

/* ============================================================
   DEAL VALUE INPUT — currency sign + thousand separators
============================================================ */

function currencySymbol(code: string): string {
  try {
    return (
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}

function formatGrouped(value: string): string {
  const number = Number(value);
  if (!value || Number.isNaN(number)) return "";
  return number.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DealValueInput({
  value,
  currencyCode,
  onChange,
}: {
  value: string;
  currencyCode: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600">
        {currencySymbol(currencyCode)}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? text : formatGrouped(value)}
        placeholder="0.00"
        onFocus={() => {
          const number = Number(value);
          setText(number ? String(number) : "");
          setFocused(true);
        }}
        onChange={(event) => {
          /* digits, one dot, max 2 decimals; commas typed are ignored */
          const cleaned = event.target.value.replace(/,/g, "");
          if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return;
          setText(cleaned);
          onChange(cleaned === "" || cleaned === "." ? "0" : cleaned);
        }}
        onBlur={() => setFocused(false)}
        className="h-8 w-full rounded-md border border-slate-300 bg-white pl-6 pr-3 text-left text-sm tabular-nums text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-default disabled:bg-slate-50"
      />
    </div>
  );
}

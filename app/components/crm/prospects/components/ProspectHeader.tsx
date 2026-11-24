// app/components/crm/prospects/components/ProspectHeader.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

type Props = {
  companyName: string;
  prospectNo?: string;
  status: string;
  contactName?: string;
  /** True for an existing (saved) prospect. */
  isEdit: boolean;
  /** True while the form is in edit mode (always true for a new prospect). */
  isEditing: boolean;
  /** True when the prospect has been converted to a customer. */
  isConverted?: boolean;
  saving: boolean;
  onCompanyNameChange: (value: string) => void;
  onBack: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onLogActivity: () => void;
  onConvert: () => void;
  onViewCustomer?: () => void;
  onSave: () => void;
  onClose: () => void;
};

export default function ProspectHeader({
  companyName,
  prospectNo,
  status,
  contactName,
  isEdit,
  isEditing,
  isConverted = false,
  saving,
  onCompanyNameChange,
  onBack,
  onEdit,
  onCancelEdit,
  onLogActivity,
  onConvert,
  onViewCustomer,
  onSave,
  onClose,
}: Props) {
  const [editingNameState, setEditingName] = useState(false);
  const editingName = isEditing && editingNameState;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* <div className="flex h-12 items-center gap-3 bg-emerald-800 px-5 text-white">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-100"
        >
          <Icon icon="lucide:arrow-left" className="text-xl" />
          Prospect Details
        </button>
      </div> */}

      <div className="flex flex-col justify-between gap-4 px-5 py-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Icon
              icon="heroicons:building-office"
              className="text-3xl text-emerald-700"
            />
          </div>

          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={companyName}
                  onChange={(event) => onCompanyNameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setEditingName(false);
                    }

                    if (event.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
                  placeholder="Enter prospect name"
                  className="h-9 w-full min-w-0 max-w-md rounded-md border border-emerald-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  title="Finish editing"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                >
                  <Icon icon="lucide:check" />
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-xl font-bold text-slate-950">
                  {companyName || "New Prospect"}
                </h1>

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    title="Edit prospect name"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Icon icon="lucide:pencil" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {prospectNo && (
                <span className="text-xs font-semibold text-slate-500">
                  {prospectNo}
                </span>
              )}

              {/* {contactName && (
                <span className="text-xs text-slate-500">{contactName}</span>
              )} */}
            </div>
          </div>

          <span className="ml-2 shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CONVERTED: read-only, link to customer */}
          {isConverted ? (
            <>
              {onViewCustomer && (
                <button
                  type="button"
                  onClick={onViewCustomer}
                  className="flex h-9 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  <Icon icon="lucide:user-check" />
                  View Customer
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Close
              </button>
            </>
          ) : isEdit && !isEditing ? (
            /* VIEW MODE */
            <>
              <button
                type="button"
                onClick={onConvert}
                className="h-9 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Convert to Customer
              </button>

              <button
                type="button"
                onClick={onEdit}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Icon icon="lucide:pencil" className="text-emerald-600" />
                Edit
              </button>

              {/* <button
                type="button"
                onClick={onLogActivity}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Icon icon="lucide:activity" className="text-emerald-600" />
                Log Activity
              </button> */}

              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Close
              </button>
            </>
          ) : (
            /* EDIT MODE (existing) or NEW */
            <>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={isEdit ? onCancelEdit : onClose}
                disabled={saving}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {isEdit ? "Cancel" : "Close"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { Icon } from "@iconify/react";

type Props = {
  companyName: string;
  prospectNo?: string;
  status: string;
  contactName?: string;
  isEdit: boolean;
  saving: boolean;
  onBack: () => void;
  onEdit: () => void;
  onLogActivity: () => void;
  onConvert: () => void;
  onSave: () => void;
  onClose: () => void;
};

export default function ProspectHeader({
  companyName,
  prospectNo,
  status,
  contactName,
  isEdit,
  saving,
  onBack,
  onEdit,
  onLogActivity,
  onConvert,
  onSave,
  onClose,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center gap-3 bg-emerald-800 px-5 text-white">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-100"
        >
          <Icon icon="lucide:arrow-left" className="text-xl" />
          Prospect Details
        </button>
      </div>

      <div className="flex flex-col justify-between gap-4 px-5 py-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Icon
              icon="heroicons:building-office"
              className="text-emerald-700 text-3xl"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-950">
              {companyName || "New Prospect"}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {prospectNo && (
                <span className="text-xs font-semibold text-slate-500">
                  {prospectNo}
                </span>
              )}

              {contactName && (
                <span className="text-xs text-slate-500">{contactName}</span>
              )}
            </div>
          </div>

          <span className="ml-2 shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEdit && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Icon icon="lucide:pencil" className="text-emerald-600" />
                Edit
              </button>

              <button
                type="button"
                onClick={onLogActivity}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Icon icon="lucide:activity" className="text-emerald-600" />
                Log Activity
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>

          {isEdit && status !== "Converted" && (
            <button
              type="button"
              onClick={onConvert}
              className="h-9 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Convert to Customer
            </button>
          )}
        </div>
      </div>
    </div>
  );
} */

// app/components/parties/PartyDetailHeader.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type { Party } from "@/types/erp";
import { Button } from "@/components/ui/button";

type Props = {
  party: Partial<Party>;
  currencyCode?: string;
  outstandingBalance?: number;
  openEntriesCount?: number;
  lcyBalance?: number;
  onOpenActivities?: () => void;
  onOpenFinance?: () => void;
  onPartyUpdated?: (updatedAccount: Partial<Party>) => void;

  /* ---- Edit mode (buttons live in the header, like the prospect form) ---- */
  /** False when the record is forced read-only (no Edit button). */
  canEdit?: boolean;
  isEditing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
  onClose?: () => void;
  /** Business name changes (editable in the header while editing). */
  onNameChange?: (value: string) => void;
  nameError?: string;

  /* ---- Activity link ---- */
  /** True while the Activity view is open in the tab area. */
  activityActive?: boolean;
  /** Small text under "Activity", e.g. the last activity date. */
  activitySubtitle?: string;
};

export default function PartyDetailHeader({
  party,
  currencyCode = "GBP",
  outstandingBalance = 0,
  openEntriesCount = 0,
  lcyBalance = 0,
  onOpenActivities,
  onOpenFinance,
  onPartyUpdated,
  canEdit = false,
  isEditing = false,
  saving = false,
  onEdit,
  onSave,
  onCancelEdit,
  onClose,
  onNameChange,
  nameError,
  activityActive = false,
  activitySubtitle,
}: Props) {
  const router = useRouter();
  const [editingNameState, setEditingName] = useState(false);
  /* Name input shows while editing it, or while it has a validation error */
  const editingName =
    isEditing && Boolean(onNameChange) && (editingNameState || Boolean(nameError));
  const [loading, setLoading] = useState<"to_customer" | "to_supplier" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetType: "to_customer" | "to_supplier" | null;
  }>({
    isOpen: false,
    targetType: null,
  });

  const openConfirmModal = (targetType: "to_customer" | "to_supplier") => {
    setConfirmModal({ isOpen: true, targetType });
  };

  const [statusLoading, setStatusLoading] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    targetStatus: "active" | "inactive" | null;
  }>({
    isOpen: false,
    targetStatus: null,
  });

  const currentStatus = party.status || "active";

  const targetStatus = statusModal.targetStatus;

  const isActivating = targetStatus === "active";
  const isDeactivating = targetStatus === "inactive";

  const openStatusModal = (status: "active" | "inactive") => {
    if (status === currentStatus) return;

    setStatusModal({
      isOpen: true,
      targetStatus: status,
    });
  };

  const handleStatusChange = async () => {
    if (!party.id || !targetStatus) return;

    setStatusLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/parties/${party.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: targetStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update party status.");
      }

      if (data.party) {
        onPartyUpdated?.(data.party);
      }

      setStatusModal({
        isOpen: false,
        targetStatus: null,
      });
    } catch (err) {
      console.error("Status change error:", err);

      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update party status.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const isCustomerTarget = confirmModal.targetType === "to_customer";

  const formatFCY = (val: number, code: string) => {
    const validCode =
      code?.trim().length === 3 ? code.trim().toUpperCase() : "GBP";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: validCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const lcyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  });

  const codeLabel = party.is_customer
    ? "Customer No."
    : party.is_supplier
      ? "Supplier No."
      : party.is_crm_lead
        ? "CRM Lead No."
        : party.is_srm_vendor
          ? "SRM No."
          : "";
  const codeValue =
    (party.is_customer
      ? party.customer_code
      : party.is_supplier
        ? party.supplier_code
        : party.is_crm_lead
          ? party.crm_code
          : party.is_srm_vendor
            ? party.srm_code
            : "") || "";

  const outlineButton =
    "flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
  const solidButton =
    "flex h-9 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60";

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#11161D]">
        <div className="flex flex-col gap-4 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
          {/* LEFT: avatar, editable business name, number, status, activity */}
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
              <Icon
                icon="heroicons:building-office"
                className="text-3xl text-emerald-700 dark:text-emerald-400"
              />
            </div>

            <div className="min-w-0">
              {editingName ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={party.name || ""}
                      onChange={(event) => onNameChange?.(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          (event.key === "Enter" || event.key === "Escape") &&
                          (party.name || "").trim()
                        ) {
                          setEditingName(false);
                        }
                      }}
                      placeholder="Business name"
                      aria-label="Business name"
                      maxLength={255}
                      className={`h-9 w-[min(28rem,70vw)] rounded-md border bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:ring-2 dark:bg-slate-950 dark:text-slate-100 ${
                        nameError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      disabled={!(party.name || "").trim()}
                      title="Finish editing"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40"
                    >
                      <Icon icon="lucide:check" />
                    </button>
                  </div>
                  {nameError && (
                    <p className="mt-1 text-xs text-red-600">{nameError}</p>
                  )}
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <h1
                    className="truncate text-xl font-bold text-slate-950 dark:text-white"
                    title={party.name || ""}
                  >
                    {party.name || "Unnamed account"}
                  </h1>
                  {isEditing && onNameChange && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      title="Edit business name"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Icon icon="lucide:pencil" />
                    </button>
                  )}
                </div>
              )}

              {codeLabel && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                    {codeLabel} {codeValue}
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <button
              type="button"
              onClick={() =>
                openStatusModal(
                  currentStatus === "active" ? "inactive" : "active",
                )
              }
              disabled={statusLoading}
              title={
                currentStatus === "active"
                  ? "Click to deactivate"
                  : "Click to activate"
              }
              className={`group ml-1 inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full capitalize border transition-all duration-200 hover:shadow-sm disabled:opacity-60 ${
                currentStatus === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/70"
                  : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentStatus === "active" ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <span>{currentStatus}</span>
              <Icon
                icon="lucide:chevron-down"
                className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </button>

            {/* Activity link — opens the Activity view in the tab area */}
            {onOpenActivities && (
              <button
                type="button"
                onClick={onOpenActivities}
                aria-pressed={activityActive}
                title="Open activity"
                className={`group relative inline-flex shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border py-1.5 pl-1.5 pr-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activityActive
                    ? "border-emerald-600 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-teal-950/30 dark:text-emerald-100"
                }`}
              >
                <span
                  className={`pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full transition-colors ${
                    activityActive
                      ? "bg-white/10"
                      : "bg-emerald-400/10 group-hover:bg-emerald-400/20"
                  }`}
                />
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
                    activityActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  }`}
                >
                  <Icon icon="tabler:activity-heartbeat" className="h-4.5 w-4.5" />
                </span>
                <span className="relative leading-tight">
                  <span className="block text-sm font-semibold">Activity</span>
                  <span
                    className={`block text-[10px] ${
                      activityActive
                        ? "text-emerald-100"
                        : "text-emerald-700/80 dark:text-emerald-300/80"
                    }`}
                  >
                    {activitySubtitle || "Ledger & documents"}
                  </span>
                </span>
                <Icon
                  icon="lucide:arrow-up-right"
                  className={`relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    activityActive ? "text-white" : "text-emerald-600"
                  }`}
                />
              </button>
            )}
          </div>

          {/* RIGHT: conversions + edit / save / cancel / close */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {!isEditing && party.is_crm_lead && !party.is_customer && (
              <Button
                type="button"
                onClick={() => openConfirmModal("to_customer")}
                disabled={loading !== null}
                className="inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
              >
                {loading === "to_customer" ? (
                  <>
                    <Icon icon="svg-spinners:180-ring-with-bg" className="w-3.5 h-3.5" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:user-check" className="w-3.5 h-3.5" />
                    <span>Convert to Customer</span>
                  </>
                )}
              </Button>
            )}

            {!isEditing && party.is_srm_vendor && !party.is_supplier && (
              <Button
                type="button"
                onClick={() => openConfirmModal("to_supplier")}
                disabled={loading !== null}
                className="inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
              >
                {loading === "to_supplier" ? (
                  <>
                    <Icon icon="svg-spinners:180-ring-with-bg" className="w-3.5 h-3.5" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:truck" className="w-3.5 h-3.5" />
                    <span>Convert to Supplier</span>
                  </>
                )}
              </Button>
            )}

            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={solidButton}
                >
                  <Icon
                    icon={saving ? "svg-spinners:180-ring-with-bg" : "lucide:save"}
                    className="h-4 w-4"
                  />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    onCancelEdit?.();
                  }}
                  disabled={saving}
                  className={outlineButton}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {canEdit && onEdit && (
                  <button type="button" onClick={onEdit} className={outlineButton}>
                    <Icon icon="lucide:pencil" className="text-emerald-600" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose ?? (() => router.back())}
                  className={outlineButton}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mx-5 mb-3 p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}
      </div>

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 transition-all scale-100">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
                  isCustomerTarget
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                }`}
              >
                <Icon
                  icon={
                    isCustomerTarget
                      ? "lucide:user-plus"
                      : "lucide:arrow-right-left"
                  }
                  className="w-6 h-6"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isCustomerTarget
                    ? "Convert Lead to Customer"
                    : "Convert Vendor to Supplier"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target Account:{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {party.name || "Selected Record"}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to promote this entity to an active{" "}
                <strong className="text-slate-900 dark:text-white">
                  {isCustomerTarget ? "Customer" : "Supplier"}
                </strong>
                ?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>
                  A unique{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {isCustomerTarget ? "Customer Code" : "Supplier Code"}
                  </strong>{" "}
                  will be auto-generated via system sequence logic.
                </li>
                <li>
                  Historical logs, activities, addresses, and contacts will be
                  preserved.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                onClick={() =>
                  setConfirmModal({ isOpen: false, targetType: null })
                }
                variant="cancel"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={() => {}}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ${
                  isCustomerTarget
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5" />
                Confirm Conversion
              </Button>
            </div>
          </div>
        </div>
      )}

      {statusModal.isOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    isActivating
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}
                >
                  <Icon
                    icon={isActivating ? "lucide:power" : "lucide:power-off"}
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isActivating
                      ? "Activate Customer?"
                      : "Deactivate Customer?"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {party.name || "This customer"}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-5">
              <div
                className={`rounded-xl border p-4 ${
                  isActivating
                    ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-amber-100 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        currentStatus === "active"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {currentStatus}
                  </div>

                  <Icon
                    icon="lucide:arrow-right"
                    className="w-3.5 h-3.5 text-slate-400"
                  />

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActivating ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {targetStatus}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {isActivating
                    ? "This customer will become active and can be used in normal transactions."
                    : "This customer will become inactive. Existing historical transactions and records will remain preserved."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <Button
                type="button"
                variant="cancel"
                disabled={statusLoading}
                onClick={() =>
                  setStatusModal({
                    isOpen: false,
                    targetStatus: null,
                  })
                }
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={statusLoading}
                onClick={handleStatusChange}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors ${
                  isActivating
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                {statusLoading ? (
                  <>
                    <Icon
                      icon="svg-spinners:180-ring-with-bg"
                      className="w-3.5 h-3.5"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <Icon
                      icon={isActivating ? "lucide:power" : "lucide:power-off"}
                      className="w-3.5 h-3.5"
                    />
                    {isActivating ? "Activate Customer" : "Deactivate Customer"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

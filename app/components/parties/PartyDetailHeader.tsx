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
  onPartyUpdated?: (updatedAccount: Partial<Party>) => void;
};

export default function PartyDetailHeader({
  party,
  currencyCode = "GBP",
  outstandingBalance = 0,
  openEntriesCount = 0,
  lcyBalance = 0,
  onPartyUpdated,
}: Props) {
  const router = useRouter();
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

  // Currency formatters
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

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {party.name || ""}
              </h2>
              {/* <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  party.status === "active"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {party.status || "active"}
              </span> */}

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
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full capitalize border transition-all duration-200 hover:shadow-sm disabled:opacity-60 ${
                  currentStatus === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/70"
                    : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentStatus === "active"
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />

                <span>{currentStatus}</span>

                <Icon
                  icon="lucide:chevron-down"
                  className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"
                />
              </button>
            </div>
          </div>

          {/* Right Column: Widgets & Conversion Actions */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Outstanding */}
            <div className="group relative overflow-hidden min-w-[180px] px-4 py-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
              <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-amber-400/10 group-hover:bg-amber-400/20 transition-colors" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <Icon icon="lucide:wallet" className="w-3.5 h-3.5" />
                    Open Outstanding
                  </div>

                  <div className="mt-1.5 text-base font-bold tracking-tight text-amber-950 dark:text-amber-100">
                    {formatFCY(outstandingBalance, currencyCode)} LCY {lcyFormatter.format(lcyBalance || 0)}
                  </div>

                  {/* <div className="mt-0.5 text-[10px] font-medium text-amber-700/70 dark:text-amber-300/70">
                    LCY {lcyFormatter.format(lcyBalance || 0)}
                  </div> */}
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-amber-600 shadow-sm dark:bg-amber-900/40 dark:text-amber-400">
                  <Icon icon="lucide:coins" className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Open Entries */}
            <div className="group relative overflow-hidden min-w-[160px] px-4 py-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30">
              <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    <Icon icon="lucide:files" className="w-3.5 h-3.5" />
                    Open Entries
                  </div>

                  <div className="mt-1.5 text-xl font-bold tracking-tight text-blue-950 dark:text-blue-100">
                    {openEntriesCount}
                  </div>

                  {/* <div className="mt-0.5 text-[10px] font-medium text-blue-700/70 dark:text-blue-300/70">
                    Outstanding entries
                  </div> */}
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-blue-600 shadow-sm dark:bg-blue-900/40 dark:text-blue-400">
                  <Icon icon="lucide:layers-3" className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Credit Limit */}
            <div className="group relative overflow-hidden min-w-[160px] px-4 py-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-violet-900/50 dark:from-violet-950/40 dark:to-fuchsia-950/30">
              <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-violet-400/10 group-hover:bg-violet-400/20 transition-colors" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    <Icon icon="lucide:gauge" className="w-3.5 h-3.5" />
                    Credit Limit
                  </div>

                  <div className="mt-1.5 text-base font-bold tracking-tight text-violet-950 dark:text-violet-100">
                    {formatFCY(Number(party.credit_limit) || 0, currencyCode)}
                  </div>

                  {/* <div className="mt-0.5 text-[10px] font-medium text-violet-700/70 dark:text-violet-300/70">
                    Available credit ceiling
                  </div> */}
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/70 text-violet-600 shadow-sm dark:bg-violet-900/40 dark:text-violet-400">
                  <Icon icon="lucide:credit-card" className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {party.is_crm_lead && !party.is_customer && (
                <Button
                  type="button"
                  onClick={() => openConfirmModal("to_customer")}
                  disabled={loading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {loading === "to_customer" ? (
                    <>
                      <Icon
                        icon="svg-spinners:180-ring-with-bg"
                        className="w-3.5 h-3.5"
                      />
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

              {party.is_srm_vendor && !party.is_supplier && (
                <Button
                  type="button"
                  onClick={() => openConfirmModal("to_supplier")}
                  disabled={loading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {loading === "to_supplier" ? (
                    <>
                      <Icon
                        icon="svg-spinners:180-ring-with-bg"
                        className="w-3.5 h-3.5"
                      />
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
            </div>
          </div>

          {/* <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
              <span className="text-[12px] text-amber-700 dark:text-amber-400 block tracking-wider capitalize">
                Open Outstanding
              </span>
              <div className="text-[10px] text-amber-900 dark:text-amber-300">
                FCY: {formatFCY(outstandingBalance, currencyCode)} / LCY:{" "}
                {lcyFormatter.format(lcyBalance || 0)}
              </div>
            </div>

            <div className="px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
              <span className="text-[12px] text-blue-700 dark:text-blue-400 block tracking-wider capitalize">
                Open Entries
              </span>
              <div className="text-[10px] font-mono text-blue-900 dark:text-blue-300">
                {openEntriesCount} Entries
              </div>
            </div>

            <div className="px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
              <span className="text-[12px] text-blue-700 dark:text-blue-400 block tracking-wider capitalize">
                Credit Limits
              </span>
              <div className="text-[10px] font-mono text-blue-900 dark:text-blue-300">
                {party.credit_limit}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {party.is_crm_lead && !party.is_customer && (
                <Button
                  type="button"
                  onClick={() => openConfirmModal("to_customer")}
                  disabled={loading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {loading === "to_customer" ? (
                    <>
                      <Icon
                        icon="svg-spinners:180-ring-with-bg"
                        className="w-3.5 h-3.5"
                      />
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

              {party.is_srm_vendor && !party.is_supplier && (
                <Button
                  type="button"
                  onClick={() => openConfirmModal("to_supplier")}
                  disabled={loading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {loading === "to_supplier" ? (
                    <>
                      <Icon
                        icon="svg-spinners:180-ring-with-bg"
                        className="w-3.5 h-3.5"
                      />
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
            </div>
          </div> */}
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
            <strong>Conversion Error:</strong> {errorMessage}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
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

{
  /* Sequence Codes */
}
{
  /* <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
              {party.crm_code && (
                <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
                  CRM: {party.crm_code}
                </span>
              )}
              {party.srm_code && (
                <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
                  SRM: {party.srm_code}
                </span>
              )}
              {party.customer_code && (
                <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-200 dark:border-emerald-900">
                  Cust Code: {party.customer_code}
                </span>
              )}
              {party.supplier_code && (
                <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-mono font-semibold border border-indigo-200 dark:border-indigo-900">
                  Supp Code: {party.supplier_code}
                </span>
              )}
            </div> */
}

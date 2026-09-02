// app/components/parties/PartyDetailHeader.tsx
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
          {/* Left Column: Name & Sequence Codes */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {party.name || ""}
              </h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  party.status === "active"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {party.status || "active"}
              </span>
            </div>

            {/* Sequence Codes */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
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
            </div>
          </div>

          {/* Right Column: Widgets & Conversion Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Open Outstanding Balance Widget */}
            <div className="px-3.5 py-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
              <span className="text-[12px] text-amber-700 dark:text-amber-400 block tracking-wider capitalize">
                Open Outstanding
              </span>
              <div className="text-[10px] text-amber-900 dark:text-amber-300">
                FCY: {formatFCY(outstandingBalance, currencyCode)} / LCY: {lcyFormatter.format(lcyBalance || 0)}
              </div>
              {/* <div className="text-[10px] font-mono text-amber-700/70 dark:text-amber-400/70">
                LCY: {lcyFormatter.format(lcyBalance || 0)}
              </div> */}
            </div>

            {/* Open Entries Count Widget */}
            <div className="px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
              <span className="text-[12px] text-blue-700 dark:text-blue-400 block tracking-wider capitalize">
                Open Entries
              </span>
              <div className="text-[10px] font-mono text-blue-900 dark:text-blue-300">
                {openEntriesCount} Entries
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
    </>
  );
}
/* "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type { Party } from "@/types/erp";
import { Button } from "@/components/ui/button";

type Props = {
  party: Partial<Party>;
  onPartyUpdated?: (updatedAccount: Partial<Party>) => void;
};

export default function PartyDetailHeader({ party, onPartyUpdated }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"to_customer" | "to_supplier" | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to manage the confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetType: "to_customer" | "to_supplier" | null;
  }>({
    isOpen: false,
    targetType: null,
  });

  // Triggers the modal
  const openConfirmModal = (targetType: "to_customer" | "to_supplier") => {
    setConfirmModal({ isOpen: true, targetType });
  };

  // Executes the conversion after user confirms in the modal
  const handleExecuteConvert = async () => {
    const targetType = confirmModal.targetType;
    if (!targetType) return;

    const isCustomer = targetType === "to_customer";
    const actionLabel = isCustomer
      ? "Convert to Customer"
      : "Convert to Supplier";

    // Close modal & start loading
    setConfirmModal({ isOpen: false, targetType: null });
    setLoading(targetType);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/parties/${party.id}/convert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to execute ${actionLabel}`);
      }

      // Sync state back to PartyRecord
      if (onPartyUpdated && data.party) {
        onPartyUpdated(data.party);
      }

      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setLoading(null);
    }
  };

  const isCustomerTarget = confirmModal.targetType === "to_customer";

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {party.name || ""}
              </h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  party.status === "active"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {party.status || "active"}
              </span>
            </div>

          
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
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
            </div>
          </div>


          <div className="flex items-center gap-2 self-start sm:self-auto">
  
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

        {errorMessage && (
          <div className="mt-3 p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
            <strong>Conversion Error:</strong> {errorMessage}
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
                // className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleExecuteConvert}
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
    </>
  );
} */

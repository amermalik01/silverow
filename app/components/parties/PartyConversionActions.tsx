// app/components/parties/PartyConversionActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Party } from "@/types/erp";

type Props = {
  party: Party;
  onUpdate?: (updatedParty: Party) => void;
};

export default function PartyConversionActions({ party, onUpdate }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (targetType: "to_customer" | "to_supplier") => {
    const confirmMessage =
      targetType === "to_customer"
        ? "Are you sure you want to convert this Lead into an active Customer? A unique Customer Code will be generated."
        : "Are you sure you want to convert this Vendor into an active Supplier? A unique Supplier Code will be generated.";

    if (!confirm(confirmMessage)) return;

    setLoading(targetType);
    setError(null);

    try {
      const res = await fetch(`/api/parties/${party.id}/convert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to convert party record.");
      }

      if (onUpdate && data.party) {
        onUpdate(data.party);
      }

      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded border border-red-200 dark:border-red-900">
          {error}
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* Render "Convert to Customer" button if CRM Lead and NOT yet a Customer */}
        {party.is_crm_lead && !party.is_customer && (
          <button
            type="button"
            onClick={() => handleConvert("to_customer")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {loading === "to_customer" ? (
              <span>Converting...</span>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Convert to Customer
              </>
            )}
          </button>
        )}

        {/* Render "Convert to Supplier" button if SRM Vendor and NOT yet a Supplier */}
        {party.is_srm_vendor && !party.is_supplier && (
          <button
            type="button"
            onClick={() => handleConvert("to_supplier")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {loading === "to_supplier" ? (
              <span>Converting...</span>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Convert to Supplier
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

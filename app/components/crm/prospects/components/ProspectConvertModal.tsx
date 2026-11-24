// app/components/crm/prospects/components/ProspectConvertModal.tsx

"use client";

import { useState } from "react";

type Props = {
  prospectId: string;
  companyName: string;
  onClose: () => void;
  /** Receives the new customer's id when the API returns it. */
  onConverted: (customerId?: string) => Promise<void> | void;
};

export default function ProspectConvertModal({
  prospectId,
  companyName,
  onClose,
  onConverted,
}: Props) {
  const [customerName, setCustomerName] = useState(companyName);
  const [customerCode, setCustomerCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const convert = async () => {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/sales/crm/prospects/${prospectId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_code: customerCode.trim() || null,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to convert prospect.";
        throw new Error(message);
      }

      const customerId =
        typeof result === "object" &&
        result !== null &&
        "customer" in result &&
        typeof result.customer === "object" &&
        result.customer !== null &&
        "id" in result.customer &&
        typeof result.customer.id === "string"
          ? result.customer.id
          : undefined;

      await onConverted(customerId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to convert prospect.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="bg-emerald-900 px-5 py-4 text-white">
          <h3 className="font-semibold">Convert to Customer</h3>
          <p className="mt-1 text-xs text-emerald-100">
            This creates a customer record and retains the original prospect
            history.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <label className="block text-sm text-slate-600">
            Customer Name *
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </label>

          {/* <label className="block text-sm text-slate-600">
            Customer Code
            <input
              value={customerCode}
              onChange={(event) => setCustomerCode(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Leave blank to use automatic numbering"
            />
          </label> */}

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
            Contacts and addresses will be copied to the customer record. The
            prospect`s activities, notes and status history will remain
            available.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void convert()}
            disabled={saving}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Converting..." : "Convert Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

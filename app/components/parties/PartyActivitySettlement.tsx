// app/components/parties/PartyActivitySettlement.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

interface LedgerEntry {
  id: string;
  document_no: string;
  document_type: string;
  posting_date: string;
  due_date: string;
  original_amount: number;
  remaining_amount: number;
}

interface Props {
  partyId: string;
  partyType: "customer" | "supplier";
  openEntries: LedgerEntry[];
  onRefresh: () => void;
}

export default function PartyActivitySettlement({
  partyId,
  partyType,
  openEntries,
  onRefresh,
}: Props) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [allocationAmounts, setAllocationAmounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate open payments/credit memos from open debit invoices
  const payments = openEntries.filter(
    (e) => e.document_type === "PAYMENT" || e.document_type === "CREDIT_MEMO",
  );
  const invoices = openEntries.filter(
    (e) =>
      e.document_type === "SALES_INVOICE" ||
      e.document_type === "PURCHASE_INVOICE",
  );

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);
  const maxAllocatable = selectedPayment ? selectedPayment.remaining_amount : 0;

  const currentTotalAllocated = Object.values(allocationAmounts).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0,
  );

  const handleAmountChange = (
    invoiceId: string,
    val: number,
    maxInvoiceRem: number,
  ) => {
    const clampedVal = Math.min(Math.max(0, val), maxInvoiceRem);
    setAllocationAmounts((prev) => ({
      ...prev,
      [invoiceId]: clampedVal,
    }));
  };

  const handleAutoFill = () => {
    if (!selectedPayment) return;
    let available = selectedPayment.remaining_amount;
    const newAllocations: Record<string, number> = {};

    for (const inv of invoices) {
      if (available <= 0) break;
      const alloc = Math.min(inv.remaining_amount, available);
      newAllocations[inv.id] = alloc;
      available -= alloc;
    }

    setAllocationAmounts(newAllocations);
  };

  const handleApplySettlement = async () => {
    if (!selectedPaymentId || currentTotalAllocated <= 0) return;

    try {
      setLoading(true);
      const allocationsPayload = Object.entries(allocationAmounts)
        .filter(([_, amount]) => amount > 0)
        .map(([invoice_ledger_id, amount]) => ({
          invoice_ledger_id,
          amount,
        }));

      const res = await fetch(`/api/finance/settlements/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: partyId,
          party_type: partyType,
          payment_ledger_id: selectedPaymentId,
          allocations: allocationsPayload,
        }),
      });

      if (!res.ok) throw new Error("Settlement application failed");

      setAllocationAmounts({});
      setSelectedPaymentId(null);
      onRefresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-zinc-800">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL: OPEN PAYMENTS & UNAPPLIED CREDITS */}
        <div className="lg:col-span-1 bg-white p-4 rounded border border-zinc-200 shadow-sm space-y-3">
          <h3 className="font-bold text-zinc-700 text-sm">
            1. Select Open Payment / Credit
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {payments.map((pay) => (
              <div
                key={pay.id}
                onClick={() => {
                  setSelectedPaymentId(pay.id);
                  setAllocationAmounts({});
                }}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedPaymentId === pay.id
                    ? "border-emerald-500 bg-emerald-50/30"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>{pay.document_no}</span>
                  <span className="text-emerald-600">
                    ${pay.remaining_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px] mt-1">
                  <span>Date: {pay.posting_date}</span>
                  <span>Total: ${pay.original_amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="p-4 text-center text-zinc-400">
                No open payments to allocate.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: TARGET OPEN INVOICES */}
        <div className="lg:col-span-2 bg-white p-4 rounded border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-700 text-sm">
              2. Allocate to Open Invoices
            </h3>
            {selectedPaymentId && (
              <Button size="sm" variant="outline" onClick={handleAutoFill}>
                Auto-Distribute Balance
              </Button>
            )}
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b text-zinc-600 font-semibold">
                <tr>
                  <th className="p-2">Doc No.</th>
                  <th className="p-2">Due Date</th>
                  <th className="p-2 text-right">Original</th>
                  <th className="p-2 text-right">Open Balance</th>
                  <th className="p-2 w-36 text-right">Allocate Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50">
                    <td className="p-2 font-bold">{inv.document_no}</td>
                    <td className="p-2 text-zinc-500">{inv.due_date || "-"}</td>
                    <td className="p-2 text-right">
                      ${inv.original_amount.toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-bold text-zinc-700">
                      ${inv.remaining_amount.toFixed(2)}
                    </td>
                    <td className="p-2">
                      {/* <input
                        type="number"
                        disabled={!selectedPaymentId}
                        step="0.01"
                        value={allocationAmounts[inv.id] || ""}
                        onChange={(e) =>
                          handleAmountChange(
                            inv.id,
                            parseFloat(e.target.value) || 0,
                            inv.remaining_amount,
                          )
                        }
                        className="w-full border p-1 rounded text-right bg-white font-mono"
                        placeholder="0.00"
                      /> */}

                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        disabled={!selectedPaymentId}
                        value={allocationAmounts[inv.id]}
                        onChange={(val) =>
                          handleAmountChange(
                            inv.id,
                            Number(val) || 0,
                            inv.remaining_amount,
                          )
                        }
                        className="w-full border p-1 rounded text-right bg-white font-mono"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded border">
            <div className="font-mono space-x-4">
              <span>
                Selected Pay: <strong>${maxAllocatable.toFixed(2)}</strong>
              </span>
              <span>
                Allocated:{" "}
                <strong className="text-emerald-600">
                  ${currentTotalAllocated.toFixed(2)}
                </strong>
              </span>
              <span>
                Remaining:{" "}
                <strong>
                  ${(maxAllocatable - currentTotalAllocated).toFixed(2)}
                </strong>
              </span>
            </div>

            <Button
              disabled={
                !selectedPaymentId ||
                currentTotalAllocated <= 0 ||
                currentTotalAllocated > maxAllocatable ||
                loading
              }
              onClick={handleApplySettlement}
            >
              Post Settlement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

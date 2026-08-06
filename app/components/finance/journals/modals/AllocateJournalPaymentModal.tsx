// app/components/finance/journals/modals/AllocateJournalPaymentModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

export interface LineAllocationItem {
  invoice_ledger_id: string;
  amount: number;
}

interface OpenInvoice {
  id: string;
  document_no: string;
  posting_date: string;
  original_amount: number;
  remaining_amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  paymentAmount: number;
  initialAllocations?: LineAllocationItem[]; // 🌟 Added initialAllocations
  onApplyAllocations: (allocations: LineAllocationItem[]) => void;
}

export default function AllocateJournalPaymentModal({
  isOpen,
  onClose,
  vendorId,
  paymentAmount,
  initialAllocations = [],
  onApplyAllocations,
}: Props) {
  const { show, hide } = useLoader();

  const [invoices, setInvoices] = useState<OpenInvoice[]>([]);

  // 🌟 Calculate initial state synchronously during render (avoids setState in effect)
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    initialAllocations.forEach((item) => {
      initialMap[item.invoice_ledger_id] = item.amount;
    });
    return initialMap;
  });

  useEffect(() => {
    if (isOpen && vendorId) {
      let isMounted = true;

      try {
        show("Fetching Record...");

        fetch(`/api/finance/suppliers/${vendorId}/open-invoices`)
          .then((res) => res.json())
          .then((data) => {
            if (isMounted) {
              setInvoices(data || []);
            }
          })
          .catch((err) => console.error("Error fetching open invoices:", err));

        return () => {
          isMounted = false;
        };
      } catch (err) {
        console.error("Error loading journal configuration data:", err);
      } finally {
        hide();
      }
    }
  }, [isOpen, vendorId]);

  /* useEffect(() => {
    if (isOpen && vendorId) {
      // Initialize existing line allocations into local map state
      const initialMap: Record<string, number> = {};
      initialAllocations.forEach((item) => {
        initialMap[item.invoice_ledger_id] = item.amount;
      });
      setAllocations(initialMap);

      // Fetch open invoices for this supplier
      fetch(`/api/finance/suppliers/${vendorId}/open-invoices`)
        .then((res) => res.json())
        .then((data) => setInvoices(data || []));
    }
  }, [isOpen, vendorId]); */

  if (!isOpen) return null;

  const totalAllocated = Object.values(allocations).reduce(
    (sum, v) => sum + (v || 0),
    0,
  );
  const remainingToAllocate = paymentAmount - totalAllocated;

  const handleAmountChange = (
    invoiceId: string,
    val: number,
    maxRem: number,
  ) => {
    const clamped = Math.min(Math.max(0, val), maxRem);
    setAllocations((prev) => ({ ...prev, [invoiceId]: clamped }));
  };

  const handleSave = () => {
    const result: LineAllocationItem[] = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([invoice_ledger_id, amount]) => ({ invoice_ledger_id, amount }));

    onApplyAllocations(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-xs">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-4 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-bold text-sm text-zinc-800">
            Allocate Payment to Supplier Invoices
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto max-h-72 border rounded">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-100 font-semibold text-zinc-600">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Document No.</th>
                <th className="p-2 text-right">Original</th>
                <th className="p-2 text-right">Remaining</th>
                <th className="p-2 w-32 text-right">Allocate Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="p-2">{inv.posting_date}</td>
                  <td className="p-2 font-bold">{inv.document_no}</td>
                  <td className="p-2 text-right">
                    ${Number(inv.original_amount).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    ${Number(inv.remaining_amount).toFixed(2)}
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border p-1 rounded text-right bg-white"
                      value={allocations[inv.id] || ""}
                      onChange={(e) =>
                        handleAmountChange(
                          inv.id,
                          parseFloat(e.target.value) || 0,
                          inv.remaining_amount,
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border font-mono">
          <div>
            Payment Amount: <strong>${paymentAmount.toFixed(2)}</strong>
          </div>
          <div>
            Allocated:{" "}
            <strong className="text-emerald-600">
              ${totalAllocated.toFixed(2)}
            </strong>
          </div>
          <div>
            Remaining: <strong>${remainingToAllocate.toFixed(2)}</strong>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={totalAllocated <= 0 || remainingToAllocate < 0}
          >
            Confirm Allocation
          </Button>
        </div>
      </div>
    </div>
  );
}

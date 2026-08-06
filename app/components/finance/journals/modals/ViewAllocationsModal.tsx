// app/components/finance/modals/ViewAllocationsModal.tsx

"use client";

import { useEffect, useState } from "react";

interface AllocationDetail {
  id: string;
  allocation_date: string;
  document_type: string;
  document_no: string;
  allocated_amount: number;
}

export default function ViewAllocationsModal({
  isOpen,
  onClose,
  ledgerEntryId,
}: {
  isOpen: boolean;
  onClose: () => void;
  ledgerEntryId: string | null;
}) {
  const [details, setDetails] = useState<AllocationDetail[]>([]);

  useEffect(() => {
    if (isOpen && ledgerEntryId) {
      fetch(`/api/finance/allocations/details?ledger_entry_id=${ledgerEntryId}`)
        .then((res) => res.json())
        .then((data) => setDetails(data || []));
    }
  }, [isOpen, ledgerEntryId]);

  if (!isOpen) return null;

  const totalSettled = details.reduce(
    (sum, d) => sum + Number(d.allocated_amount),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-xs">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-bold text-sm text-zinc-800">
            Allocation Settlement Details
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <table className="w-full text-left border-collapse border">
          <thead className="bg-zinc-100 font-semibold">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Doc Type</th>
              <th className="p-2">Doc No.</th>
              <th className="p-2 text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono">
            {details.map((row) => (
              <tr key={row.id}>
                <td className="p-2">{row.allocation_date}</td>
                <td className="p-2">{row.document_type}</td>
                <td className="p-2 font-bold">{row.document_no}</td>
                <td className="p-2 text-right">
                  ${Number(row.allocated_amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-mono font-bold text-zinc-700">
          Total Settled: ${totalSettled.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

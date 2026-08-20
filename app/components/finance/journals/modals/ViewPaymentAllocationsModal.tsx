// app/components/finance/journals/modals/ViewPaymentAllocationsModal.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AllocationDetail {
  id: string;
  allocation_date: string;
  allocated_amount: number;
  allocated_doc_no: string;
  allocated_doc_type: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  partyId: string;
  partyType: "supplier" | "customer";
  documentNo: string;
  currencyFormatter: (val: number) => string;
}

export default function ViewPaymentAllocationsModal({
  isOpen,
  onClose,
  entryId,
  partyId,
  partyType,
  documentNo,
  currencyFormatter,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<AllocationDetail[]>([]);

  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/parties/${partyId}/ledger/${entryId}/allocations?type=${partyType}`,
      );
      if (!res.ok) throw new Error("Failed to fetch allocations.");
      const data = await res.json();
      setAllocations(data.allocations || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load allocation details.");
    } finally {
      setLoading(false);
    }
  }, [partyId, entryId, partyType]);

  useEffect(() => {
    if (isOpen && entryId) {
      fetchAllocations();
    }
  }, [isOpen, entryId, fetchAllocations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full space-y-4 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Allocated Entries
            </h3>
            <p className="text-xs text-slate-500">
              Document Ref:{" "}
              <span className="font-mono font-semibold">{documentNo}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Icon icon="tabler:x" className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Icon icon="tabler:loader-2" className="w-4 h-4 animate-spin" />
            Loading allocations...
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No existing allocations found for this entry.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Target Doc No</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-2 text-slate-600">
                      {item.allocation_date
                        ? format(item.allocation_date, "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">
                      {item.allocated_doc_no}
                    </td>
                    <td className="p-2 uppercase text-[10px]">
                      {item.allocated_doc_type.replace(/_/g, " ")}
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currencyFormatter(item.allocated_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// app/components/parties/tabs/PartyLedgerActivityTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";
import AllocateJournalPaymentModal, {
  LineAllocationItem,
} from "@/app/components/finance/journals/modals/AllocateJournalPaymentModal";

interface LedgerEntry {
  id: string;
  document_type: string;
  document_id: string;
  document_no: string;
  posting_date: string;
  due_date?: string;
  description?: string;
  original_amount: number;
  remaining_amount: number;
  is_open: boolean;
}

interface Summary {
  totalOriginal: number;
  totalRemaining: number;
  openCount: number;
}

interface Props {
  partyId: string;
  partyType: "supplier" | "customer";
}

export default function PartyLedgerActivityTab({ partyId, partyType }: Props) {
  const { show, hide } = useLoader();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalOriginal: 0,
    totalRemaining: 0,
    openCount: 0,
  });
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Allocation Modal State
  const [selectedPayment, setSelectedPayment] = useState<LedgerEntry | null>(
    null,
  );

  const fetchLedger = useCallback(async () => {
    show("Loading Ledger Activity...");
    try {
      const res = await fetch(
        `/api/parties/${partyId}/ledger?type=${partyType}`,
      );
      if (!res.ok) throw new Error("Failed to fetch ledger activity.");
      const data = await res.json();
      setEntries(data.entries || []);
      setSummary(
        data.summary || { totalOriginal: 0, totalRemaining: 0, openCount: 0 },
      );
    } catch (err) {
      console.error(err);
      toast.error("Error loading party ledger entries.");
    } finally {
      hide();
    }
  }, [partyId, partyType, show, hide]);

  useEffect(() => {
    if (partyId) {
      fetchLedger();
    }
  }, [partyId, fetchLedger]);

  const handleApplyAllocations = async (allocations: LineAllocationItem[]) => {
    if (!selectedPayment) return;

    show("Applying Allocations...");
    try {
      const res = await fetch(`/api/parties/${partyId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentLedgerId: selectedPayment.id,
          partyType,
          allocations,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Allocation failed.");

      toast.success("Allocation updated successfully! ✅");
      setSelectedPayment(null);
      await fetchLedger(); // Refresh balances
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Failed to process allocation.");
    } finally {
      hide();
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === "OPEN" && !entry.is_open) return false;
    if (filter === "CLOSED" && entry.is_open) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.document_no.toLowerCase().includes(q) ||
        entry.document_type.toLowerCase().includes(q) ||
        (entry.description && entry.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isAllocatableType = (docType: string) => {
    const dt = docType.toUpperCase();
    return (
      dt.includes("PAYMENT") ||
      dt.includes("CREDIT_NOTE") ||
      dt.includes("DEBIT_NOTE") ||
      dt.includes("REFUND")
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Ledger Value
          </span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            ${summary.totalOriginal.toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Open Outstanding Balance
          </span>
          <div className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">
            ${summary.totalRemaining.toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-900/30">
          <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            Open Entries Count
          </span>
          <div className="text-lg font-bold font-mono text-blue-800 dark:text-blue-300">
            {summary.openCount} Documents
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          {(["ALL", "OPEN", "CLOSED"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                filter === mode
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search document no or memo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Icon
            icon="tabler:search"
            className="w-4 h-4 absolute left-2.5 top-2 text-slate-400"
          />
        </div>
      </div>

      {/* Sub-Ledger Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-2.5">Date</th>
              <th className="p-2.5">Document No</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Memo / Description</th>
              <th className="p-2.5 text-right">Original</th>
              <th className="p-2.5 text-right">Remaining</th>
              <th className="p-2.5 text-center">Status</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-slate-400 dark:text-slate-500 font-sans"
                >
                  No sub-ledger activity records found.
                </td>
              </tr>
            ) : (
              filteredEntries.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {row.posting_date
                            ? new Date(row.posting_date).toLocaleDateString()
                            : "-"}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    {row.document_no}
                  </td>
                  <td className="p-2.5 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                    {row.document_type.replace(/_/g, " ")}
                  </td>
                  <td className="p-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {row.description || "-"}
                  </td>
                  <td className="p-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                    ${row.original_amount.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    ${row.remaining_amount.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-center font-sans">
                    {row.is_open ? (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                        Open
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                        Closed
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-center font-sans">
                    {row.is_open &&
                    row.remaining_amount > 0 &&
                    isAllocatableType(row.document_type) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPayment(row)}
                        className="h-6 text-[11px] px-2 font-medium border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/50"
                      >
                        Allocate
                      </Button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inline Allocation Modal */}
      {selectedPayment && (
        <AllocateJournalPaymentModal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          partyId={partyId}
          partyType={partyType}
          documentType={selectedPayment.document_type}
          paymentAmount={selectedPayment.remaining_amount}
          onApplyAllocations={handleApplyAllocations}
        />
      )}
    </div>
  );
}

// app/components/parties/tabs/PartyLedgerActivityTab.tsx

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useLoader } from "@/app/context/LoaderContext";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { format } from "date-fns";
import AllocateJournalPaymentModal, {
  LineAllocationItem,
} from "@/app/components/finance/journals/modals/AllocateJournalPaymentModal";

import ViewPaymentAllocationsModal from "@/app/components/finance/journals/modals/ViewPaymentAllocationsModal";

interface LedgerEntry {
  id: string;
  document_type: string;
  document_id?: string;
  document_no: string;
  posting_date: string;
  due_date?: string;
  description?: string;
  original_amount: number;
  remaining_amount: number;
  amount_lcy: number;
  remaining_amount_lcy: number;
  total_allocated?: number;
  is_open: boolean;
  on_hold: boolean;
  on_hold_reason?: string;
}

interface Summary {
  totalOriginal: number;
  totalRemaining: number;
  openCount: number;
}

interface Props {
  partyId: string;
  partyType: "supplier" | "customer";
  currencyCode?: string;
}

export default function PartyLedgerActivityTab({
  partyId,
  partyType,
  currencyCode = "GBP",
}: Props) {
  const { show, hide } = useLoader();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalOriginal: 0,
    totalRemaining: 0,
    openCount: 0,
  });
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<LedgerEntry | null>(
    null,
  );
  const [viewAllocationsEntry, setViewAllocationsEntry] =
    useState<LedgerEntry | null>(null);
  const [onHoldEntry, setOnHoldEntry] = useState<LedgerEntry | null>(null);
  const [holdComment, setHoldComment] = useState("");
  const [holdStatus, setHoldStatus] = useState<boolean>(true);

  // const [selectedPayment, setSelectedPayment] = useState<LedgerEntry | null>(
  //   null,
  // );
  // const [onHoldEntry, setOnHoldEntry] = useState<LedgerEntry | null>(null);
  // const [holdComment, setHoldComment] = useState("");
  // const [holdStatus, setHoldStatus] = useState<boolean>(true);

  const currencyFormatter = useMemo(() => {
    const safeCurrency =
      currencyCode && currencyCode.trim().length === 3
        ? currencyCode.trim().toUpperCase()
        : "GBP";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
    });
  }, [currencyCode]);

  const lcyFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GBP",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
    });
  }, []);

  const formatAmount = (val: number, isLcy = false) => {
    return isLcy
      ? lcyFormatter.format(val || 0)
      : currencyFormatter.format(val || 0);
  };

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

  const handleUpdateHoldStatus = async () => {
    if (!onHoldEntry) return;
    show("Updating Hold Status...");
    try {
      const res = await fetch(`/api/parties/${partyId}/ledger`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: onHoldEntry.id,
          partyType,
          onHold: holdStatus,
          reason: holdComment,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status.");
      toast.success("On hold status updated successfully!");
      setOnHoldEntry(null);
      await fetchLedger();
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Failed to update status.");
    } finally {
      hide();
    }
  };

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
      await fetchLedger();
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

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Ledger Value ({currencyCode})
          </span>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {formatAmount(summary.totalOriginal)}
          </div>
        </div> */}

        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Open Outstanding Balance
          </span>
          <div className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">
            {formatAmount(summary.totalRemaining)}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === "ALL"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("OPEN")}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === "OPEN"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-amber-600 dark:text-amber-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("CLOSED")}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === "CLOSED"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Closed
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search document no, type..."
          className="w-full sm:w-64 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {/* Sub-Ledger Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-2.5">Date</th>
              <th className="p-2.5">Document No</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5 text-right">Amount (LCY)</th>
              <th className="p-2.5 text-right">Amount</th>
              <th className="p-2.5 text-right">Remaining</th>
              <th className="p-2.5 text-center">Allocations</th>
              {/* <th className="p-2.5 text-center">Allocations</th> */}
              <th className="p-2.5 text-center">On Hold</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredEntries.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <td className="p-2.5 text-slate-600">
                  {row.posting_date
                    ? format(row.posting_date, "dd/MM/yyyy")
                    : "—"}
                </td>
                <td className="p-2.5 font-semibold text-slate-800">
                  {row.document_no}
                </td>
                <td className="p-2.5 uppercase text-[10px]">
                  {row.document_type.replace(/_/g, " ")}
                </td>
                <td className="p-2.5 text-right font-medium text-slate-500">
                  {formatAmount(row.amount_lcy, true)}
                </td>
                <td className="p-2.5 text-right font-medium">
                  {formatAmount(row.original_amount)}
                </td>
                <td className="p-2.5 text-right font-bold text-amber-600">
                  {formatAmount(row.remaining_amount)}
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => setViewAllocationsEntry(row)}
                    title="View Allocations"
                    className="p-1 text-slate-500 hover:text-blue-600 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon icon="tabler:eye" className="w-4 h-4 inline" />
                  </button>
                </td>
                {/* <td className="p-2.5 text-center">
                  <button
                    onClick={() => setSelectedPayment(row)}
                    className="p-1 hover:text-blue-600 text-slate-500"
                  >
                    <Icon icon="tabler:eye" className="w-4 h-4 inline" />
                  </button>
                </td> */}
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => {
                      setOnHoldEntry(row);
                      setHoldStatus(row.on_hold);
                      setHoldComment(row.on_hold_reason || "");
                    }}
                    className={`p-1 rounded ${row.on_hold ? "text-red-500 font-bold" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <Icon
                      icon="tabler:external-link"
                      className="w-4 h-4 inline"
                    />
                  </button>
                </td>
                <td className="p-2.5 text-center">
                  {row.is_open && Math.abs(row.remaining_amount) > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPayment(row)}
                    >
                      Allocate
                    </Button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* On Hold Modal */}
      {onHoldEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 border rounded-lg p-5 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              On Hold Status - {onHoldEntry.document_no}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Comment</label>
                <input
                  type="text"
                  value={holdComment}
                  onChange={(e) => setHoldComment(e.target.value)}
                  className="w-full text-xs border rounded p-2 mt-1 dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Enter reason..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  value={holdStatus ? "On Hold" : "Active"}
                  onChange={(e) => setHoldStatus(e.target.value === "On Hold")}
                  className="w-full text-xs border rounded p-2 mt-1 dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="On Hold">On Hold</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOnHoldEntry(null)}
              >
                Close
              </Button>
              <Button size="sm" variant="save" onClick={handleUpdateHoldStatus}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Allocations Modal */}
      {viewAllocationsEntry && (
        <ViewPaymentAllocationsModal
          isOpen={!!viewAllocationsEntry}
          onClose={() => setViewAllocationsEntry(null)}
          entryId={viewAllocationsEntry.id}
          partyId={partyId}
          partyType={partyType}
          documentNo={viewAllocationsEntry.document_no}
          currencyFormatter={(val) => formatAmount(val)}
        />
      )}

      {selectedPayment && (
        <AllocateJournalPaymentModal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          partyId={partyId}
          partyType={partyType}
          documentType={selectedPayment.document_type}
          paymentAmount={selectedPayment.remaining_amount}
          currencyIsoCode={currencyCode}
          onApplyAllocations={handleApplyAllocations}
        />
      )}
    </div>
  );
}
// Expanded check to capture all incoming payments/unapplied credit lines
// const isAllocatableType = (docType: string) => {
//   if (!docType) return false;
//   const dt = docType.toUpperCase();
//   return (
//     dt.includes("PAYMENT") ||
//     dt.includes("CREDIT_NOTE") ||
//     dt.includes("CREDIT_MEMO") ||
//     dt.includes("DEBIT_NOTE") ||
//     dt.includes("REFUND") ||
//     dt === "JOURNAL"
//   );
// };
// Dynamic currency formatter based on the party's assigned currency code
/* const currencyFormatter = useMemo(() => {
    const sanitizeCurrency = (code?: string) => {
      return code && code.trim().length === 3
        ? code.trim().toUpperCase()
        : "GBP";
    };

    const safeCurrency = sanitizeCurrency(currencyCode);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        currencyDisplay: "code", // Forces rendering as ISO code (e.g., USD 1,234.56)
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // Fallback if an invalid/unsupported 3-letter currency code is provided
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GBP",
        currencyDisplay: "code",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [currencyCode]); */

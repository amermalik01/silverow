// app/components/parties/tabs/PartyLedgerActivityTab.tsx

"use client";

import { useState, useCallback, useMemo } from "react";
import { useLoader } from "@/app/context/LoaderContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DataTable } from "@/app/components/DataTable/DataTable";
import { ColumnConfig, FetchParams, FetchResponse } from "@/types/table";

import AllocateJournalPaymentModal, {
  LineAllocationItem,
} from "@/app/components/finance/journals/modals/AllocateJournalPaymentModal";
import ViewPaymentAllocationsModal from "@/app/components/finance/journals/modals/ViewPaymentAllocationsModal";

import {
  getPartyLedgerCellRenderers,
  LedgerEntry,
} from "./partyLedgerCellRenderers";

interface Summary {
  totalOriginalFCY: number;
  totalRemainingFCY: number;
  totalOriginalLCY: number;
  totalRemainingLCY: number;
  openCount: number;
}

interface Props {
  partyId: string;
  partyType: "supplier" | "customer";
  currencyCode?: string;
  slug?: string;
  sourceDocType?: string;
  onSummaryLoaded?: (summary: Summary) => void; // Added Callback
}

export default function PartyLedgerActivityTab({
  partyId,
  partyType,
  currencyCode = "GBP",
  slug,
  sourceDocType = "",
  onSummaryLoaded,
}: Props) {
  const { show, hide } = useLoader();

  // Summary Metrics
  const [summary, setSummary] = useState<Summary>({
    totalOriginalFCY: 0,
    totalRemainingFCY: 0,
    totalOriginalLCY: 0,
    totalRemainingLCY: 0,
    openCount: 0,
  });

  // Controls for DataTable parameter reloading
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("OPEN");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [selectedPayment, setSelectedPayment] = useState<LedgerEntry | null>(
    null,
  );
  const [viewAllocationsEntry, setViewAllocationsEntry] =
    useState<LedgerEntry | null>(null);
  const [onHoldEntry, setOnHoldEntry] = useState<LedgerEntry | null>(null);
  const [holdComment, setHoldComment] = useState("");
  const [holdStatus, setHoldStatus] = useState<boolean>(true);

  // Currency formatters
  const lcyFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    });
  }, []);

  const formatFCY = useCallback((val: number, currCode?: string) => {
    const code =
      currCode && currCode.trim().length === 3
        ? currCode.trim().toUpperCase()
        : "GBP";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(val || 0);
  }, []);

  const getDocumentUrl = useCallback(
    (
      documentType: string,
      documentId?: string,
      documentNo?: string,
      partyType?: string,
      slug?: string,
    ) => {
      const targetId = documentId || documentNo;
      if (!targetId || !slug) return "#";

      const type = documentType?.toLowerCase().replace(/\s+/g, "_");

      switch (type) {
        case "sales_invoice":
        case "invoice":
          return partyType === "customer"
            ? `/${slug}/sales/sales-invoices/${targetId}`
            : `/${slug}/purchases/purchase-invoices/${targetId}`;

        case "purchase_invoice":
          return `/${slug}/purchases/purchase-invoices/${targetId}`;

        case "sales_order":
          return `/${slug}/sales/orders/${targetId}`;

        case "purchase_order":
          return `/${slug}/purchases/purchase-orders/${targetId}`;

        case "credit_memo":
        case "debit_note":
        case "posted_debit_note":
        case "posted_credit_note":
          return partyType === "customer"
            ? `/${slug}/sales/posted-credit-notes/${targetId}`
            : `/${slug}/purchases/posted-debit-notes/${targetId}`;

        case "payment":
        case "receipt":
        case "refund":
        case "vendor_payment":
        case "customer_payment":
          return partyType === "customer"
            ? `/${slug}/finance/customer-journal/${targetId}`
            : `/${slug}/finance/supplier-journal/${targetId}`;

        default:
          return "#";
      }
    },
    [],
  );

  // DataTable Fetch Payload API binding
  const fetchLedger = useCallback(
    async (params: FetchParams): Promise<FetchResponse<LedgerEntry>> => {
      const res = await fetch(`/api/parties/${partyId}/ledger/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          partyType,
          sourceDocType,
          statusFilter: filter,
        }),
      });

      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        if (onSummaryLoaded) {
          onSummaryLoaded(data.summary);
        }
      }
      return data;
    },
    [partyId, partyType, sourceDocType, filter, onSummaryLoaded],
  );

  // Handlers for Modals & Actions
  const handleHoldToggle = useCallback((row: LedgerEntry) => {
    setOnHoldEntry(row);
    setHoldStatus(row.on_hold);
    setHoldComment(row.on_hold_reason || "");
  }, []);

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
      setRefreshKey((prev) => prev + 1);
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
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Failed to process allocation.");
    } finally {
      hide();
    }
  };

  // Cell Renderers Binding
  const cellRenderers = useMemo(() => {
    return getPartyLedgerCellRenderers({
      partyType,
      slug,
      lcyFormatter,
      formatFCY,
      getDocumentUrl,
      onViewAllocations: (row) => setViewAllocationsEntry(row),
      onHoldToggle: handleHoldToggle,
      onAllocate: (row) => setSelectedPayment(row),
    });
  }, [
    partyType,
    slug,
    lcyFormatter,
    formatFCY,
    getDocumentUrl,
    handleHoldToggle,
  ]);

  const renderRowCell = useCallback(
    (row: LedgerEntry, columnKey: string) => {
      const renderer = cellRenderers[columnKey as keyof typeof cellRenderers];
      return renderer ? renderer(row) : undefined;
    },
    [cellRenderers],
  );

  // Column Customization Store Config API
  const columnsConfigApi = useMemo(
    () => ({
      get: async (key: string): Promise<ColumnConfig[]> => {
        const res = await fetch(`/api/table-config?moduleKey=${key}`);
        return res.json();
      },
      save: async (key: string, configs: ColumnConfig[]): Promise<void> => {
        await fetch("/api/table-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey: key, configs }),
        });
      },
      reset: async (key: string): Promise<ColumnConfig[]> => {
        await fetch(`/api/table-config/reset?moduleKey=${key}`, {
          method: "POST",
        });
        const res = await fetch(`/api/table-config?moduleKey=${key}`);
        return res.json();
      },
    }),
    [],
  );

  return (
    <div className="space-y-4">
      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs w-fit">
        {(["OPEN", "CLOSED", "ALL"] as const).map((statusTab) => (
          <button
            key={statusTab}
            onClick={() => setFilter(statusTab)}
            className={`px-3 py-1 rounded-md transition-colors capitalize ${
              filter === statusTab
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {statusTab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Enterprise Data Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <DataTable<LedgerEntry>
          key={`${filter}-${refreshKey}`}
          moduleKey="party_ledger_activity"
          fetchApi={fetchLedger}
          columnsConfigApi={columnsConfigApi}
          renderRowCell={renderRowCell}
        />
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
          currencyFormatter={(val) =>
            formatFCY(val, viewAllocationsEntry.currency_code)
          }
        />
      )}

      {/* Payment Allocation Drawer / Modal */}
      {selectedPayment && (
        <AllocateJournalPaymentModal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          partyId={partyId}
          partyType={partyType}
          documentType={selectedPayment.document_type}
          paymentEntryId={selectedPayment.id}
          paymentAmount={Math.abs(selectedPayment.remaining_amount_fcy || 0)}
          currencyIsoCode={selectedPayment.currency_code || currencyCode}
          onApplyAllocations={handleApplyAllocations}
        />
      )}
    </div>
  );
}

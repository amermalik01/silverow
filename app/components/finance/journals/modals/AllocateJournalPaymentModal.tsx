// app/components/finance/journals/modals/AllocateJournalPaymentModal.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";
import { format, parseISO } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";

export interface LineAllocationItem {
  invoice_ledger_id: string;
  amount: number;
}

interface OpenDocument {
  id: string;
  document_no: string;
  document_type: string;
  posting_date: string;
  original_amount_fcy: number;
  remaining_amount_fcy: number;
  original_amount_lcy: number;
  remaining_amount_lcy: number;
  currency_code: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  partyType: "supplier" | "customer";
  documentType: string; // e.g., "Payment", "Refund"
  paymentEntryId?: string;
  paymentAmount: number;
  currencyIsoCode?: string;
  initialAllocations?: LineAllocationItem[];
  onApplyAllocations: (allocations: LineAllocationItem[]) => void;
}

export default function AllocateJournalPaymentModal({
  isOpen,
  onClose,
  partyId,
  partyType,
  documentType,
  paymentEntryId,
  paymentAmount,
  currencyIsoCode = "GBP",
  initialAllocations = [],
  onApplyAllocations,
}: Props) {
  const { show, hide } = useLoader();
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  
  const totalAllocated = Object.values(allocations).reduce(
    (sum, v) => sum + (v || 0),
    0,
  );

  const remainingToAllocate = paymentAmount - totalAllocated;
  const isOverAllocated = totalAllocated > paymentAmount + 0.001;

  const autoAllocateChecked =
    paymentAmount > 0 && Math.abs(totalAllocated - paymentAmount) < 0.01;

  const isSupplier = partyType === "supplier";
  const isRefund = documentType?.toLowerCase() === "refund";

  console.log('partyType ====',partyType);
  console.log('documentType ====',documentType);

  const targetDocType = documentType;

  // Dynamic UI label
  const targetDocLabel = isSupplier
    ? isRefund
      ? "Debit Notes"
      : "Purchase Invoices"
    : isRefund
      ? "Credit Notes"
      : "Sales Invoices";

  // const formatCurrency = (val: number) => {
  //   return `${currencyIsoCode} ${val.toFixed(2)}`;
  // };
  const formatCurrency = (val: number, docCurrency?: string) => {
    const code = docCurrency || currencyIsoCode;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code.trim().length === 3 ? code.toUpperCase() : "GBP",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  // Fetch Open Documents
  useEffect(() => {
    if (!isOpen || !partyId) return;

    let isMounted = true;
    show("Fetching Records...");

    const partySegment = isSupplier ? "suppliers" : "customers";

    fetch(
      `/api/finance/${partySegment}/${partyId}/open-documents?docType=${targetDocType}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch open documents");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        const loadedDocs: OpenDocument[] = Array.isArray(data)
          ? data.map((d) => ({
              ...d,
              original_amount_fcy: Math.abs(Number(d.original_amount_fcy) || 0),
              remaining_amount_fcy: Math.abs(Number(d.remaining_amount_fcy) || 0),
              original_amount_lcy: Math.abs(Number(d.original_amount_lcy) || 0),
              remaining_amount_lcy: Math.abs(Number(d.remaining_amount_lcy) || 0),
            }))
          : [];

        setDocuments(loadedDocs);

        // Pre-populate existing allocation mappings
        const initialMap: Record<string, number> = {};
        initialAllocations.forEach((item) => {
          if (item.invoice_ledger_id && item.amount > 0) {
            initialMap[item.invoice_ledger_id] = Number(item.amount) || 0;
          }
        });
        setAllocations(initialMap);
      })
      .catch((err) => {
        console.error("Error fetching open documents:", err);
        if (isMounted) setDocuments([]);
      })
      .finally(() => {
        if (isMounted) hide();
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    partyId,
    partyType,
    targetDocType,
    JSON.stringify(initialAllocations),
    // show,
    // hide,
  ]);

  const handleAutoAllocateToggle = (shouldAllocateFull: boolean) => {

    if (!shouldAllocateFull) {
      setAllocations({});
      return;
    }

    let unallocatedPool = paymentAmount;
    const newAllocations: Record<string, number> = {};

    for (const doc of documents) {
      if (unallocatedPool <= 0) break;

      const allocForDoc = Math.min(
        doc.remaining_amount_fcy || 0,
        unallocatedPool,
      );

      if (allocForDoc > 0) {
        newAllocations[doc.id] = parseFloat(allocForDoc.toFixed(2));
        unallocatedPool -= allocForDoc;
      }
    }

    setAllocations(newAllocations);
  };

  const handleAmountChange = (docId: string, val: number, maxRem: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    const clamped = Math.min(Math.max(0, safeVal), maxRem);

    setAllocations((prev) => {
      const next = { ...prev };
      if (clamped > 0) {
        next[docId] = parseFloat(clamped.toFixed(2));
      } else {
        delete next[docId];
      }
      return next;
    });
  };

  const handleRowCheckboxToggle = (doc: OpenDocument, checked: boolean) => {
    if (!checked) {
      handleAmountChange(doc.id, 0, doc.remaining_amount_fcy);
      return;
    }

    const currentAllocated = totalAllocated - (allocations[doc.id] || 0);
    const availablePool = Math.max(0, paymentAmount - currentAllocated);
    const allocAmount = Math.min(doc.remaining_amount_fcy, availablePool);

    handleAmountChange(doc.id, allocAmount, doc.remaining_amount_fcy);
  };

  const handleSelectAllToggle = (checked: boolean) => {
    if (checked) {
      handleAutoAllocateToggle(true);
    } else {
      setAllocations({});
    }
  };

  const handleClearAll = () => {
    setAllocations({});
    // setAutoAllocateChecked(false);
  };

  const handleSave = () => {
    if (isOverAllocated) return;

    const result: LineAllocationItem[] = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([invoice_ledger_id, amount]) => ({
        invoice_ledger_id,
        amount: parseFloat(amount.toFixed(2)),
      }));

    onApplyAllocations(result);
    onClose();
  };

  if (!isOpen) return null;

  const allSelected =
    documents.length > 0 &&
    documents.every((doc) => (allocations[doc.id] || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-xs">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h2 className="font-bold text-sm text-zinc-800">
              Allocate {documentType || "Transaction"} to {targetDocLabel}
            </h2>
            <p className="text-zinc-500 text-[11px]">
              Select documents or auto-allocate available payment balance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded border border-zinc-200">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              checked={autoAllocateChecked}
              onChange={(e) => handleAutoAllocateToggle(e.target.checked)}
            />
            Allocate Full Payment ({formatCurrency(paymentAmount)})
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAutoAllocateToggle(true)}
              disabled={documents.length === 0}
            >
              Auto Allocate FIFO
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={Object.keys(allocations).length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Document Grid */}
        <div className="overflow-x-auto max-h-72 border rounded">
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-zinc-100 font-semibold text-zinc-600 sticky top-0 border-b">
              <tr>
                <th className="p-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAllToggle(e.target.checked)}
                    disabled={documents.length === 0}
                  />
                </th>
                <th className="p-2">Date</th>
                <th className="p-2">Document No.</th>
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Original (FCY)</th>
                <th className="p-2 text-right">Remaining (FCY)</th>
                <th className="p-2 w-36 text-right">Allocate Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-zinc-400 font-sans"
                  >
                    No open {targetDocLabel.toLowerCase()} available for
                    allocation.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const currentAlloc = allocations[doc.id] || 0;
                  const isChecked = currentAlloc > 0;

                  return (
                    <tr
                      key={doc.id}
                      className={
                        isChecked ? "bg-indigo-50/40" : "hover:bg-zinc-50"
                      }
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleRowCheckboxToggle(doc, e.target.checked)
                          }
                        />
                      </td>
                      <td className="p-2 font-sans">
                        {doc.posting_date
                          ? format(parseISO(doc.posting_date), "dd/MM/yyyy")
                          : "—"}
                      </td>
                      <td className="p-2 font-bold">{doc.document_no}</td>
                      <td className="p-2 text-zinc-500">{doc.document_type}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(doc.original_amount_fcy, doc.currency_code)}
                      </td>
                      <td className="p-2 text-right font-bold text-amber-600">
                        {formatCurrency(doc.remaining_amount_fcy, doc.currency_code)}
                      </td>
                      <td className="p-2">
                        <NumericTextInput
                          value={allocations[doc.id] ?? ""}
                          min="0"
                          max={doc.remaining_amount_fcy}
                          allowDecimals
                          decimalScale={2}
                          onChange={(val) =>
                            handleAmountChange(
                              doc.id,
                              Number(val),
                              doc.remaining_amount_fcy,
                            )
                          }
                          className={`w-full border p-1 rounded text-right bg-white ${
                            currentAlloc > doc.remaining_amount_fcy
                              ? "border-red-500 text-red-600 focus:ring-red-500"
                              : "border-zinc-300"
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Validation Errors */}
        {isOverAllocated && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-semibold font-sans">
            Warning: Total allocated amount ({formatCurrency(totalAllocated)})
            exceeds available payment amount ({formatCurrency(paymentAmount)}).
          </div>
        )}

        {/* Footer Summary */}
        <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded border font-mono">
          <div>
            Payment Amount: <strong>{formatCurrency(paymentAmount)}</strong>
          </div>
          <div>
            Allocated:{" "}
            <strong
              className={isOverAllocated ? "text-red-600" : "text-emerald-600"}
            >
              {formatCurrency(totalAllocated)}
            </strong>
          </div>
          <div>
            Remaining:{" "}
            <strong className={remainingToAllocate < 0 ? "text-red-600" : ""}>
              {formatCurrency(remainingToAllocate)}
            </strong>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              totalAllocated <= 0 || isOverAllocated || documents.length === 0
            }
            variant="save"
          >
            Confirm Allocation
          </Button>
        </div>
      </div>
    </div>
  );
}


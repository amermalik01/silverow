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
  original_amount: number;
  remaining_amount: number;
  currency_code?: string;
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
  // const [autoAllocateChecked, setAutoAllocateChecked] = useState(false);

  const totalAllocated = Object.values(allocations).reduce(
    (sum, v) => sum + (v || 0),
    0,
  );

  console.log('paymentAmount ====',paymentAmount);
  console.log('totalAllocated ====',totalAllocated);

  const remainingToAllocate = paymentAmount - totalAllocated;
  console.log('remainingToAllocate ====',remainingToAllocate);

  const isOverAllocated = totalAllocated > paymentAmount + 0.001;
  console.log('isOverAllocated ====',isOverAllocated);

  const autoAllocateChecked =
    paymentAmount > 0 && Math.abs(totalAllocated - paymentAmount) < 0.01;

  const isSupplier = partyType === "supplier";
  const isRefund = documentType?.toLowerCase() === "refund";

  const targetDocType = useMemo(() => {
    return isRefund ? "REFUND" : "PAYMENT";
  }, [isRefund]);

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
    return `${docCurrency || currencyIsoCode} ${val.toFixed(2)}`;
  };

  // Fetch Open Documents
  useEffect(() => {
    if (!isOpen || !partyId) return;

    let isMounted = true;
    show("Fetching Records...");

    fetch(
      `/api/finance/${partyType}s/${partyId}/open-documents?docType=${targetDocType}`,
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
              original_amount: Math.abs(Number(d.original_amount) || 0),
              remaining_amount: Math.abs(Number(d.remaining_amount) || 0),
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
    // setAutoAllocateChecked(shouldAllocateFull);

    if (!shouldAllocateFull) {
      setAllocations({});
      return;
    }

    let unallocatedPool = paymentAmount;
    const newAllocations: Record<string, number> = {};

    for (const doc of documents) {
      if (unallocatedPool <= 0) break;

      const allocForDoc = Math.min(
        Number(doc.remaining_amount) || 0,
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
      handleAmountChange(doc.id, 0, doc.remaining_amount);
      return;
    }

    const currentAllocated = totalAllocated - (allocations[doc.id] || 0);
    const availablePool = Math.max(0, paymentAmount - currentAllocated);
    const allocAmount = Math.min(doc.remaining_amount, availablePool);

    handleAmountChange(doc.id, allocAmount, doc.remaining_amount);
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
                <th className="p-2 text-right">Original</th>
                <th className="p-2 text-right">Remaining</th>
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
                        {formatCurrency(Number(doc.original_amount))}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(Number(doc.remaining_amount))}
                      </td>
                      <td className="p-2">
                        <NumericTextInput
                          value={allocations[doc.id] ?? ""}
                          min="0"
                          max={doc.remaining_amount}
                          allowDecimals
                          decimalScale={2}
                          onChange={(val) =>
                            handleAmountChange(
                              doc.id,
                              Number(val),
                              doc.remaining_amount,
                            )
                          }
                          className={`w-full border p-1 rounded text-right bg-white ${
                            currentAlloc > doc.remaining_amount
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


  // Compute targeted target document type for API payload query
  // const targetDocType = useMemo(() => {
  //   if (isRefund) {
  //     return isSupplier ? "DEBIT_NOTE" : "CREDIT_NOTE";
  //   }
  //   return "INVOICE";
  // }, [isRefund, isSupplier]);

  // const totalAllocated = useMemo(() => {
  //   return Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  // }, [allocations]);

  // const autoAllocateChecked =
  //   paymentAmount > 0 && Math.abs(totalAllocated - paymentAmount) < 0.01;

  // const remainingToAllocate = useMemo(
  //   () => paymentAmount - totalAllocated,
  //   [paymentAmount, totalAllocated],
  // );

  // const isOverAllocated = totalAllocated > paymentAmount + 0.001;

  // useEffect(() => {
  //   if (paymentAmount > 0 && Math.abs(totalAllocated - paymentAmount) < 0.01) {
  //     setAutoAllocateChecked(true);
  //   } else {
  //     setAutoAllocateChecked(false);
  //   }
  // }, [totalAllocated, paymentAmount]);
/* export default function AllocateJournalPaymentModal({
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
  const [autoAllocateChecked, setAutoAllocateChecked] = useState(false);

  const isSupplier = partyType === "supplier";
  const isRefund = documentType?.toLowerCase() === "refund";

  // Dynamic modal title based on context
  const targetDocLabel = isSupplier
    ? isRefund
      ? "Debit Notes"
      : "Purchase Invoices"
    : isRefund
      ? "Credit Notes"
      : "Sales Invoices";

  // Helper function for clean currency formatting
  const formatCurrency = (val: number) => {
    return `${currencyIsoCode} ${val.toFixed(2)}`;
  };

  // Load Open Documents
  useEffect(() => {
    if (isOpen && partyId) {
      let isMounted = true;
      const cleanDocType = (documentType || "PAYMENT").toUpperCase();

      try {
        show("Fetching Records...");
        fetch(
          `/api/finance/${partyType}s/${partyId}/open-documents?docType=${cleanDocType}`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (isMounted) {
              const loadedDocs: OpenDocument[] = Array.isArray(data)
                ? data.map((d) => ({
                    ...d,
                    original_amount: Math.abs(Number(d.original_amount) || 0),
                    remaining_amount: Math.abs(Number(d.remaining_amount) || 0),
                  }))
                : [];
              setDocuments(loadedDocs);

              const initialMap: Record<string, number> = {};
              initialAllocations.forEach((item) => {
                initialMap[item.invoice_ledger_id] = Number(item.amount) || 0;
              });
              setAllocations(initialMap);
            }
          })
          .catch((err) => console.error("Error fetching open documents:", err));
      } catch (err) {
        console.error("Error loading allocation data:", err);
      } finally {
        hide();
      }

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, partyId, partyType, documentType, show, hide]);


  // Total allocated amount calculation
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  }, [allocations]);

  const remainingToAllocate = paymentAmount - totalAllocated;
  const isOverAllocated = totalAllocated > paymentAmount + 0.001;

  // Sync auto-allocate checkbox state with current allocation total
  useEffect(() => {
    if (paymentAmount > 0 && Math.abs(totalAllocated - paymentAmount) < 0.01) {
      setAutoAllocateChecked(true);
    } else {
      setAutoAllocateChecked(false);
    }
  }, [totalAllocated, paymentAmount]);

  
  const handleAutoAllocateToggle = (shouldAllocateFull: boolean) => {
    setAutoAllocateChecked(shouldAllocateFull);

    if (!shouldAllocateFull) {
      setAllocations({});
      return;
    }

    let unallocatedPool = paymentAmount;
    const newAllocations: Record<string, number> = {};

    for (const doc of documents) {
      if (unallocatedPool <= 0) break;

      const allocForDoc = Math.min(
        Number(doc.remaining_amount) || 0,
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
    // Cap at document remaining amount
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
      handleAmountChange(doc.id, 0, doc.remaining_amount);
      return;
    }

    const currentAllocated = totalAllocated - (allocations[doc.id] || 0);
    const availablePool = Math.max(0, paymentAmount - currentAllocated);
    const allocAmount = Math.min(doc.remaining_amount, availablePool);

    handleAmountChange(doc.id, allocAmount, doc.remaining_amount);
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
    setAutoAllocateChecked(false);
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


        <div className="overflow-x-auto max-h-72 border rounded">
          <table className="w-full text-left border-collapse">
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
                <th className="p-2 text-right">Original</th>
                <th className="p-2 text-right">Remaining</th>
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
                      <td className="p-2">
                        {doc.posting_date
                          ? format(doc.posting_date, "dd/MM/yyyy")
                          : "—"}
                      </td>
                      <td className="p-2 font-bold">{doc.document_no}</td>
                      <td className="p-2 text-zinc-500">{doc.document_type}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(Number(doc.original_amount))}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(Number(doc.remaining_amount))}
                      </td>
                      <td className="p-2">
                        

                        <NumericTextInput
                          value={allocations[doc.id] ?? ""}
                          min="0"
                          max={doc.remaining_amount}
                          allowDecimals
                          decimalScale={2}
                          onChange={(val) =>
                            handleAmountChange(
                              doc.id,
                              Number(val),
                              doc.remaining_amount,
                            )
                          }
                          className={`w-full border p-1 rounded text-right bg-white ${
                            currentAlloc > doc.remaining_amount
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


        {isOverAllocated && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-semibold">
            Warning: Total allocated amount ({formatCurrency(totalAllocated)})
            exceeds available payment amount ({formatCurrency(paymentAmount)}).
          </div>
        )}


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
} */

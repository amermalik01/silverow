// app/components/purchases/debit-notes/DebitNoteForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import {
  DebitNote,
  DebitNoteAddress,
  DebitNoteLine,
  DebitNoteMasterData,
} from "@/types/debit-note";

import DebitNoteLines from "./DebitNoteLines";
import { OrderFormTabs } from "./OrderFormTabs";
import { useLoader } from "@/app/context/LoaderContext";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "../purchase-orders/SupplierLookupModal";

import {
  PurchaseInvoiceLookupModal,
  PurchaseInvoiceLookupItem,
} from "./PurchaseInvoiceLookupModal";

import SupplierShippingLocationsModal from "../purchase-orders/SupplierShippingLocationsModal";
import { StockReceiveConfirmModal } from "../../shared/modals/StockReceiveConfirmModal";

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

type TabType = "general" | "invoicing" | "shipping";

export const DebitNoteForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Manage view/edit state locally
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const [piModalOpen, setPiModalOpen] = useState(false);
  // Add states for modal control
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<DebitNoteMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  const [note, setNote] = useState<Partial<DebitNote>>({
    debit_note_no: id ? "" : "[Auto-Generated]",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
    is_dispatched: false,
    is_posted: false,
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<DebitNoteAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<DebitNoteAddress>
  >({
    address_type: "billing",
  });
  const [shippingAddress, setShippingAddress] = useState<
    Partial<DebitNoteAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<DebitNoteLine[]>([]);

  const isCompleted = note.status === "completed" || note.status === "POSTED";
  const isFormDisabled = !isEditMode || isCompleted;

  // Check if all line items with quantity > 0 have been received
  const isFullyDispatched = useMemo(() => {
    if (lines.length === 0) return false;
    const itemLines = lines.filter((l) => (l.line_type || "ITEM") === "ITEM");
    if (itemLines.length === 0) return false;

    return itemLines.every((l) => {
      const qty = Number(l.quantity || 0);
      const rcvd = Number(l.returned_quantity || 0);
      return qty > 0 && rcvd >= qty;
    });
  }, [lines]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/debit-notes/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          console.log("API payload parsed successfully:", actualData);

          setNote(actualData.debitNote || actualData.note || {});
          setLines(actualData.lines || []);

          setPrimaryAddress(
            actualData.primary_address || { address_type: "primary" },
          );
          setBillingAddress(
            actualData.billing_address || { address_type: "billing" },
          );
          setShippingAddress(
            actualData.shipping_address || { address_type: "shipping" },
          );

          setCurrencyConfig({
            currency_id:
              actualData.debitNote?.currency_id ||
              actualData.note?.currency_id ||
              "",
            exchange_rate:
              actualData.debitNote?.exchange_rate ||
              actualData.note?.exchange_rate ||
              1,
          });
        }
      })
      .catch((err) =>
        console.error(
          "Error hydrating historical debit document payload matrix:",
          err,
        ),
      );
  }, [id]);

  const refreshLines = async () => {
    if (!note.id) return;

    const response = await fetch(`/api/debit-notes/${note.id}/lines`);

    const data = await response.json();

    setLines(data.lines ?? []);
  };

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/purchase-orders/master-data");
        if (!res.ok) throw new Error();

        const data = await res.json();

        setMasterData(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadMasterData();
  }, []);

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  const financials = useMemo(() => {
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;

    const rate = Number(currencyConfig.exchange_rate || 1);
    // const amountInclVatLCY = amountInclVat / rate;
    const amountInclVatLCY = Number(amountInclVat) * rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setNote((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,

      anonymous_supplier: supplier.anonymous_supplier ?? false,
      purchaser_code: supplier.purchaser_code || "",
      payable_bank: supplier.payable_bank || "",
      payment_terms_id: supplier.payment_terms || "",
      payment_method_id: supplier.payment_method || "",
    }));

    if (supplier.primary_address) setPrimaryAddress(supplier.primary_address);

    if (supplier.billing_address) setBillingAddress(supplier.billing_address);

    if (supplier.shipping_address)
      setShippingAddress(supplier.shipping_address);

    if (supplier.currency_id) {
      const matchedCurr = masterData?.currencies.find(
        (c) => c.id === supplier.currency_id,
      );
      setCurrencyConfig({
        currency_id: supplier.currency_id,
        exchange_rate: matchedCurr?.exchange_rate || 1,
      });
    }

    setSupplierModalOpen(false);
  };

  const handleSelectPurchaseInvoice = async (
    invoice: PurchaseInvoiceLookupItem,
  ) => {
    setNote((prev) => ({
      ...prev,
      apply_to_pi: invoice.invoice_no,
      apply_to_pi_id: invoice.id,
      linked_po: invoice.invoice_no,
    }));
    setPiModalOpen(false);

    // Fetch Lines from selected Purchase Invoice to allocate stock quantities
    try {
      show("Fetching invoice lines...");
      const res = await fetch(`/api/purchase-invoices/${invoice.id}`);
      const payload = await res.json();
      hide();

      if (payload?.success && payload.data) {
        const {
          lines: fetchedRawLines,
          primary_address,
          billing_address,
          shipping_address,
        } = payload.data;

        // Hydrate header addresses if available from PO
        if (primary_address) setPrimaryAddress(primary_address);
        if (billing_address) setBillingAddress(billing_address);
        if (shipping_address) setShippingAddress(shipping_address);

        if (Array.isArray(fetchedRawLines)) {
          const mappedLines: DebitNoteLine[] = fetchedRawLines.map(
            (l: DebitNoteLine, idx: number) => ({
              line_no: idx + 1,
              purchase_invoice_line_id: l.purchase_invoice_line_id, // Critical for de-allocation
              line_type: l.line_type || "ITEM",
              item_id: l.item_id,
              item_code: l.item_code || "",
              item_name: l.item_name || l.description || "",
              description: l.description || "",
              warehouse_id: l.warehouse_id || "",
              warehouse_name: l.warehouse_name || "",
              warehouse_location_id: l.warehouse_location_id,
              uom_id: l.uom_id || "",
              uom_name: l.uom_name || "",
              gl_account_id: l.gl_account_id,
              account_code: l.account_code,
              quantity: Number(l.quantity || 0),
              unit_cost: Number(l.unit_cost || 0),
              discount_type: l.discount_type || "PERCENT",
              discount_value: Number(l.discount_value || 0),
              discount_amount: Number(l.discount_amount || 0),
              original_amount: Number(
                l.original_amount ||
                  Number(l.quantity || 0) * Number(l.unit_cost || 0),
              ),
              vat_percent: Number(l.vat_percent || 0),
              vat_amount: Number(l.vat_amount || 0),
              net_amount: Number(l.net_amount || 0),
              gross_amount: Number(l.gross_amount || 0),
            }),
          );

          setLines(mappedLines);
          toast.success(
            `Imported ${mappedLines.length} line items from Purchase Invoice ${invoice.invoice_no}`,
          );
        }
      }
    } catch (err) {
      hide();
      console.error("Failed to load purchase invoice lines:", err);
      toast.error("Error populating lines from purchase invoice.");
    }
  };

  const updateField = <K extends keyof DebitNote>(
    field: K,
    value: DebitNote[K],
  ) => {
    setNote((prev) => ({ ...prev, [field]: value }));
  };

  const validateDates = (): string[] => {
    const errors: string[] = [];

    const orderDate = note.order_date
      ? new Date(note.order_date).getTime()
      : null;

    const invoiceDate = note.invoice_date
      ? new Date(note.invoice_date).getTime()
      : null;

    const reqReceiptDate = note.req_receipt_date
      ? new Date(note.req_receipt_date).getTime()
      : null;

    const receiptDate = note.receipt_date
      ? new Date(note.receipt_date).getTime()
      : null;

    if (orderDate && invoiceDate && orderDate > invoiceDate) {
      errors.push("Order Date cannot be after Invoice Date.");
    }

    if (orderDate && reqReceiptDate && orderDate > reqReceiptDate) {
      errors.push("Order Date cannot be after Required Receipt Date.");
    }

    if (orderDate && receiptDate && orderDate > receiptDate) {
      errors.push("Order Date cannot be after Receipt Date.");
    }

    if (reqReceiptDate && receiptDate && reqReceiptDate > receiptDate) {
      errors.push("Receipt Date cannot be before Required Receipt Date.");
    }

    return errors;
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!note.supplier_id) errors.push("Supplier selection is required.");
    if (!note.linked_po && !note.linked_po)
      errors.push("Apply to Purchase Invoice (PI) selection is required.");
    if (!currencyConfig.currency_id)
      errors.push("Transactional currency token designation required.");
    if (lines.length === 0)
      errors.push("Debit notes require at least one line entry.");

    errors.push(...validateDates());
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error(
        "Please fix layout constraints validation errors before saving.",
      );
      return;
    }

    show("Saving Record...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        debitNote: {
          ...note,
          ...currencyConfig,
          subtotal: financials.amount,
          tax_amount: financials.vat,
          total_amount: financials.amountInclVat,
        },
        primary_address: primaryAddress,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines,
      };

      const res = await fetch(
        id ? `/api/debit-notes/${id}` : "/api/debit-notes",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Execution error writing debit document records.",
        );

      toast.success("Debit Document records compiled and updated cleanly");

      if (id) {
        // Toggle back to View Mode after saving existing PO
        setIsEditMode(false);
      } else {
        // Redirect to list page on initial creation
        router.push(`/${slug}/purchases/debit-notes`);
      }
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  const handleStageClick = async (stageName: string) => {
    const standardizedStatus = stageName.toLowerCase();

    if (
      !id ||
      isUpdatingStatus ||
      note.status?.toLowerCase() === standardizedStatus
    )
      return;

    setIsUpdatingStatus(true);
    try {
      if (standardizedStatus === "posted") {
        const confirmPosting = confirm(
          "Are you sure you want to mark this Debit Note as Posted? This transaction will commit structural changes back to the general ledger and re-balance physical inventory lines permanently.",
        );
        if (!confirmPosting) {
          setIsUpdatingStatus(false);
          return;
        }

        toast.loading(
          "Executing inventory reversing dispatch lines & G/L journals ledger allocations...",
          {
            id: "posting-toast",
          },
        );
      }

      const response = await fetch(`/api/debit-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debitNote: {
            ...note,
            ...currencyConfig,
            supplier_id: note.supplier_id || "",
            document_date:
              note.document_date || new Date().toISOString().split("T")[0],
            status: standardizedStatus,
            subtotal: financials.amount,
            tax_amount: financials.vat,
            total_amount: financials.amountInclVat,
          },
          primary_address: {
            address_type: "primary",
            address_1: primaryAddress.address_1 || "",
            address_2: primaryAddress.address_2 || "",
            city: primaryAddress.city || "",
            county: primaryAddress.county || "",
            postcode: primaryAddress.postcode || "",
            country: primaryAddress.country || "",
          },
          billing_address: {
            address_type: "billing",
            address_1: billingAddress.address_1 || "",
            address_2: billingAddress.address_2 || "",
            city: billingAddress.city || "",
            county: billingAddress.county || "",
            postcode: billingAddress.postcode || "",
            country: billingAddress.country || "",
          },
          shipping_address: {
            address_type: "shipping",
            name: shippingAddress.name || "",
            address_1: shippingAddress.address_1 || "",
            address_2: shippingAddress.address_2 || "",
            city: shippingAddress.city || "",
            county: shippingAddress.county || "",
            country: shippingAddress.country || "",
          },
          lines: lines,
        }),
      });

      if (response.ok) {
        setNote((prev) => ({ ...prev, status: standardizedStatus }));
        toast.success(`Stage updated successfully to: ${stageName}`, {
          id: "posting-toast",
        });
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to update step stage: ${errData.error || "Unknown error"}`,
          { id: "posting-toast" },
        );
      }
    } catch (error) {
      console.error("Error patching sequence document status:", error);
      toast.error("Network error updating status pipeline adjustments.", {
        id: "posting-toast",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 1. Separate Handler for Dispatch Stock
  const handleDispatchStock = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Dispatching stock return...");

    try {
      toast.loading("Processing physical stock dispatch...", {
        id: "action-toast",
      });

      const payload = {
        dispatch: {
          supplier_id: note.supplier_id,
          dispatch_date:
            note.receipt_date ||
            note.order_date ||
            new Date().toISOString().split("T")[0],
          posting_date:
            note.document_date || new Date().toISOString().split("T")[0],
          reference: note.debit_note_no || note.reference,
          notes: note.notes,
        },
        lines: lines.map((line) => ({
          id: line.id,
          debit_note_line_id: line.id,
          line_type: line.line_type,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          location_id: line.warehouse_location_id || null,
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_cost || 0),
          unit_cost: Number(line.unit_cost || 0),
        })),
      };

      const res = await fetch(`/api/debit-notes/${id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // body: JSON.stringify({ note, lines }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive stock");

      toast.success("Stock dispatched & ledger entries committed!", {
        id: "action-toast",
      });
      setShowDispatchModal(false);
      refreshLines();
      router.refresh();
    } catch (err) {
      if (err instanceof Error)
        toast.error(err.message || "Error dispatching stock", {
          id: "action-toast",
        });
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  // 2. Separate Handler for Posting Invoice (Financial Posting to Accounts Payable)
  const handlePostInvoice = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Posting Invoice...");
    try {
      toast.loading("Posting Debit note to G/L ledger...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/debit-notes/${id}/post-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_invoice_no: note.reference,
          invoice_date: note.invoice_date,
          posting_date: note.order_date,
          financials: financials, // { amount, vat, amountInclVat }
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post Debit note");

      toast.success("Debit note posted cleanly!", { id: "action-toast" });
      setShowInvoiceModal(false);

      router.push(`/${slug}/purchases/debit-notes`);
    } catch (err) {
      if (err instanceof Error)
        // setValidationErrors([err.message]);
        toast.error(err.message || "Error posting debit note", {
          id: "action-toast",
        });
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const inputDateStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4">
      {/*  container mx-auto p-1 */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg space-y-1">
          {validationErrors.map((err, idx) => (
            <p
              key={idx}
              className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <Icon icon="tabler:alert-circle" className="inline w-3.5 h-3.5" />{" "}
              {err}
            </p>
          ))}
        </div>
      )}

      {isCompleted && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon icon="tabler:lock" className="w-4 h-4 text-emerald-600" />
            This Debit Note is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] capitalize font-bold tracking-wider">
            Read Only
          </span>
        </div>
      )}

      <div className=" bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200  pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar ">
            {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold capitalize tracking-wider border-b-2 transition whitespace-nowrap 
                ${activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {isUpdateMode && !isLoadingStages && stages.length > 0 && (
            <div className="flex justify-end ml-auto overflow-x-auto">
              <div
                className={`flex items-center justify-center sm:justify-start gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
              >
                {stages.map((stage, index) => {
                  const isLast = index === stages.length - 1;
                  const isActive =
                    note.status?.toLowerCase() === stage.name.toLowerCase();

                  let activeBg = "bg-blue-600 text-white";
                  if (index === 1) activeBg = "bg-amber-500 text-white";
                  if (index === 2) activeBg = "bg-indigo-600 text-white";
                  if (index >= 3) activeBg = "bg-emerald-600 text-white";

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => handleStageClick(stage.name)}
                      className={`px-4 py-1.5 flex items-center gap-1 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95 ${index === 0 ? "rounded-l-md" : ""} ${isLast ? "rounded-r-md" : ""} ${isActive ? activeBg : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                      {stage.name}
                      {!isLast && (
                        <Icon
                          icon="tabler:chevron-right"
                          className="w-3 h-3 text-slate-400"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <OrderFormTabs
          activeTab={activeTab}
          note={note}
          primaryAddress={primaryAddress}
          setPrimaryAddress={setPrimaryAddress}
          billingAddress={billingAddress}
          setBillingAddress={setBillingAddress}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          currencyConfig={currencyConfig}
          setCurrencyConfig={setCurrencyConfig}
          masterData={masterData}
          updateField={updateField}
          setSupplierModalOpen={setSupplierModalOpen}
          setLocationModalOpen={setLocationModalOpen}
          setPiModalOpen={setPiModalOpen}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <DebitNoteLines
        lines={lines}
        setLines={setLines}
        isReadonly={isFormDisabled}
        debitNote={note}
        refreshLines={refreshLines}
      />

      <div className="  bg-white  border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 pl-4 pr-4">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isFormDisabled}
                className={`${inputStyle} font-mono`}
                value={note.internal_notes || ""}
                onChange={(e) => updateField("internal_notes", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                disabled={isFormDisabled}
                className={`${inputStyle} font-mono`}
                value={note.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 col">
                  Conversion Rate
                </span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  disabled={isFormDisabled}
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  value={Number(currencyConfig.exchange_rate).toFixed(2) ?? ""}
                  onChange={(e) =>
                    setCurrencyConfig({
                      ...currencyConfig,
                      exchange_rate: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className="text-xs font-semibold text-slate-500">
                Amount Incl. VAT ({baseCurrencyCode})
              </span>
              <div className="p-1.5 bg-white dark:bg-slate-950 text-end border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold max-w-[100px] rounded">
                {financials.amountInclVatLCY.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-right font-mono ml-auto w-full max-w-sm">
            <div className="flex justify-between pb-1">
              <span className="font-semibold">Amount</span>
              <span>
                {financials.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                {selectedCurrency?.code || ""}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="font-semibold">VAT</span>
              <span>
                {financials.vat.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                {selectedCurrency?.code || ""}
              </span>
            </div>
            <div className="flex justify-between  pt-1 text-slate-900 dark:text-white">
              <span className="font-semibold">Amount Incl. VAT</span>
              <span>
                {financials.amountInclVat.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                {selectedCurrency?.code || ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 bg-slate-50 dark:bg-slate-900/60 pl-4 pr-4 pb-4 rounded-lg">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{" "}
              Partially Allocated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
              Allocated Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
              Stock Received
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isUpdateMode && (
              <>
                <button
                  type="button"
                  // onClick={handlePostInvoice}
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={isPosting || isCompleted}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Post Invoice
                </button>

                <button
                  type="button"
                  // onClick={handleDispatchStock}
                  onClick={() => setShowDispatchModal(true)}
                  disabled={isPosting || isFullyDispatched || isCompleted}
                  className={`px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors ${
                    isFullyDispatched || isCompleted
                      ? "text-amber-500 dark:text-amber-400 opacity-60 cursor-not-allowed"
                      : "text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  Dispatch Stock
                </button>
              </>
            )}

            {!isCompleted && (
              <>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => router.push(`/${slug}/purchases/debit-notes`)}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StockReceiveConfirmModal
        isOpen={showDispatchModal}
        title="Confirmation"
        message="Are you sure you want to Dispatch the stock?"
        onConfirm={handleDispatchStock}
        onCancel={() => setShowDispatchModal(false)}
        loading={isPosting}
      />

      <StockReceiveConfirmModal
        isOpen={showInvoiceModal}
        title="Confirmation"
        message="Are you sure you want to post the invoice for this Debit Note?"
        onConfirm={handlePostInvoice}
        onCancel={() => setShowInvoiceModal(false)}
        loading={isPosting}
      />

      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      />

      {/* Modal to Select Location */}
      <SupplierShippingLocationsModal
        open={locationModalOpen}
        supplierId={note.supplier_id}
        onClose={() => setLocationModalOpen(false)}
        onSelect={(selectedLocation) => {
          setShippingAddress({
            name: selectedLocation.name,
            address_1: selectedLocation.address_1,
            address_2: selectedLocation.address_2,
            city: selectedLocation.city,
            county: selectedLocation.county,
            postcode: selectedLocation.postcode,
            country: selectedLocation.country,
            contact_person: selectedLocation.contact_person,
            phone: selectedLocation.phone,
            email: selectedLocation.email,
          });
        }}
      />

      <PurchaseInvoiceLookupModal
        isOpen={piModalOpen}
        onClose={() => setPiModalOpen(false)}
        supplierId={note.supplier_id}
        supplierCode={note.supplier_no}
        supplierName={note.supplier_name}
        onSelectInvoice={handleSelectPurchaseInvoice}
      />
    </div>
  );
};
/* const handleDispatchStock = async () => {
    if (!id) return;
    try {
      show("Dispatching stock return...");
      const res = await fetch(`/api/debit-notes/${id}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      hide();

      if (data.success) {
        toast.success("Stock dispatched successfully!");
        refreshLines();
      } else {
        toast.error(data.error || "Failed to dispatch stock.");
      }
    } catch (err) {
      hide();
      toast.error("An error occurred while dispatching stock.");
    }
  };
  const handlePostInvoice = async () => {
    if (!id) return;
    try {
      show("Posting financial entry...");
      const res = await fetch(`/api/debit-notes/${id}/post-invoice`, {
        method: "POST",
      });
      const data = await res.json();
      hide();

      if (data.success) {
        toast.success("Debit note posted successfully!");
        refreshLines();
      } else {
        toast.error(data.error || "Failed to post debit note.");
      }
    } catch (err) {
      hide();
      toast.error("An error occurred while posting debit note.");
    }
  };
    */
{
  /* <div className="flex items-center gap-2">
              {!note.is_dispatched && (
                <button
                  type="button"
                  onClick={handleDispatchStock}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-1"
                >
                  <Icon icon="tabler:truck-delivery" className="w-4 h-4" />
                  Dispatch Stock
                </button>
              )}

              {!note.is_posted && (
                <button
                  type="button"
                  onClick={handlePostInvoice}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1"
                >
                  <Icon icon="tabler:file-check" className="w-4 h-4" />
                  Post Invoice
                </button>
              )}
            </div> */
}

{
  /* <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Edit / Save
            </button> */
}

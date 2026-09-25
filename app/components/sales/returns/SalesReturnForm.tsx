// /app/components/sales/returns/SalesReturnForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { useLoader } from "@/app/context/LoaderContext";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLineUI,
  SalesReturnMasterData,
} from "@/types/sales-return";

import SalesReturnLines from "./SalesReturnLines";
import { ReturnFormTabs } from "./ReturnFormTabs";

import { GeneralConfirmModal } from "../../shared/modals/GeneralConfirmModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import SalespersonLookupModal, {
  Employee,
} from "../../shared/modals/SalespersonLookupModal";

import {
  PurchaseOrderLookupItem,
  PurchaseOrderMultiLookupModal,
} from "../../shared/modals/PurchaseOrderMultiLookupModal";

import {
  validateSalesReturn,
  validateSalesReturnForPosting,
} from "./utils/salesReturn.validation";

import {
  calculateSalesReturnFinancials,
  isSalesReturnFullyReceived,
} from "./utils/salesReturn.calculations";

import { useSalesReturnState } from "./hooks/useSalesReturnState";
import { useSalesReturnData } from "./hooks/useSalesReturnData";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "../orders/CustomerLookupModal";
import CustomerDeliveryLocationModal from "../orders/CustomerDeliveryLocationModal";
import {
  SalesInvoiceLookupItem,
  SalesInvoiceLookupModal,
} from "./SalesInvoiceLookupModal";
import { StockReceiveConfirmModal } from "../../shared/modals/StockReceiveConfirmModal";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

type FetchLinesAPIResponse = {
  lines?: SalesReturnLineUI[];
  success?: boolean;
  error?: string;
};

type CustomerSelectionSource = "general" | "invoicing" | "shipping_agent";

type TabType = "general" | "invoicing" | "shipping" | "attachments";

export const SalesReturnForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { show, hide } = useLoader();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";

  const state = useSalesReturnState({
    id,
    isReadOnly,
  });

  const {
    activeTab,
    setActiveTab,

    saving,
    setSaving,

    validationErrors,
    setValidationErrors,

    customerSelectionSource,
    setCustomerSelectionSource,

    showCustomerChangeModal,
    setShowCustomerChangeModal,

    customerModalOpen,
    setCustomerModalOpen,

    locationModalOpen,
    setLocationModalOpen,

    POModalOpen,
    setPOModalOpen,

    SalespersonModalOpen,
    setSalespersonModalOpen,

    isEditMode,
    setIsEditMode,

    isUpdatingStatus,
    setIsUpdatingStatus,

    showReceiveModal,
    setShowReceiveModal,

    showCreditNoteModal,
    setShowCreditNoteModal,

    showReceiveAndPostModal,
    setShowReceiveAndPostModal,

    isPosting,
    setIsPosting,

    masterData,
    setMasterData,

    returnOrder,
    setReturnOrder,

    primaryAddress,
    setPrimaryAddress,

    billingAddress,
    setBillingAddress,

    shippingAddress,
    setShippingAddress,

    lines,
    setLines,

    currencyConfig,
    setCurrencyConfig,
  } = state;

  const isUpdateMode = !!id;

  const [SalesPersonModalOpen, setSalesPersonModalOpen] = useState(false);
  const [SIModalOpen, setSIModalOpen] = useState(false);

  // Add states for modal control
  const [showShipModal, setShowShipModal] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const stages = masterData?.stages ?? [];

  const isLoadingStages = !masterData;

  const isCompleted =
    returnOrder.status === "completed" || returnOrder.status === "POSTED";

  const isFormDisabled = !isEditMode || isCompleted;

  useSalesReturnData({
    id,
    setReturnOrder,
    setLines,
    setPrimaryAddress,
    setBillingAddress,
    setShippingAddress,
    setCurrencyConfig,
    setMasterData,
    show,
    hide,
  });

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find(
        (currency) => currency.id === currencyConfig.currency_id,
      ) ?? null
    );
  }, [masterData, currencyConfig.currency_id]);

  const financials = useMemo(
    () =>
      calculateSalesReturnFinancials(
        lines,
        Number(currencyConfig.exchange_rate),
      ),
    [lines, currencyConfig.exchange_rate],
  );

  const hasSelectedLineItem = useMemo(
    () => lines.some((line) => !!line.item_id || !!line.gl_account_id),
    [lines],
  );

  const isFullyReceived = useMemo(
    () => isSalesReturnFullyReceived(lines),
    [lines],
  );

  const handleGeneralCustomerSelection = () => {
    setCustomerSelectionSource("general");

    if (hasSelectedLineItem) {
      setShowCustomerChangeModal(true);
      return;
    }
    setCustomerModalOpen(true);
  };

  const handleInvoicingCustomerSelection = () => {
    setCustomerSelectionSource("invoicing");

    if (hasSelectedLineItem) {
      setShowCustomerChangeModal(true);
      return;
    }
    setCustomerModalOpen(true);
  };

  const handleShippingAgentSelection = () => {
    setCustomerSelectionSource("shipping_agent");
    setCustomerModalOpen(true);
  };

  const handleConfirmCustomerChange = () => {
    setLines([]);
    setShowCustomerChangeModal(false);
    setCustomerModalOpen(true);
    toast.info(
      "Credit note lines have been cleared. Please select a customer.",
    );
  };

  const handleCancelCustomerChange = () => {
    setShowCustomerChangeModal(false);
  };

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    if (customerSelectionSource === "invoicing") {
      setReturnOrder((prev) => ({
        ...prev,
        bill_to_customer_id: customer.id,
        bill_to_customer_no: customer.customer_code,
        bill_to_customer_name: customer.name,
      }));

      if (customer.billing_address) setBillingAddress(customer.billing_address);
      setCustomerModalOpen(false);
      return;
    }

    if (customerSelectionSource === "shipping_agent") {
      setReturnOrder((prev) => ({
        ...prev,
        shipping_agent: `${customer.customer_code} - ${customer.name}`,
      }));

      setCustomerModalOpen(false);
      return;
    }

    setReturnOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_no: customer.customer_code,
      customer_name: customer.name,

      bill_to_customer_id: customer.id,
      bill_to_customer_no: customer.customer_code,
      bill_to_customer_name: customer.name,

      email: customer.email || prev.email,

      customer_posting_group_id: customer.posting_group || "",
      vat_business_posting_group_id: customer.posting_group || "",

      anonymous_customer: customer.anonymous_customer ?? false,
      salesperson: customer.salesperson_code || "",

      contact: customer.finance_contact_person || "",
      receivable_bank: customer.payable_bank || "",
      payment_terms_id: customer.payment_terms || "",
      payment_method_id: customer.payment_method || "",
    }));

    if (customer.primary_address) setPrimaryAddress(customer.primary_address);
    if (customer.billing_address) setBillingAddress(customer.billing_address);
    if (customer.shipping_address)
      setShippingAddress(customer.shipping_address);

    if (customer.currency_id) {
      const matchedCurr = masterData?.currencies.find(
        (c) => c.id === customer.currency_id,
      );
      setCurrencyConfig({
        currency_id: customer.currency_id,
        exchange_rate: matchedCurr?.exchange_rate || 1,
      });
    }

    setCustomerModalOpen(false);
  };

  const handleSelectPurchaseOrders = (
    selectedOrders: PurchaseOrderLookupItem[],
  ) => {
    const codes = selectedOrders.map((o) => o.order_no).join(", ");
    setReturnOrder((prev) => ({
      ...prev,
      link_to_po: codes,
    }));
    setPOModalOpen(false);
  };

  const handleSalesPersonSelect = (emp: Employee) => {
    setReturnOrder((prev) => ({
      ...prev,
      salesperson: `${emp.employee_code}-${emp.display_name}`,
    }));
    setSalespersonModalOpen(false);
  };

  const handlePurchaseOrderSelection = () => {
    setPOModalOpen(true);
  };

  const handleSalesPersonSelection = () => {
    setSalesPersonModalOpen(true);
  };

  const handleSelectSalesInvoice = async (invoice: SalesInvoiceLookupItem) => {
    setReturnOrder((prev) => ({
      ...prev,
      sales_invoice: invoice.sales_invoice_no,
      sales_invoice_id: invoice.id,
    }));
    setSIModalOpen(false);

    // Fetch Lines from selected Sales Invoice to allocate stock quantities
    try {
      show("Fetching invoice lines...");
      const res = await fetch(`/api/sales/sales-orders/${invoice.id}`);
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
          const mappedLines: SalesReturnLineUI[] = fetchedRawLines.map(
            (l: SalesReturnLineUI, idx: number) => ({
              ...l,
              id: undefined,

              _stableKey:
                l._stableKey ||
                l.id ||
                `invoice-line-${invoice.id}-${idx}-${crypto.randomUUID()}`,

              line_no: idx + 1,
              sales_invoice_line_id: l.id || l.sales_invoice_line_id,

              line_type: l.line_type || "ITEM",

              item_id: l.item_id,
              item_code: l.item_code || "",
              item_name: l.item_name || l.description || "",

              description: l.description || "",

              warehouse_id: l.warehouse_id || "",
              warehouse_name: l.warehouse_name || "",
              //   warehouse_location_id: l.warehouse_location_id,

              uom_id: l.uom_id || "",
              uom_name: l.uom_name || "",

              gl_account_id: l.gl_account_id,
              account_code: l.account_code,

              quantity: Number(l.quantity || 0),
              unit_price: Number(l.unit_price || 0),

              discount_type: l.discount_type || "PERCENT",
              discount_value: Number(l.discount_value || 0),
              discount_amount: Number(l.discount_amount || 0),

              original_amount: Number(
                l.original_amount ??
                  Number(l.quantity || 0) * Number(l.unit_price || 0),
              ),

              vat_percent: Number(l.vat_percent || 0),
              vat_amount: Number(l.vat_amount || 0),
              net_amount: Number(l.net_amount || 0),
              gross_amount: Number(l.gross_amount || 0),

              allocations: [],
              initialAllocations: [],
              is_allocated: false,
              returned_quantity: Number(l.returned_quantity || 0),
            }),
          );

          setLines(mappedLines);
          toast.success(
            `Imported ${mappedLines.length} line items from Sales Invoice ${invoice.sales_invoice_no}`,
          );
        }
      }
    } catch (err) {
      hide();
      console.error("Failed to load Sales invoice lines:", err);
      toast.error("Error populating lines from Sales invoice.");
    }
  };

  const updateReturnField = <K extends keyof SalesReturn>(
    field: K,
    value: SalesReturn[K],
  ) => {
    setReturnOrder((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (includeLines = true): boolean => {
    const errors = validateSalesReturn(
      returnOrder,
      lines,
      currencyConfig.currency_id,
      includeLines,
    );

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateBeforePosting = (): boolean => {
    const errors = validateSalesReturnForPosting(lines);

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const refreshLines = async () => {
    if (!returnOrder.id) return;

    try {
      const response = await fetch(
        `/api/sales/sales-returns/${returnOrder.id}/lines`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch lines: ${response.statusText}`);
      }

      const data: FetchLinesAPIResponse = await response.json();
      setLines(data.lines ?? []);
    } catch (error) {
      console.error("Error refreshing sales return lines:", error);
    }
  };

  const saveSalesReturn = async (
    requireLines = false,
  ): Promise<string | null> => {
    if (!validateForm(!requireLines)) {
      return null;
    }

    show("Saving Return...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        returnOrder: {
          ...returnOrder,
          ...currencyConfig,
          subtotal: financials.amount,
          vat_amount: financials.vat,
          total_amount: financials.amountInclVat,
        },
        primary_address: primaryAddress,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines,
        allow_empty_lines: requireLines,
      };

      const response = await fetch(
        id ? `/api/sales/sales-returns/${id}` : "/api/sales/sales-returns",
        {
          method: id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error saving Credit Note.");
      }

      const targetId = id || result?.data?.id;

      if (!targetId) {
        throw new Error("Credit Note saved, but no ID was returned.");
      }

      toast.success(id ? "Credit Note Updated" : "Credit Note Created");

      setReturnOrder((prev) => ({
        ...prev,
        ...(result?.data || {}),
        id: targetId,
      }));

      await fetchLatestLines(targetId);

      return targetId;
    } catch (error) {
      if (error instanceof Error) {
        setValidationErrors([error.message]);
        toast.error(error.message);
      }
      return null;
    } finally {
      setSaving(false);
      hide();
    }
  };

  const fetchLatestLines = async (targetId: string) => {
    try {
      const response = await fetch(
        `/api/sales/sales-returns/${targetId}/lines`,
      );
      if (!response.ok) return;

      const data = await response.json();
      if (data.lines) {
        setLines(data.lines);
      }
    } catch (error) {
      console.error("Failed to re-fetch Credit Note lines:", error);
    }
  };

  const validateBeforeStockAction = (): boolean => {
    const errors = validateSalesReturnForPosting(lines);

    setValidationErrors(errors);

    return errors.length === 0;
  };

  const handleSave = async () => {
    const targetId = await saveSalesReturn(false);

    if (!targetId) return;

    if (id) {
      setIsEditMode(false);
      router.refresh();
    } else {
      router.replace(`/${slug}/sales/returns/${targetId}/edit`);
    }
  };

  const handleStageClick = async (targetStage: {
    id: string;
    name: string;
  }) => {
    if (!id || isUpdatingStatus || returnOrder.stage_id === targetStage.id)
      return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-returns/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStage.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update stage");

      setReturnOrder((prev) => ({ ...prev, stage_id: targetStage.id }));
      toast.success(`Moved to stage: ${targetStage.name}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error(
        error instanceof Error ? error.message : "Error updating stage",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePostCreditNoteClick = () => {
    if (!validateBeforePosting()) return;
    setShowCreditNoteModal(true);
  };

  const handlePostCreditNote = async () => {
    if (!id) return;

    if (!validateBeforePosting()) return;

    setIsPosting(true);
    show("Posting Credit Note...");

    try {
      toast.loading("Posting credit note...", {
        id: "action-toast",
      });

      const response = await fetch(`/api/sales/sales-returns/${id}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: returnOrder.customer_id,
          reference: returnOrder.reference,
          posting_date:
            returnOrder.posting_date || new Date().toISOString().split("T")[0],
          credit_note_date: returnOrder.credit_note_date,
          financials: financials,
          currency_id: returnOrder.currency_id,
          exchange_rate: returnOrder.exchange_rate,
          returnOrder: returnOrder,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to post Credit Note");
      }

      toast.success("Credit Note posted successfully!", {
        id: "action-toast",
      });

      setShowCreditNoteModal(false);
      router.push(`/${slug}/sales/returns/new`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error posting credit note",
        {
          id: "action-toast",
        },
      );
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  const handleReceiveStock = async () => {
    if (!id) return;

    if (!validateBeforeStockAction()) {
      return;
    }

    setIsPosting(true);

    show("Saving and Receiving Record...");

    try {
      toast.loading("Processing stock receive...", {
        id: "action-toast",
      });

      const payload = {
        receive: {
          customer_id: returnOrder.customer_id,
          warehouse_id: null, // pass if available on header
          dispatch_date:
            returnOrder.order_date || new Date().toISOString().split("T")[0],
          posting_date:
            returnOrder.posting_date || new Date().toISOString().split("T")[0],
          reference: returnOrder.reference,
          notes: returnOrder.notes,
          currency_id: returnOrder.currency_id,
          exchange_rate: returnOrder.exchange_rate,
        },
      };

      const response = await fetch(`/api/sales/sales-orders/${id}/receive`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to receive stock");
      }

      toast.success("Stock received successfully!", {
        id: "action-toast",
      });

      setShowReceiveModal(false);

      await refreshLines();

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error receiving stock",
        {
          id: "action-toast",
        },
      );
    } finally {
      setIsPosting(false);

      hide();
    }
  };

  /*
   * ------------------------------------------------------------
   * Receive + Post Invoice
   * ------------------------------------------------------------
   */

  const handleReceiveAndPost = async () => {
    if (!id) return;

    if (!validateBeforeStockAction()) {
      return;
    }

    setIsPosting(true);

    show("Receiving Stock & Posting Invoice...");

    try {
      toast.loading("Receiving stock and posting sales invoice...", {
        id: "action-toast",
      });

      const response = await fetch(
        `/api/sales/sales-orders/${id}/receive-and-post`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer_id: returnOrder.customer_id,
            customer_invoice_no: returnOrder.reference,
            reference: returnOrder.reference,
            invoice_date: returnOrder.posting_date,
            posting_date: returnOrder.dispatch_date,
            order_date: returnOrder.order_date,
            dispatch_date: returnOrder.dispatch_date,
            financials: financials,
            currency_id: returnOrder.currency_id,
            exchange_rate: returnOrder.exchange_rate,
            order: returnOrder,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to receive stock and post invoice.",
        );
      }

      toast.success("Stock received and invoice posted successfully!", {
        id: "action-toast",
      });

      setShowReceiveAndPostModal(false);

      router.push(`/${slug}/sales/orders/new`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error processing operation.",
        {
          id: "action-toast",
        },
      );
    } finally {
      setIsPosting(false);

      hide();
    }
  };

  const handlePostInvoiceClick = () => {
    if (!validateBeforeStockAction()) {
      return;
    }

    const allGLAccountLines = lines.every(
      (line) => (line.line_type || "ITEM") === "GL_ACCOUNT",
    );

    if (!isFullyReceived && !allGLAccountLines) {
      setShowReceiveAndPostModal(true);
    } else {
      setShowCreditNoteModal(true);
    }
  };

  const handlePostInvoice = async () => {
    if (!id) return;

    if (!validateBeforeStockAction()) {
      return;
    }

    setIsPosting(true);

    show("Posting Invoice...");

    try {
      toast.loading("Posting sales invoice...", {
        id: "action-toast",
      });

      const response = await fetch(
        `/api/sales/sales-orders/${id}/post-invoice`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer_id: returnOrder.customer_id,
            customer_invoice_no: returnOrder.reference,
            reference: returnOrder.reference,
            invoice_date: returnOrder.posting_date,
            posting_date: returnOrder.dispatch_date,
            order_date: returnOrder.order_date,
            dispatch_date: returnOrder.dispatch_date,
            financials: financials,
            currency_id: returnOrder.currency_id,
            exchange_rate: returnOrder.exchange_rate,
            order: returnOrder,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to post sales invoice");
      }

      toast.success("Sales invoice posted!", {
        id: "action-toast",
      });

      setShowCreditNoteModal(false);

      router.push(`/${slug}/sales/orders/new`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error posting invoice",
        {
          id: "action-toast",
        },
      );
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
      <Breadcrumbs
        items={[
          {
            label: "Credit Notes",
            href: `/${slug}/sales/returns`,
          },
          {
            label:
              returnOrder.credit_note_no ||
              returnOrder.posted_credit_note_no ||
              "New Credit Note",
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">Credit Note</h1>
        {returnOrder.credit_note_no && (
          <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 rounded text-xs font-mono">
            {`CN No. ${returnOrder.credit_note_no}`}
          </div>
        )}
      </div>
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
            This Credit Note is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] capitalize font-bold tracking-wider">
            Read Only
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
            {(
              ["general", "invoicing", "shipping", "attachments"] as TabType[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold capitalize tracking-wider border-b-2 transition whitespace-nowrap ${
                  activeTab === tab
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {isUpdateMode &&
            !isLoadingStages &&
            stages.length > 0 &&
            (() => {
              // Find current stage index in the sorted stages array
              const currentStageIndex = stages.findIndex(
                (s) => s.id === returnOrder.stage_id,
              );

              return (
                <div className="flex justify-end ml-auto overflow-x-auto">
                  <div
                    className={`flex items-center min-w-max text-xs font-bold select-none ${
                      isUpdatingStatus ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {stages.map((stage, index) => {
                      const isFirst = index === 0;
                      const isLast = index === stages.length - 1;
                      const isActive = index === currentStageIndex;
                      const isPassed =
                        currentStageIndex !== -1 && index < currentStageIndex;

                      // Determine button styling based on state
                      let buttonStyles =
                        "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300";

                      if (isActive) {
                        // Highlight color for the current active stage
                        buttonStyles =
                          "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20";
                      } else if (isPassed) {
                        // Blue color indicating completed/cleared previous stages
                        buttonStyles =
                          "bg-blue-400 text-white hover:bg-blue-600";
                      }

                      return (
                        <button
                          type="button"
                          key={stage.id}
                          onClick={() => handleStageClick(stage)}
                          className={`px-3.5 py-1.5 flex items-center gap-1.5 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95
                                            ${isFirst ? "rounded-l-md" : ""} 
                                            ${isLast ? "rounded-r-md" : ""} 
                                            ${buttonStyles}`}
                        >
                          {isPassed && (
                            <Icon
                              icon="tabler:check"
                              className="w-3.5 h-3.5 text-blue-100"
                            />
                          )}
                          <span>{stage.name}</span>
                          {!isLast && (
                            <Icon
                              icon="tabler:chevron-right"
                              className={`w-3.5 h-3.5 ml-1 ${
                                isPassed || isActive
                                  ? "text-white/70"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>

        <ReturnFormTabs
          activeTab={activeTab}
          returnOrder={returnOrder}
          primaryAddress={primaryAddress}
          setPrimaryAddress={setPrimaryAddress}
          billingAddress={billingAddress}
          setBillingAddress={setBillingAddress}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          currencyConfig={currencyConfig}
          setCurrencyConfig={setCurrencyConfig}
          masterData={masterData}
          updateField={updateReturnField}
          onGeneralCustomerSelect={handleGeneralCustomerSelection}
          onInvoicingCustomerSelect={handleInvoicingCustomerSelection}
          setLocationModalOpen={setLocationModalOpen}
          setSIModalOpen={setSIModalOpen}
          onShippingAgentSelect={handleShippingAgentSelection}
          setSalesPersonModalOpen={handleSalesPersonSelection}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <SalesReturnLines
          lines={lines}
          setLines={setLines}
          isReadonly={isFormDisabled}
          salesReturn={returnOrder}
          refreshLines={refreshLines}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isReadOnly}
                className={`${inputStyle} font-mono`}
                value={returnOrder.internal_notes || ""}
                onChange={(e) =>
                  updateReturnField("internal_notes", e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                disabled={isReadOnly}
                className="w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-slate-100 dark:bg-slate-800/80  outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200"
                value={returnOrder.notes || ""}
                onChange={(e) => updateReturnField("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  Conversion Rate
                </span>
              </div>
              <div>
                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) || 1}
                  allowDecimals={true}
                  decimalScale={6}
                  disabled={isFormDisabled}
                  className={`${inputStyle} font-mono text-end`}
                  onChange={(val) =>
                    setCurrencyConfig({
                      ...currencyConfig,
                      exchange_rate: Number(val) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className="text-xs font-semibold text-slate-500">
                Amount Incl. VAT (LCY: {baseCurrencyCode})
              </span>
              <div className="p-1.5 bg-white dark:bg-slate-950 text-end border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold max-w-[100px] rounded">
                {financials.amountInclVatLCY.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-right font-mono ml-auto w-full max-w-sm">
            {financials.totalDiscount > 0 && (
              <>
                <div className="flex justify-between pb-1 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Original Amount</span>
                  <span>
                    {financials.originalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {selectedCurrency?.code || ""}
                  </span>
                </div>
                <div className="flex justify-between pb-1 text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">Discount</span>
                  <span>
                    -
                    {financials.totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {selectedCurrency?.code || ""}
                  </span>
                </div>
              </>
            )}

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

        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />{" "}
              Pending Allocation
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
                <Button
                  type="button"
                  variant="post"
                  onClick={handlePostInvoiceClick}
                  disabled={isPosting || isCompleted}
                >
                  Post Invoice
                </Button>

                <Button
                  type="button"
                  variant="dispatch"
                  onClick={() => {
                    if (!validateBeforeStockAction()) {
                      return;
                    }

                    setShowReceiveModal(true);
                  }}
                  disabled={isPosting || isFullyReceived || isCompleted}
                >
                  Receive Stock
                </Button>
              </>
            )}

            {!isCompleted && (
              <>
                {!isEditMode ? (
                  <Button
                    type="button"
                    variant="edit"
                    onClick={() => setIsEditMode(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="save"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )}
              </>
            )}

            <Button
              type="button"
              onClick={() => router.push(`/${slug}/sales/orders`)}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}

      <GeneralConfirmModal
        isOpen={showCustomerChangeModal}
        title="Change Customer"
        message="This sales order contains line items. All line items must be deleted before the customer can be changed. Do you want to delete the existing line items and continue?"
        onConfirm={handleConfirmCustomerChange}
        onCancel={handleCancelCustomerChange}
        loading={false}
      />

      {customerModalOpen && (
        <CustomerLookupModal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          onSelect={handleCustomerSelect}
        />
      )}

      {POModalOpen && (
        <PurchaseOrderMultiLookupModal
          isOpen={POModalOpen}
          onClose={() => setPOModalOpen(false)}
          onSelectOrders={handleSelectPurchaseOrders}
          selectedOrderNos={
            returnOrder.link_to_po
              ? returnOrder.link_to_po.split(",").map((s) => s.trim())
              : []
          }
        />
      )}

      {SalesPersonModalOpen && (
        <SalespersonLookupModal
          open={SalesPersonModalOpen}
          onClose={() => setSalesPersonModalOpen(false)}
          onSelect={handleSalesPersonSelect}
        />
      )}

      {locationModalOpen && (
        <CustomerDeliveryLocationModal
          open={locationModalOpen}
          customerId={returnOrder.customer_id}
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
      )}

      <SalesInvoiceLookupModal
        isOpen={SIModalOpen}
        onClose={() => setSIModalOpen(false)}
        customerId={returnOrder.customer_id}
        customerCode={returnOrder.customer_no}
        customerName={returnOrder.customer_name}
        onSelectInvoice={handleSelectSalesInvoice}
      />

      {/* ======================================================
          Receive CONFIRMATION
          ====================================================== */}

      <StockReceiveConfirmModal
        isOpen={showReceiveModal}
        title="Confirmation"
        message="Are you sure you want to receive the stock?"
        onConfirm={handleReceiveStock}
        onCancel={() => setShowReceiveModal(false)}
        loading={isPosting}
      />

      {/* ======================================================
          POST INVOICE CONFIRMATION
          ====================================================== */}

      <GeneralConfirmModal
        isOpen={showCreditNoteModal}
        title="Confirmation"
        message="Are you sure you want to post this Credit Note?"
        onConfirm={handlePostCreditNote}
        onCancel={() => setShowCreditNoteModal(false)}
        loading={isPosting}
      />

      {/* ======================================================
          Receive + POST
          ====================================================== */}

      <GeneralConfirmModal
        isOpen={showReceiveAndPostModal}
        title="Stock Receipt Required"
        message={
          <>
            Stock has not been received for this order. Would you like to
            receive the stock automatically and post the Credit Note?
          </>
        }
        onConfirm={handleReceiveAndPost}
        onCancel={() => setShowReceiveAndPostModal(false)}
        loading={isPosting}
      />
    </div>
  );
};

export default SalesReturnForm;

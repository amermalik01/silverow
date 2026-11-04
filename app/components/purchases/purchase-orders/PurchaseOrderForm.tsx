// app/components/purchases/purchase-orders/PurchaseOrderForm.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLine,
  PurchaseOrderLineUI,
  PurchaseOrderMasterData,
  PO_StockAllocationRecord,
} from "@/types/purchase-order";

type FetchLinesAPIResponse = {
  lines?: PurchaseOrderLineUI[];
  success?: boolean;
  error?: string;
};

import PurchaseOrderLines from "./PurchaseOrderLines";
import { OrderFormTabs } from "./OrderFormTabs";
import { StockReceiveConfirmModal } from "@/app/components/shared/modals/StockReceiveConfirmModal";
import SupplierLookupModal, { SupplierLookupItem } from "./SupplierLookupModal";
import SupplierShippingLocationsModal from "./SupplierShippingLocationsModal";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { GeneralConfirmModal } from "../../shared/modals/GeneralConfirmModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../sales/orders/CustomerLookupModal";
import {
  PurchaseOrderLookupItem,
  PurchaseOrderMultiLookupModal,
} from "../../shared/modals/PurchaseOrderMultiLookupModal";
import {
  SalesOrderLookupItem,
  SalesOrderLookupModal,
} from "../../shared/modals/SalesOrderLookupModal";

import SalespersonLookupModal, {
  Employee,
} from "../../shared/modals/SalespersonLookupModal";

import MigrationUploadModal from "@/app/components/migration/MigrationUploadModal";
import {
  validatePurchaseOrder,
  validatePurchaseOrderForStockAction,
} from "./utils/purchaseOrder.validation";

import {
  calculatePurchaseOrderFinancials,
  isPurchaseOrderFullyReceived,
} from "./utils/purchaseOrder.calculations";

import {
  validateReceiptScope,
  type ReceiptScope,
} from "./utils/purchaseOrder.stock-validation";

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

type TabType = "general" | "invoicing" | "shipping" | "attachments";

type SupplierSelectionSource = "general" | "invoicing" | "shipping_agent";

export const PurchaseOrderForm: React.FC<Props> = ({
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

  const [supplierSelectionSource, setSupplierSelectionSource] =
    useState<SupplierSelectionSource>("general");
  const [showSupplierChangeModal, setShowSupplierChangeModal] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);

  const [POModalOpen, setPOModalOpen] = useState(false);
  const [SOModalOpen, setSOModalOpen] = useState(false);

  const [PurchaserModalOpen, setPurchaserModalOpen] = useState(false);

  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationPurchaseOrderId, setMigrationPurchaseOrderId] = useState<
    string | null
  >(null);

  const [selectedReceiptLineIds, setSelectedReceiptLineIds] = useState<
    string[]
  >([]);

  // Manage view/edit state locally
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Add states for modal control
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showReceiveAndPostModal, setShowReceiveAndPostModal] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<PurchaseOrderMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  const [order, setOrder] = useState<Partial<PurchaseOrder>>({
    order_no: id ? "" : "", // [Auto-Generated]
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",

    pay_to_supplier_id: "",
    pay_to_supplier_no: "",
    pay_to_supplier_name: "",

    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({ address_type: "billing" });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<PurchaseOrderAddress>
  >({ address_type: "shipping" });

  const [lines, setLines] = useState<PurchaseOrderLineUI[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  const isCompleted = order.status === "completed" || order.status === "POSTED";
  const isFormDisabled = !isEditMode || isCompleted;

  // Check if all line items with quantity > 0 have been received

  const isFullyReceived = useMemo(
    () => isPurchaseOrderFullyReceived(lines),
    [lines],
  );

  useEffect(() => {
    if (!id) return;

    show("Fetching Record...");
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hide();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          setOrder(actualData.order || {});
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
            currency_id: actualData.order?.currency_id || "",
            exchange_rate: actualData.order?.exchange_rate || 1,
          });
        }
      })
      .catch((err) =>
        console.error("Error hydrating historical document matrix:", err),
      );
  }, [id]);

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

  const getReceiptScope = (): ReceiptScope => {
    if (selectedReceiptLineIds.length > 0) {
      return {
        type: "SELECTED_LINES",
        lineIds: selectedReceiptLineIds,
      };
    }

    return { type: "ALL_LINES" };
  };

  const refreshLines = async () => {
    if (!order.id) return;

    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/lines`);

      if (!response.ok) {
        throw new Error(`Failed to fetch lines: ${response.statusText}`);
      }

      const data: FetchLinesAPIResponse = await response.json();

      // const data = await response.json();
      // setLines(data.lines ?? []);

      const formattedLines: PurchaseOrderLineUI[] = (data.lines ?? []).map(
        (line) => {
          const resolvedAllocations: PO_StockAllocationRecord[] =
            line.allocations ??
            line.stock_allocations ??
            line.po_line_allocations ??
            [];

          return {
            ...line,
            // Maintain UI state keys for table iteration
            _stableKey: line._stableKey || line.id || `line-${line.line_no}`,
            allocations: resolvedAllocations,
            initialAllocations: resolvedAllocations,
            // is_allocated: resolvedAllocations.length > 0,
            is_allocated:
              Number(line.quantity) > 0 &&
              Math.abs(
                resolvedAllocations.reduce(
                  (sum, allocation) => sum + Number(allocation.quantity ?? 0),
                  0,
                ) - Number(line.quantity),
              ) < 0.000001,
          };
        },
      );

      setLines(formattedLines);
    } catch (err) {
      console.error("Error refreshing purchase order lines:", err);
    }
  };

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  const financials = useMemo(
    () =>
      calculatePurchaseOrderFinancials(
        lines,
        Number(currencyConfig.exchange_rate),
      ),
    [lines, currencyConfig.exchange_rate],
  );

  const hasSelectedLineItem = useMemo(() => {
    return lines.some((line) => {
      return !!line.item_id || !!line.gl_account_id;
    });
  }, [lines]);

  const handleGeneralSupplierSelection = () => {
    setSupplierSelectionSource("general");

    if (hasSelectedLineItem) {
      setShowSupplierChangeModal(true);
      return;
    }
    setSupplierModalOpen(true);
  };

  const handleInvoicingSupplierSelection = () => {
    setSupplierSelectionSource("invoicing");

    if (hasSelectedLineItem) {
      setShowSupplierChangeModal(true);
      return;
    }
    setSupplierModalOpen(true);
  };

  const handleConfirmSupplierChange = () => {
    // Remove all existing PO lines.
    setLines([]);
    // setLines([createEmptyPurchaseOrderLine()]);

    // Close confirmation modal.
    setShowSupplierChangeModal(false);

    // Now allow supplier selection.
    setSupplierModalOpen(true);
    toast.info(
      "Purchase order lines have been cleared. Please select a supplier.",
    );
  };

  const handleCancelSupplierChange = () => {
    setShowSupplierChangeModal(false);
  };

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    if (supplierSelectionSource === "invoicing") {
      // --------------------------------------------
      // INVOICING TAB
      // Only update Pay To Supplier + Billing Address
      // --------------------------------------------
      setOrder((prev) => ({
        ...prev,
        pay_to_supplier_id: supplier.id,
        pay_to_supplier_no: supplier.supplier_code,
        pay_to_supplier_name: supplier.name,
      }));

      if (supplier.billing_address) setBillingAddress(supplier.billing_address);

      setSupplierModalOpen(false);
      return;
    }

    // Shipping Agent
    if (supplierSelectionSource === "shipping_agent") {
      setOrder((prev) => ({
        ...prev,
        shipping_agent: `${supplier.supplier_code} - ${supplier.name}`,
      }));

      setSupplierModalOpen(false);
      return;
    }

    // --------------------------------------------
    // GENERAL TAB
    // Full supplier selection
    // --------------------------------------------

    setOrder((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,

      pay_to_supplier_id: supplier.id,
      pay_to_supplier_no: supplier.supplier_code,
      pay_to_supplier_name: supplier.name,

      // 💥 FIX: Capture the VAT Business / Purchase Posting Group from supplier
      purchase_posting_group_id: supplier.posting_group || "", // supplier.purchase_posting_group_id ||
      vat_business_posting_group_id: supplier.posting_group || "", //  supplier.purchase_posting_group_id ||

      // Supplier Settings & Financial defaults
      anonymous_supplier: supplier.anonymous_supplier ?? false,
      purchaser: supplier.purchaser_code || "",
      contact_person: supplier.finance_contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      payable_bank: supplier.payable_bank || "",
      payment_terms_id: supplier.payment_terms || "",
      payment_method_id: supplier.payment_method || "",
    }));

    if (supplier.primary_address) setPrimaryAddress(supplier.primary_address);

    if (supplier.billing_address) setBillingAddress(supplier.billing_address);

    if (supplier.shipping_address)
      setShippingAddress(supplier.shipping_address);

    // Sync currency from supplier profile if provided
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

  const handleShippingAgentSelection = () => {
    setSupplierSelectionSource("shipping_agent");
    setSupplierModalOpen(true);
  };

  const handleCustomerSelection = () => {
    setCustomerModalOpen(true);
  };

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      link_to_cust: `${customer.customer_code} - ${customer.name}`,
    }));

    setCustomerModalOpen(false);
  };

  const handlePurchaseOrderSelection = () => {
    setPOModalOpen(true);
  };

  const handleSelectPurchaseOrders = (
    selectedOrders: PurchaseOrderLookupItem[],
  ) => {
    const codes = selectedOrders.map((o) => o.order_no).join(", ");
    setOrder((prev) => ({
      ...prev,
      linked_po: codes,
    }));
    setPOModalOpen(false);
  };

  const handleSalesOrderSelection = () => {
    setSOModalOpen(true);
  };

  const handleSelectSalesOrder = async (order: SalesOrderLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      link_to_so_no: `${order.order_no}`,
    }));
    setPOModalOpen(false);
  };

  const handlePurchaserSelection = () => {
    setPurchaserModalOpen(true);
  };

  const handlePurchaserSelect = (emp: Employee) => {
    setOrder((prev) => ({
      ...prev,
      purchaser: emp.employee_code + "-" + emp.display_name,
    }));
    setPurchaserModalOpen(false);
  };

  const updateField = <K extends keyof PurchaseOrder>(
    field: K,
    value: PurchaseOrder[K],
  ) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (includeLines = true): boolean => {
    const errors = validatePurchaseOrder(
      order,
      lines,
      currencyConfig.currency_id,
      includeLines,
    );

    setValidationErrors(errors);

    return errors.length === 0;
  };

  const savePurchaseOrder = async (
    requireLines = false,
  ): Promise<string | null> => {
    if (!validateForm(!requireLines)) {
      return null;
    }

    show("Saving...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        order: {
          ...order,
          ...currencyConfig,
          subtotal: financials.amount,
          tax_amount: financials.vat,
          total_amount: financials.amountInclVat,
        },

        primary_address: primaryAddress,
        billing_address: billingAddress,
        shipping_address: shippingAddress,

        lines,
        allow_empty_lines: requireLines,
      };

      const res = await fetch(
        id ? `/api/purchase-orders/${id}` : "/api/purchase-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Execution error writing back purchase records.",
        );
      }

      const targetId = id || result?.data?.id;

      if (!targetId) {
        throw new Error("Purchase Order was saved but no ID was returned.");
      }

      toast.success(id ? "Purchase Order Updated" : "Purchase Order Created");

      // IMPORTANT:
      // Keep the newly created ID in local state.
      setOrder((prev) => ({
        ...prev,
        ...(result?.data || {}),
        id: targetId,
      }));

      // Re-fetch persisted lines so newly created line IDs are available.
      await fetchLatestLines(targetId);

      return targetId;
    } catch (err) {
      if (err instanceof Error) {
        setValidationErrors([err.message]);
        toast.error(err.message);
      }

      return null;
    } finally {
      setSaving(false);
      hide();
    }
  };

  const fetchLatestLines = async (targetId: string) => {
    try {
      const linesRes = await fetch(`/api/purchase-orders/${targetId}/lines`);
      if (linesRes.ok) {
        const linesData = await linesRes.json();
        if (linesData.lines) {
          setLines(linesData.lines);
        }
      }
    } catch (err) {
      console.error("Failed to re-fetch PO lines:", err);
    }
  };

  const handleSave = async () => {
    const targetId = await savePurchaseOrder(false);

    if (!targetId) return;

    if (id) {
      setIsEditMode(false);
      router.refresh();
    } else {
      router.replace(`/${slug}/purchases/purchase-orders/${targetId}/edit`);
    }
  };

  const handleImportItems = async () => {
    let targetId = order.id;

    // If this is a new draft PO, persist it first to acquire an ID
    if (!targetId) {
      const savedId = await savePurchaseOrder(true);
      if (!savedId) return;

      targetId = savedId;
      setOrder((prev) => ({ ...prev, id: savedId }));
      setIsEditMode(true);
      router.replace(`/${slug}/purchases/purchase-orders/${savedId}/edit`);
    }

    setMigrationPurchaseOrderId(targetId);
    setShowMigrationModal(true);
  };

  const handleStageClick = async (targetStage: {
    id: string;
    name: string;
  }) => {
    if (!id || isUpdatingStatus || order.stage_id === targetStage.id) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/purchase-orders/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStage.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update stage");

      setOrder((prev) => ({ ...prev, stage_id: targetStage.id }));
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

  // const validateBeforeStockAction = (): boolean => {
  //   const errors = validatePurchaseOrderForStockAction(lines);

  //   setValidationErrors(errors);

  //   return errors.length === 0;
  // };

  const validateBeforeStockAction = (scope: ReceiptScope): boolean => {
    const errors = validateReceiptScope(lines, scope);

    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error(errors[0]);
      return false;
    }

    return true;
  };

  const toDateOnly = (value: string | null | undefined): string | undefined => {
    if (!value) return undefined;

    return value.slice(0, 10);
  };

  // 1. Separate Handler for Receiving Stock (Physical Intake)
  const handleReceiveStock = async () => {
    // if (!id) return;

    // if (!validateBeforeStockAction()) {
    //   return;
    // }

    if (!id || isPosting) return;

    const scope = getReceiptScope();

    if (!validateBeforeStockAction(scope)) {
      return;
    }

    setIsPosting(true);
    show("Receiving Stock...");
    // show("Saving and Receiving Record...");

    try {
      toast.loading("Processing physical stock receipt...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          scope,
          order: {
            // receipt_date:
            //   order.receipt_date || new Date().toISOString().slice(0, 10),
            // posting_date:
            //   order.order_date || new Date().toISOString().slice(0, 10),

            receipt_date: toDateOnly(order.receipt_date),
            posting_date: toDateOnly(order.order_date),
            reference: order.reference,
            notes: order.notes,
          },
        }),
        // body: JSON.stringify({ order }), // , lines
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to receive stock.");
      }

      toast.success("Selected purchase order lines received successfully.", {
        id: "action-toast",
      });
      // setShowReceiveModal(false);
      // refreshLines();
      // router.refresh();

      setSelectedReceiptLineIds([]);
      setShowReceiveModal(false);

      await refreshLines();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Stock receiving failed.",
        { id: "action-toast" },
      );
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  // Handler for combined Receive + Post Invoice API call
  const handleReceiveAndPost = async () => {
    if (!id) return;

    const scope: ReceiptScope = {
      type: "ALL_LINES",
    };

    if (!validateBeforeStockAction(scope)) {
      return;
    }

    // if (!validateBeforeStockAction()) {
    //   return;
    // }

    setIsPosting(true);

    show("Receiving Stock & Posting Invoice...");
    try {
      toast.loading("Receiving stock and posting purchase invoice...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/purchase-orders/${id}/receive-and-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          supplier_invoice_no: order.reference,
          invoice_date: order.invoice_date,
          posting_date: order.order_date,
          financials,
          order,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Failed to receive stock and post invoice.",
        );

      toast.success("Stock received and invoice posted successfully!", {
        id: "action-toast",
      });
      setShowReceiveAndPostModal(false);

      router.push(`/${slug}/purchases/purchase-orders/create`);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Error processing operation.", {
          id: "action-toast",
        });
      }
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  // Handler when user clicks the "Post Invoice" button
  const handlePostInvoiceClick = () => {
    if (!order.reference?.trim()) {
      toast.error("Please enter a Supplier Invoice No. before posting.");
      return;
    }

    if (isFullyReceived) {
      setShowInvoiceModal(true);
      return;
    }

    // The existing combined action invoices the whole PO.
    // Therefore it must receive ALL outstanding lines,
    // not merely the currently selected lines.
    const scope: ReceiptScope = {
      type: "ALL_LINES",
    };

    if (!validateBeforeStockAction(scope)) {
      return;
    }

    // if (!validateBeforeStockAction()) {
    //   return;
    // }

    const allGLAccountLines = lines.every(
      (line) => (line.line_type || "ITEM") === "GL_ACCOUNT",
    );

    // If item lines exist and are NOT fully received, prompt to receive & post
    if (!isFullyReceived && !allGLAccountLines) {
      setShowReceiveAndPostModal(true);
    } else {
      setShowInvoiceModal(true);
    }
  };

  // 2. Separate Handler for Posting Invoice (Financial Posting to Accounts Payable)
  const handlePostInvoice = async () => {
    if (!id || isPosting) return;

    if (!order.reference?.trim()) {
      toast.error("Supplier invoice number is required.");
      return;
    }

    if (!isFullyReceived) {
      toast.error(
        "All purchase order item lines must be received before posting the invoice.",
      );
      return;
    }
    setIsPosting(true);

    show("Posting Invoice...");
    try {
      toast.loading("Posting purchase invoice..", {
        id: "action-toast",
      }); //  to G/L ledger.

      const res = await fetch(`/api/purchase-orders/${id}/post-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_invoice_no: order.reference,
          invoice_date: order.invoice_date,
          posting_date: order.order_date,
          financials: financials, // { amount, vat, amountInclVat }
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to post purchase invoice");

      toast.success("Purchase invoice posted!", { id: "action-toast" });
      setShowInvoiceModal(false);

      router.push(`/${slug}/purchases/purchase-orders/create`);
      // router.refresh();
    } catch (err) {
      if (err instanceof Error)
        // setValidationErrors([err.message]);
        toast.error(err.message || "Error posting invoice", {
          id: "action-toast",
        });
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  const inputNotesStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-[11px] bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const inputDateStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4 ">
      <Breadcrumbs
        items={[
          {
            label: "Purchase Order",
            href: `/${slug}/purchases/purchase-orders`,
          },
          { label: order.order_no || order.invoice_no || "" },
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">{`Purchase Order`}</h1>

        {order.order_no && (
          // <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 transition-colors rounded">
          <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
            {`Order No. ${order.order_no || order.invoice_no || ""}`}
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
            This Purchase Order is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] capitalize font-bold tracking-wider">
            Read Only
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200  pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar ">
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
                (s) => s.id === order.stage_id,
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

        <OrderFormTabs
          activeTab={activeTab}
          order={order}
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
          onGeneralSupplierSelect={handleGeneralSupplierSelection}
          onInvoicingSupplierSelect={handleInvoicingSupplierSelection}
          setLocationModalOpen={setLocationModalOpen}
          onPurchaseOrderSelect={handlePurchaseOrderSelection}
          onSalesOrderSelect={handleSalesOrderSelection}
          onCustomerSelect={handleCustomerSelection}
          onShippingAgentSelect={handleShippingAgentSelection}
          setPurchaserModalOpen={handlePurchaserSelection}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={isFormDisabled}
        />
      </div>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <PurchaseOrderLines
          lines={lines}
          setLines={setLines}
          isReadonly={isFormDisabled}
          purchaseOrder={order}
          refreshLines={refreshLines}
          onImportItems={handleImportItems}
          selectedReceiptLineIds={selectedReceiptLineIds}
          onReceiptLineSelectionChange={setSelectedReceiptLineIds}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-2 gap-y-2 col-span-2 grid grid-cols-3 items-start">
            <div className="col-span-2">
              <textarea
                placeholder="Add Internal Notes"
                disabled={isFormDisabled}
                className={`${inputNotesStyle} font-mono`}
                value={order.internal_notes || ""}
                onChange={(e) => updateField("internal_notes", e.target.value)}
              />
            </div>
            <div>
              <textarea
                placeholder="Add External Notes"
                disabled={isFormDisabled}
                className="w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-[11px] bg-blue-100 dark:bg-blue-800/80  outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200"
                value={order.notes || ""}
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
                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) || 1}
                  allowDecimals={true}
                  decimalScale={6}
                  disabled={isFormDisabled}
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  onChange={(val) =>
                    setCurrencyConfig({
                      ...currencyConfig,
                      exchange_rate: val,
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
                {financials.amountInclVatLCY.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
                    const scope = getReceiptScope();

                    if (!validateBeforeStockAction(scope)) return;

                    setShowReceiveModal(true);
                  }}
                  disabled={isPosting || isFullyReceived || isCompleted}
                  // className={`px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors ${
                  //   isFullyReceived || isCompleted
                  //     ? "text-amber-500 dark:text-amber-400 opacity-60 cursor-not-allowed"
                  //     : "text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  // }`}
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
              onClick={() => router.push(`/${slug}/purchases/purchase-orders`)}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <StockReceiveConfirmModal
        isOpen={showReceiveModal}
        title="Confirmation"
        // message="Are you sure you want to receive the stock?"

        message={
          selectedReceiptLineIds.length > 0
            ? `Receive ${selectedReceiptLineIds.length} selected item line(s) in full?`
            : "Receive all outstanding item lines in full?"
        }
        onConfirm={handleReceiveStock}
        onCancel={() => setShowReceiveModal(false)}
        loading={isPosting}
      />

      <GeneralConfirmModal
        isOpen={showInvoiceModal}
        title="Confirmation"
        message="Are you sure you want to post this purchase order?"
        onConfirm={handlePostInvoice}
        onCancel={() => setShowInvoiceModal(false)}
        loading={isPosting}
      />

      <GeneralConfirmModal
        isOpen={showReceiveAndPostModal}
        title="Stock Receipt Required"
        // message="Stock has not been fully received for this order. Would you like to receive the remaining stock automatically and <b>post the purchase invoice now?</b>"
        // <strong></strong>
        message={
          <>
            Stock has not been received for this order. Would you like to
            receive the stock automatically and post the purchase order now?
          </>
        }
        onConfirm={handleReceiveAndPost}
        onCancel={() => setShowReceiveAndPostModal(false)}
        loading={isPosting}
      />

      <GeneralConfirmModal
        isOpen={showSupplierChangeModal}
        title="Change Supplier"
        message="This purchase order contains line items. All line items must be deleted before the supplier can be changed. Do you want to delete the existing line items and continue?"
        onConfirm={handleConfirmSupplierChange}
        onCancel={handleCancelSupplierChange}
        loading={false}
      />

      {supplierModalOpen && (
        <SupplierLookupModal
          open={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onSelect={handleSupplierSelect}
        />
      )}

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
            order.linked_po
              ? order.linked_po.split(",").map((s) => s.trim())
              : []
          }
        />
      )}

      {SOModalOpen && (
        <SalesOrderLookupModal
          isOpen={SOModalOpen}
          onClose={() => setSOModalOpen(false)}
          onSelectOrder={handleSelectSalesOrder}
        />
      )}

      {PurchaserModalOpen && (
        <SalespersonLookupModal
          open={PurchaserModalOpen}
          onClose={() => setPurchaserModalOpen(false)}
          onSelect={handlePurchaserSelect}
        />
      )}

      <SupplierShippingLocationsModal
        open={locationModalOpen}
        supplierId={order.supplier_id}
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

      {showMigrationModal && (
        <>
          <MigrationUploadModal
            open={showMigrationModal}
            onClose={() => {
              setShowMigrationModal(false);
              setMigrationPurchaseOrderId(null);
            }}
            purchaseOrder={{
              ...order,
              id: migrationPurchaseOrderId || order.id,
            }}
            onCompleted={async () => {
              const activeId = migrationPurchaseOrderId || order.id;
              if (activeId) {
                await fetchLatestLines(activeId);
              }
              setShowMigrationModal(false);
              setMigrationPurchaseOrderId(null);
            }}
          />
        </>
      )}
    </div>
  );
};

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
  PurchaseOrderMasterData,
  PurchaseOrderStatus,
} from "@/types/purchase-order";

import PurchaseOrderLines from "./PurchaseOrderLines";
import { OrderFormTabs } from "./OrderFormTabs";
import { StockReceiveConfirmModal } from "@/app/components/shared/modals/StockReceiveConfirmModal";
import SupplierLookupModal, { SupplierLookupItem } from "./SupplierLookupModal";
import SupplierShippingLocationsModal from "./SupplierShippingLocationsModal";

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
  // initialData?: Partial<PurchaseOrderPayloadInput>;
}

interface OrderStage {
  id: string;
  name: string;
  rank: number;
}

type TabType = "general" | "invoicing" | "shipping";

export const PurchaseOrderForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
  // initialData,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // const [stages, setStages] = useState<OrderStage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Add states for modal control
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<PurchaseOrderMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  const [order, setOrder] = useState<Partial<PurchaseOrder>>({
    order_no: id ? "" : "[Auto-Generated]",
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

  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  // const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  // Check if all line items with quantity > 0 have been received
  const isFullyReceived = useMemo(() => {
    if (lines.length === 0) return false;
    const itemLines = lines.filter((l) => (l.line_type || "ITEM") === "ITEM");
    if (itemLines.length === 0) return false;

    return itemLines.every((l) => {
      const qty = Number(l.quantity || 0);
      const rcvd = Number(l.received_quantity || 0);
      return qty > 0 && rcvd >= qty;
    });
  }, [lines]);

  useEffect(() => {
    if (!id) return;

    show("Fetching Record...");
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hide();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          // console.log("API payload parsed successfully:", actualData);

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

  const isCompleted = order.status === "completed" || order.status === "POSTED";
  const isFormDisabled = isReadOnly || isCompleted;

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

  const refreshLines = async () => {
    if (!order.id) return;

    const response = await fetch(`/api/purchase-orders/${order.id}/lines`);

    const data = await response.json();

    setLines(data.lines ?? []);
  };

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

    // const rate = Number(currencyConfig.exchange_rate || 1);
    const rate =
      Number(currencyConfig.exchange_rate) > 0
        ? Number(currencyConfig.exchange_rate)
        : 1;

    // const amountInclVatLCY = amountInclVat / rate;
    const amountInclVatLCY = Number(amountInclVat) * rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,

      // 💥 FIX: Capture the VAT Business / Purchase Posting Group from supplier
      purchase_posting_group_id:
        supplier.purchase_posting_group_id || supplier.posting_group || "",
      vat_business_posting_group_id:
        supplier.purchase_posting_group_id || supplier.posting_group || "",

      // Supplier Settings & Financial defaults
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

  const updateField = <K extends keyof PurchaseOrder>(
    field: K,
    value: PurchaseOrder[K],
  ) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!order.supplier_id) errors.push("Supplier selection is required.");

    // 💥 FIX: Validate Posting Group presence for Tax Matrix calculation
    if (
      !order.purchase_posting_group_id &&
      !order.vat_business_posting_group_id
    ) {
      errors.push(
        "Selected supplier does not have a valid Purchase/VAT Posting Group assigned.",
      );
    }

    if (!currencyConfig.currency_id)
      errors.push("Transactional currency is required.");
    if (lines.length === 0)
      errors.push("Purchase orders require at least one line item.");

    errors.push(...validateDates());

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateDates = (): string[] => {
    const errors: string[] = [];

    const orderDate = order.order_date
      ? new Date(order.order_date).getTime()
      : null;

    const invoiceDate = order.invoice_date
      ? new Date(order.invoice_date).getTime()
      : null;

    const reqReceiptDate = order.req_receipt_date
      ? new Date(order.req_receipt_date).getTime()
      : null;

    const receiptDate = order.receipt_date
      ? new Date(order.receipt_date).getTime()
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
      if (!res.ok)
        throw new Error(
          result.error || "Execution error writing back purchase records.",
        );

      toast.success("Purchase Order Updated");
      router.push(`/${slug}/purchases/purchase-orders`);
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  const handleStageClick = async (stageName: string) => {
    const standardizedStatus =
      stageName.toLowerCase() as PurchaseOrder["status"];

    if (
      !id ||
      isUpdatingStatus ||
      order.status?.toLowerCase() === stageName.toLowerCase()
    ) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // 1. Check if the user is triggering a physical intake posting workflow
      if (standardizedStatus === "received") {
        const confirmPosting = confirm(
          "Are you sure you want to change status to Received? This will generate a Purchase Receipt, commit stock lines to inventory, and write entries to the G/L ledger automatically.",
        );
        if (!confirmPosting) {
          setIsUpdatingStatus(false);
          return;
        }

        toast.loading("Generating purchase receipt draft context...", {
          id: "posting-toast",
        });

        // Step A: Generate the Purchase Receipt Draft matching your order scope
        const receiptDraftRes = await fetch("/api/purchase-receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchase_order_id: id,
            receipt_date: new Date().toISOString().split("T")[0],
            // Map order lines into receipt line inputs
            lines: lines
              .map((l) => ({
                purchase_order_line_id: l.id,
                item_id: l.item_id,
                // If your UI tracks a specific quantity to receive, replace l.quantity here
                quantity:
                  Number(l.quantity || 0) - Number(l.received_quantity || 0),
                warehouse_location_id: l.warehouse_id || null,
              }))
              .filter((l) => l.quantity > 0), // Only include rows that have open balances remaining
          }),
        });

        const receiptDraftData = await receiptDraftRes.json();
        if (!receiptDraftRes.ok) {
          throw new Error(
            receiptDraftData.error ||
              "Failed to initialize receipt master record.",
          );
        }

        const targetReceiptId = receiptDraftData.id;

        toast.loading(
          "Executing inventory posting and general ledger adjustments...",
          { id: "posting-toast" },
        );

        // Step B: Submit the newly fetched ID to your PurchaseReceiptPostingService integration endpoint
        const postRes = await fetch(
          `/api/purchase-receipts/${targetReceiptId}/post`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-company-id": session?.user?.company_id || "",
            },
          },
        );

        const postData = await postRes.json();
        if (!postRes.ok) {
          throw new Error(
            postData.error || "Ledger transaction allocation failure.",
          );
        }

        toast.success(
          "Stock intake processing & item allocations executed successfully.",
          { id: "posting-toast" },
        );
        setOrder((prev) => ({ ...prev, status: "received" }));
        router.refresh();
        return;
      }

      // 2. Standard state fallback for non-received workflow triggers
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            ...order,
            ...currencyConfig,
            supplier_id: order.supplier_id || "",
            order_date:
              order.order_date || new Date().toISOString().split("T")[0],
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
        setOrder((prev) => ({ ...prev, status: standardizedStatus }));
        toast.success(`Stage updated successfully to: ${stageName}`);
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to update stage: ${errData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error updating purchase order stage:", error);
      if (error instanceof Error) {
        toast.error(
          error.message ||
            "Network error updating purchase order stage status.",
          { id: "posting-toast" },
        );
      } else {
        toast.error("Network error updating purchase order stage status.", {
          id: "posting-toast",
        });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 1. Separate Handler for Receiving Stock (Physical Intake)
  const handleReceiveStock = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Saving and Receiving Record...");

    try {
      toast.loading("Processing physical stock receipt...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, lines }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive stock");

      toast.success("Stock received & ledger entries committed!", {
        id: "action-toast",
      });
      setShowReceiveModal(false);
      refreshLines();
      router.refresh();
    } catch (err) {
      if (err instanceof Error)
        //setValidationErrors([err.message]);
        toast.error(err.message || "Error receiving stock", {
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
      toast.loading("Posting purchase invoice to G/L ledger...", {
        id: "action-toast",
      });

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

      toast.success("Purchase invoice posted cleanly!", { id: "action-toast" });
      setShowInvoiceModal(false);

      router.push(`/${slug}/purchases/purchase-orders`);
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

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const inputDateStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4 ">{/* max-w-[100vw] w-full py-2 mx-auto overflow-x-auto */}
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

      <div className=" bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200  pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar ">
            {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
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

          {isUpdateMode && !isLoadingStages && stages.length > 0 && (
            <div className="flex justify-end ml-auto overflow-x-auto">
              <div
                className={`flex items-center min-w-max gap-1 text-xs font-bold text-slate-400 select-none ${
                  isUpdatingStatus ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {stages.map((stage, index) => {
                  const isFirst = index === 0;
                  const isLast = index === stages.length - 1;
                  const isActive =
                    order.status?.toLowerCase() === stage.name.toLowerCase();

                  let activeBg = "bg-blue-600 text-white";
                  if (index === 1) activeBg = "bg-amber-500 text-white";
                  if (index === 2) activeBg = "bg-indigo-600 text-white";
                  if (index >= 3) activeBg = "bg-emerald-600 text-white";

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => handleStageClick(stage.name)}
                      className={`px-4 py-1.5 flex items-center gap-1 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95
                    ${isFirst ? "rounded-l-md" : ""} 
                    ${isLast ? "rounded-r-md" : ""} 
                    ${isActive ? activeBg : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
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
          order={order}
          primaryAddress={primaryAddress}
          setPrimaryAddress={setPrimaryAddress}
          billingAddress={billingAddress}
          setBillingAddress={setBillingAddress}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          currencyConfig={currencyConfig}
          setCurrencyConfig={setCurrencyConfig}
          // currencies={currencies}
          masterData={masterData}
          updateField={updateField}
          setSupplierModalOpen={setSupplierModalOpen}
          setLocationModalOpen={setLocationModalOpen}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isFormDisabled}
        purchaseOrder={order}
        refreshLines={refreshLines}
      />

      <div className="  bg-white  border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 pl-4 pr-4">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                className={`${inputStyle} font-mono`}
                value={order.internal_notes || ""}
                onChange={(e) => updateField("internal_notes", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                className={`${inputStyle} font-mono`}
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
                <input
                  type="number"
                  step="any"
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

        {/* {!isReadOnly && (
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/purchases/purchase-orders`)}
            className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 font-bold capitalize rounded hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-emerald-600 text-white font-bold capitalize rounded shadow hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? "Writing..." : "Save Purchase Order"}
          </button>
        </div>
      )} */}

        {/* Form Bottom Action Toolbar matching Legacy UI */}
        <div className="flex items-center justify-between pt-4 bg-slate-50 dark:bg-slate-900/60 pl-4 pr-4 pb-4 rounded-lg">
          {/* Legend Indicators */}
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

          {/* Dedicated Action Buttons */}
          <div className="flex items-center gap-2">
            {/* <button
            type="button"
            onClick={handleSave}
            disabled={saving || isReadOnly}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Purchase Order
          </button> */}

            {isUpdateMode && (
              <>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={isPosting}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Post Invoice
                </button>

                <button
                  type="button"
                  onClick={() => setShowReceiveModal(true)}
                  disabled={isPosting || isFullyReceived}
                  className={`px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors ${
                    isFullyReceived
                      ? "text-amber-500 dark:text-amber-400 opacity-60 cursor-not-allowed"
                      : "text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                  // className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Receive Stock
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Edit / Save
            </button>

            <button
              type="button"
              onClick={() => router.push(`/${slug}/purchases/purchase-orders`)}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StockReceiveConfirmModal
        isOpen={showReceiveModal}
        title="Confirmation"
        message="Are you sure you want to receive the stock?"
        onConfirm={handleReceiveStock}
        onCancel={() => setShowReceiveModal(false)}
        loading={isPosting}
      />

      <StockReceiveConfirmModal
        isOpen={showInvoiceModal}
        title="Confirmation"
        message="Are you sure you want to post the invoice for this purchase order?"
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
    </div>
  );
};

// app/components/purchases/purchase-orders/PurchaseOrderForm.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from "@/types/purchase-order";

import PurchaseOrderLines from "./PurchaseOrderLines";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "../../shared/modals/SupplierLookupModal";

import { PurchaseOrderPayloadInput } from "@/lib/validations/purchase-order.schema";
import { Checkbox } from "@radix-ui/react-checkbox";
import { OrderFormTabs } from "./OrderFormTabs";

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

  const [stages, setStages] = useState<OrderStage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

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
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
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

  useEffect(() => {
    fetch("/api/parties/currencies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCurrencies(data))
      .catch((err) => console.error("Error pulling lookups:", err));
  }, []);

  useEffect(() => {
    if (!isUpdateMode) {
      setIsLoadingStages(false);
      return;
    }

    async function fetchStages() {
      try {
        const response = await fetch("/api/setup/sales/purchase_order_stages");
        if (response.ok) {
          const data = await response.json();
          setStages(data);
        }
      } catch (error) {
        console.error("Failed to load purchase order stages setup:", error);
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]);

  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.id === currencyConfig.currency_id);
  }, [currencyConfig.currency_id, currencies]);

  const financials = useMemo(() => {
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;

    // const rate = Number(currencyConfig.exchange_rate || 1);
    const rate =
      Number(currencyConfig.exchange_rate) > 0
        ? Number(currencyConfig.exchange_rate)
        : 1;

    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,
    }));

    if (supplier.primary_address) setPrimaryAddress(supplier.primary_address);

    if (supplier.billing_address) setBillingAddress(supplier.billing_address);

    if (supplier.shipping_address)
      setShippingAddress(supplier.shipping_address);

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

      toast.success("Purchase Document Updated cleanly");
      router.push(`/${slug}/purchases/purchase-orders`);
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
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

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4 w-full max-w-[100vw] px-4 py-2 mx-auto overflow-x-auto">
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

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
          {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
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
        currencies={currencies}
        updateField={updateField}
        setSupplierModalOpen={setSupplierModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />

      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
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
          <div className="grid grid-cols-2 gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500">
              Conversion Rate
            </span>
            <input
              type="number"
              step="any"
              className={`${inputStyle} font-mono max-w-[180px]`}
              value={currencyConfig.exchange_rate ?? ""}
              onChange={(e) =>
                setCurrencyConfig({
                  ...currencyConfig,
                  exchange_rate: parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500">
              Amount Incl. VAT ({baseCurrencyCode})
            </span>
            <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold max-w-[180px] rounded">
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

      {!isReadOnly && (
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/purchases/purchase-orders`)}
            className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 font-bold uppercase rounded hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-emerald-600 text-white font-bold uppercase rounded shadow hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? "Writing..." : "Save Purchase Order"}
          </button>
        </div>
      )}
      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
};

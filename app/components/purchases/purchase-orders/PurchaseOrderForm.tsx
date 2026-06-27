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
    supplier_name: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: "",
    status: "draft",
    reference: "",
    notes: "",
  });

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
      .then((data) => {
        if (data) {
          setOrder(data.order || {});
          setLines(data.lines || []);
          setBillingAddress(
            data.billing_address || { address_type: "billing" },
          );
          setShippingAddress(
            data.shipping_address || { address_type: "shipping" },
          );
          setCurrencyConfig({
            currency_id: data.order?.currency_id || "",
            exchange_rate: data.order?.exchange_rate || 1,
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

    const rate = Number(currencyConfig.exchange_rate || 1);
    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
    }));
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
    // Convert stage name to lowercase so it passes Zod validation ("Draft" -> "draft")
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
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            ...order,
            ...currencyConfig, // Safely includes currency_id and exchange_rate
            supplier_id: order.supplier_id || "",
            order_date:
              order.order_date || new Date().toISOString().split("T")[0],
            status: standardizedStatus, // Passes Zod enum option check safely
            subtotal: financials.amount,
            tax_amount: financials.vat,
            total_amount: financials.amountInclVat,
          },
          // Provide string fallbacks to avoid Zod expected string, received undefined errors
          billing_address: {
            address_type: "billing",
            address_1: billingAddress.address_1 || "",
            address_2: billingAddress.address_2 || "",
            city: billingAddress.city || "",
            postcode: billingAddress.postcode || "",
            country: billingAddress.country || "",
          },
          shipping_address: {
            address_type: "shipping",
            name: shippingAddress.name || "",
            address_1: shippingAddress.address_1 || "",
            address_2: shippingAddress.address_2 || "",
            city: shippingAddress.city || "",
            country: shippingAddress.country || "",
          },
          lines: lines, // Ensures at least 1 visual item line entry array check passes
        }),
      });

      if (response.ok) {
        setOrder((prev) => ({ ...prev, status: standardizedStatus }));
        toast.success(`Stage updated successfully to: ${stageName}`);

        // Context Alert: Triggering execution pipelines automatically via Server hook
        if (standardizedStatus === "received") {
          toast.info("Stock intake processing & item allocations executed successfully.");
        }
        
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to update stage: ${errData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error updating purchase order stage:", error);
      toast.error("Network error updating purchase order stage status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /* const handleStageClick = async (stageName: string) => {
    // const nextStatus = stageName as PurchaseOrder["status"];
    const standardizedStatus = stageName.toLowerCase() as PurchaseOrder["status"];

    if (
      !id ||
      isUpdatingStatus ||
      order.status?.toLowerCase() === stageName.toLowerCase()
    ) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            ...order,
            status: nextStatus,
          },
          lines,
          billing_address: billingAddress,
          shipping_address: shippingAddress,
        }),
      });

      if (response.ok) {
        setOrder((prev) => ({ ...prev, status: nextStatus }));
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
      toast.error("Network error updating purchase order stage status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }; */

  const inputStyle =
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-sm bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5";

  return (
    <div className="space-y-4 container mx-auto p-1">
      {isUpdateMode && !isLoadingStages && stages.length > 0 && (
        <div
          className={`flex items-center justify-center sm:justify-start gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
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
      )}

      {/* Validation Banner UI Display Component */}
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

      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Order No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.order_no || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Supplier No. *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={order.supplier_id || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Supplier Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.supplier_name || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Order Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.order_date?.split("T")[0]}
                onChange={(e) => updateField("order_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.address_1 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_1: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Address Line 2</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.address_2 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.city || ""}
                onChange={(e) =>
                  setBillingAddress({ ...billingAddress, city: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  placeholder="Postcode"
                  className={inputStyle}
                  value={billingAddress.postcode || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      postcode: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Country"
                  className={inputStyle}
                  value={billingAddress.country || ""}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      country: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Currency *</label>
              <select
                className={inputStyle}
                value={currencyConfig.currency_id}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const matched = currencies.find((c) => c.id === targetId);
                  setCurrencyConfig({
                    currency_id: targetId,
                    exchange_rate: matched ? matched.exchange_rate : 1,
                  });
                }}
              >
                <option value="">Select Base Currency...</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Payment Terms</label>
              <input
                type="text"
                className={inputStyle}
                placeholder="Immediate, 30 Days..."
                value={order.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Invoice Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.invoice_date || ""}
                onChange={(e) => updateField("invoice_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Supplier Invoice No.</label>
              <input
                type="text"
                className={inputStyle}
                placeholder="e.g. INV-9932"
                value={order.reference || ""}
                onChange={(e) => updateField("reference", e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Location Name / Consignee</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Shipping Destination St. 1</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.address_1 || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_1: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Shipping Destination St. 2</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.address_2 || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_2: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Target Receipt Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.expected_date || ""}
                onChange={(e) => updateField("expected_date", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">
              Conversion RateFactor
            </span>
            <input
              type="number"
              step="any"
              className={`${inputStyle} font-mono max-w-[180px]`}
              value={currencyConfig.exchange_rate}
              onChange={(e) =>
                setCurrencyConfig({
                  ...currencyConfig,
                  exchange_rate: parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">
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

        <div className="space-y-1 text-sm font-medium text-right font-mono ml-auto w-full max-w-sm">
          <div className="flex justify-between border-b dark:border-slate-800 pb-1">
            <span className="text-slate-400 font-sans">Gross Net Amount:</span>
            <span>
              {financials.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {selectedCurrency?.code || ""}
            </span>
          </div>
          <div className="flex justify-between border-b dark:border-slate-800 pb-1">
            <span className="text-slate-400 font-sans">VAT Assessment:</span>
            <span>
              {financials.vat.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {selectedCurrency?.code || ""}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1 text-slate-900 dark:text-white">
            <span className="font-sans">Total Amount:</span>
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

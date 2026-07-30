// app/components/sales/orders/SalesOrderForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLineUI,
  SalesOrderMasterData,
} from "@/types/sales-order";
import SalesOrderLines from "./SalesOrderLines";
import { OrderFormTabs } from "./OrderFormTabs";
import CustomerLookupModal, { CustomerLookupItem } from "./CustomerLookupModal";
import { useLoader } from "@/app/context/LoaderContext";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

type TabType = "general" | "invoicing" | "shipping" | "margin";

interface OrderStage {
  id: string;
  name: string;
  rank: number;
}

export default function SalesOrderForm({
  slug,
  id,
  isReadOnly = false,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState<boolean>(false);
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // const [stages, setStages] = useState<OrderStage[]>([]);
  // const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<SalesOrderMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  // Core Document Entities States
  const [order, setOrder] = useState<Partial<SalesOrder>>({
    order_no: id ? "" : "[Auto-Generated]",
    customer_id: "",
    customer_no: "",
    customer_name: "",
    order_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
    dispatch_date: new Date().toISOString().split("T")[0],
    requested_delivery_date: new Date().toISOString().split("T")[0],
    delivery_date: new Date().toISOString().split("T")[0],
    status: "order processing",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoiced_amount: 0,
    reference: "",
    email: "",
    salesperson: "",
    cust_order_no: "",
    link_to_po: "",
    sq_no: "",
    source_of_order: "Others",
    currency_code: baseCurrencyCode,
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "billing" });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "shipping" });

  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);
  // const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  // Hydrate Historical Document Data
  useEffect(() => {
    if (!id) return;
    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
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
        console.error("Error hydrating historical sales order matrix:", err),
      );
  }, [id]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/sales/sales-orders/master-data");
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

    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  // Load Currencies Lookup
  /* useEffect(() => {
    fetch("/api/parties/currencies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCurrencies(data))
      .catch((err) => console.error("Error pulling currencies lookups:", err));
  }, []); */

  // Load Workflow Pipeline Stages
  /* useEffect(() => {
    if (!isUpdateMode) {
      setIsLoadingStages(false);
      return;
    }

    async function fetchStages() {
      try {
        const response = await fetch("/api/setup/sales/sales_order_stages");
        if (response.ok) {
          const data = await response.json();
          setStages(data);
        }
      } catch (error) {
        console.error("Failed to load sales order workflow pipeline:", error);
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]); */

  // const selectedCurrency = useMemo(() => {
  //   return currencies.find((c) => c.id === currencyConfig.currency_id);
  // }, [currencyConfig.currency_id, currencies]);

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_no: customer.customer_code,
      customer_name: customer.name,
      email: customer.email || prev.email,
      // Supplier Settings & Financial defaults
      anonymous_customer: customer.anonymous_customer ?? false,
      salesperson_code: customer.salesperson_code || "",
      payable_bank: customer.payable_bank || "",
      payment_terms_id: customer.payment_terms || "",
      payment_method_id: customer.payment_method || "",
    }));

    if (customer.primary_address) setPrimaryAddress(customer.primary_address);

    if (customer.billing_address) {
      setBillingAddress((prev) => ({ ...prev, ...customer.billing_address }));
    }
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({
        ...prev,
        ...customer.shipping_address,
      }));
    }

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

  const updateOrderField = <K extends keyof SalesOrder>(
    field: K,
    value: SalesOrder[K],
  ) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const validateDates = (): string[] => {
    const errors: string[] = [];

    const orderDate = order.order_date
      ? new Date(order.order_date).getTime()
      : null;

    const dispatchDate = order.dispatch_date
      ? new Date(order.dispatch_date).getTime()
      : null;

    const deliveryDate = order.delivery_date
      ? new Date(order.delivery_date).getTime()
      : null;

    if (orderDate && dispatchDate && orderDate > dispatchDate) {
      errors.push("Order Date cannot be after Dispatch Date.");
    }

    if (orderDate && deliveryDate && orderDate > deliveryDate) {
      errors.push("Order Date cannot be after Delivery Date.");
    }

    if (dispatchDate && deliveryDate && dispatchDate > deliveryDate) {
      errors.push("Delivery Date cannot be before Dispatch Date.");
    }

    return errors;
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!order.customer_id)
      errors.push("You must select a valid Customer record.");
    if (!order.order_date) errors.push("Order Date field is mandatory.");
    if (lines.length === 0)
      errors.push("Sales Order must contain at least one line element.");

    errors.push(...validateDates());

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const save = async () => {
    setValidationErrors([]);
    if (!validateForm()) {
      toast.error("Please fix validation errors before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
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
        id ? `/api/sales/sales-orders/${id}` : "/api/sales/sales-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save processing failed.");

      toast.success("Sales order recorded cleanly");
      router.push(`/${slug}/sales/orders`);
      router.refresh();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
    }
  };

  const handleStageClick = async (stageName: string) => {
    if (
      !id ||
      isUpdatingStatus ||
      order.status?.toLowerCase() === stageName.toLowerCase()
    )
      return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-orders/${id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: stageName.toLowerCase(),
          order: {
            ...order,
            ...currencyConfig,
            subtotal: financials.amount,
            tax_amount: financials.vat,
            total_amount: financials.amountInclVat,
          },
        }),
      });

      if (response.ok) {
        setOrder((prev) => ({ ...prev, status: stageName.toLowerCase() }));
        toast.success(`Stage updated successfully to: ${stageName}`);
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to change stage: ${errData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Network connectivity issue updating stage pipeline state.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4 container mx-auto p-1 text-black dark:text-white">
      {/* 1. Interactive Step-by-Step Top Status Ribbon */}
      {isUpdateMode && !isLoadingStages && stages.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
        >
          {stages.map((stage, index) => {
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const isActive =
              order.status?.toLowerCase() === stage.name.toLowerCase();
            const activeBg = "bg-emerald-600 text-white";

            return (
              <button
                type="button"
                key={stage.id}
                onClick={() => handleStageClick(stage.name)}
                className={`px-4 py-1.5 flex items-center gap-1 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95
                  ${isFirst ? "rounded-l-md" : ""} 
                  ${isLast ? "rounded-r-md" : ""} 
                  ${isActive ? activeBg : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
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

      {/* Validation Banners */}
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

      {/* 2. Primary Tab Headings Row */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        {(
          [
            { id: "general", label: "General" },
            { id: "invoicing", label: "Invoicing" },
            { id: "shipping", label: "Shipping" },
            { id: "margin", label: "Margin Analysis" },
          ] as { id: TabType; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        updateField={updateOrderField}
        setCustomerModalOpen={setCustomerModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />

      <SalesOrderLines lines={lines} setLines={setLines} />

      <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
          <div>
            <textarea
              placeholder="Add Internal Notes"
              className={`${inputStyle} font-mono`}
              value={order.internal_notes || ""}
              onChange={(e) =>
                updateOrderField("internal_notes", e.target.value)
              }
            />
          </div>
          <div className="col-span-2">
            <textarea
              placeholder="Add External Notes"
              className={`${inputStyle} font-mono`}
              value={order.notes || ""}
              onChange={(e) => updateOrderField("notes", e.target.value)}
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

      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (Net Amount)</span>
            <span className="font-medium text-black dark:text-white">
              {financials.amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax Aggregations (VAT)</span>
            <span className="font-medium text-black dark:text-white">
              {financials.vat.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
          <div className="flex justify-between font-semibold text-base">
            <span>Order Grand Total</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {financials.amountInclVat.toFixed(2)}
            </span>
          </div>
          {currencyConfig.exchange_rate !== 1 && (
            <div className="flex justify-between text-xs text-gray-400 pt-1 border-t dark:border-slate-800">
              <span>Total in ({baseCurrencyCode})</span>
              <span>{financials.amountInclVatLCY.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div> */}

      <div className="flex items-center justify-between pt-4">
        {/* Legend Indicators */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{" "}
            Partially Allocated Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
            Allocated Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
            Dispatched Stock
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

          {/* {isUpdateMode && (
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
                disabled={isPosting}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Receive Stock
              </button>
            </>
          )} */}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Edit / Save
          </button>

          <button
            type="button"
            onClick={() => router.push(`/${slug}/sales/orders`)}
            className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
      {/* <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/orders`)}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel and Return
        </button>

        <div className="flex gap-3">
          {id &&
            order.invoice_status !== "INVOICED" &&
            order.status !== "CANCELLED" && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (
                    !confirm(
                      "Convert this open sales order into a finalized invoice?",
                    )
                  )
                    return;
                  try {
                    setSaving(true);
                    const res = await fetch(
                      `/api/sales/sales-orders/${id}/convert-to-invoice`,
                      { method: "POST" },
                    );
                    const data = await res.json();
                    if (!res.ok)
                      throw new Error(data.error || "Conversion failure.");

                    toast.success("Sales Invoice generated safely.");
                    router.push(`/${slug}/sales/invoices/${data.invoice_id}`);
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Conversion aborted.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
              >
                Convert To Invoice
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-medium transition shadow disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save Order"}
          </button>
        </div>
      </div> */}

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}

/* "use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
  SalesOrderLineUI,
} from "@/types/sales-order";
import SalesOrderLines from "./SalesOrderLines";
import { OrderFormTabs } from "./OrderFormTabs";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

type TabType = "general" | "invoicing" | "shipping" | "margin";

interface OrderStage {
  id: string;
  name: string;
  rank: number;
}

export default function SalesOrderForm({
  slug,
  id,
  isReadOnly = false,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const [stages, setStages] = useState<OrderStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const isUpdateMode = !!id;

  // Core Document Entities States
  const [order, setOrder] = useState<SalesOrder>({
    order_no: id ? "" : "[Auto-Generated]",
    customer_id: "",
    customer_name: "",
    order_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
    dispatch_date: new Date().toISOString().split("T")[0],
    requested_delivery_date: new Date().toISOString().split("T")[0],
    delivery_date: new Date().toISOString().split("T")[0],
    status: "order processing",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoiced_amount: 0,
    reference: "",
    email: "",
    salesperson: "",
    cust_order_no: "",
    link_to_po: "",
    sq_no: "",
    source_of_order: "Others",
    currency_code: "GBP",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "billing" });
  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "shipping" });

  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);

  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  // Hydrate Data
  // useEffect(() => {
  //   if (!id) return;

  //   fetch(`/api/sales/sales-orders/${id}`)
  //     .then((r) => r.json())
  //     .then((data) => {
  //       if (data.order) setOrder(data.order);
  //       if (data.lines) setLines(data.lines);
  //       if (data.billing_address) setBillingAddress(data.billing_address);
  //       if (data.shipping_address) setShippingAddress(data.shipping_address);
  //     })
  //     .catch((err) => console.error("Error fetching order details:", err));
  // }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sales/sales-orders/${id}`)
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
          // setCurrencyConfig({
          //   currency_id: actualData.order?.currency_id || "",
          //   exchange_rate: actualData.order?.exchange_rate || 1,
          // });
        }
      })
      .catch((err) =>
        console.error("Error hydrating historical document matrix:", err),
      );
  }, [id]);

  // Load setup lifecycle pipeline workflows
  useEffect(() => {
    if (!isUpdateMode) {
      setIsLoadingStages(false);
      return;
    }

    async function fetchStages() {
      try {
        const response = await fetch("/api/setup/sales/sales_order_stages");
        if (response.ok) {
          const data = await response.json();
          setStages(data);
        }
      } catch (error) {
        console.error("Failed to load sales order workflow pipeline:", error);
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]);

  const handleTotalsChange = useCallback(
    (computed: { subtotal: number; tax: number; total: number }) => {
      setOrder((prev) => ({
        ...prev,
        subtotal: computed.subtotal,
        tax_amount: computed.tax,
        total_amount: computed.total,
      }));
    },
    [],
  );

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_no: customer.customer_code,
      customer_name: customer.name,
      email: customer.email || prev.email,
    }));

    if (customer.primary_address) setPrimaryAddress(customer.primary_address);

    if (customer.billing_address) {
      setBillingAddress((prev) => ({ ...prev, ...customer.billing_address }));
    }
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({ ...prev, ...customer.shipping_address }));
    }
    setCustomerModalOpen(false);
  };

  const updateOrderField = <K extends keyof SalesOrder>(
    field: K,
    value: SalesOrder[K],
  ) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const handleStageClick = async (stageName: string) => {
    if (
      !id ||
      isUpdatingStatus ||
      order.status?.toLowerCase() === stageName.toLowerCase()
    )
      return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-orders/${id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageName.toLowerCase() }),
      });

      if (response.ok) {
        setOrder((prev) => ({ ...prev, status: stageName.toLowerCase() }));
        toast.success(`Stage updated successfully to: ${stageName}`);
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to change stage: ${errData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Network connectivity issue updating stage pipeline state.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!order.customer_id)
      errors.push("You must select a valid Customer record.");
    if (!order.order_date) errors.push("Order Date field is mandatory.");
    if (lines.length === 0)
      errors.push("Sales Order must contain at least one line element.");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const save = async () => {
    setValidationErrors([]);
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        order,
        primary_address: primaryAddress,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines,
      };

      const res = await fetch(
        id ? `/api/sales/sales-orders/${id}` : "/api/sales/sales-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save processing failed.");

      toast.success("Sales order recorded cleanly");
      router.push(`/${slug}/sales/orders`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setValidationErrors([
        err instanceof Error
          ? err.message
          : "An unexpected server error occurred",
      ]);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 col-span-4";

  return (
    <div className="space-y-4 container mx-auto p-1 text-black dark:text-white">
 
      {isUpdateMode && !isLoadingStages && stages.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
        >
          {stages.map((stage, index) => {
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const isActive =
              order.status?.toLowerCase() === stage.name.toLowerCase();
            const activeBg = "bg-emerald-600 text-white";

            return (
              <button
                type="button"
                key={stage.id}
                onClick={() => handleStageClick(stage.name)}
                className={`px-4 py-1.5 flex items-center gap-1 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95
                  ${isFirst ? "rounded-l-md" : ""} 
                  ${isLast ? "rounded-r-md" : ""} 
                  ${isActive ? activeBg : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
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
        {(
          [
            { id: "general", label: "General" },
            { id: "invoicing", label: "Invoicing" },
            { id: "shipping", label: "Shipping" },
            { id: "margin", label: "Margin Analysis" },
          ] as { id: TabType; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        updateOrderField={updateOrderField}
        setCustomerModalOpen={setCustomerModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />


      <SalesOrderLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (Net Amount)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(order.subtotal || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax Aggregations (VAT)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(order.tax_amount || 0).toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
          <div className="flex justify-between font-semibold text-base">
            <span>Order Grand Total</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>


      <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/orders`)}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel and Return
        </button>

        <div className="flex gap-3">
          {id &&
            order.invoice_status !== "INVOICED" &&
            order.status !== "CANCELLED" && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (
                    !confirm(
                      "Convert this open sales order into a finalized invoice?",
                    )
                  )
                    return;
                  try {
                    setSaving(true);
                    const res = await fetch(
                      `/api/sales/sales-orders/${id}/convert-to-invoice`,
                      { method: "POST" },
                    );
                    const data = await res.json();
                    if (!res.ok)
                      throw new Error(data.error || "Conversion failure.");

                    toast.success("Sales Invoice generated safely.");
                    router.push(`/${slug}/sales/invoices/${data.invoice_id}`);
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Conversion aborted.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
              >
                Convert To Invoice
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-medium transition shadow disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save Order"}
          </button>
        </div>
      </div>

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}
 */

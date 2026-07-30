// /app/components/sales/returns/SalesReturnFormView.tsx

"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Icon } from "@iconify/react";
import { toast } from "sonner";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../orders/CustomerLookupModal";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLine,
  SalesReturnMasterData,
} from "@/types/sales-return"; // Make sure to mirror your sales-order types structure here

import SalesReturnLines from "./SalesReturnLines";
import { useLoader } from "@/app/context/LoaderContext";
import { OrderFormTabs } from "./OrderFormTabs";

export type SalesReturnLineUI = SalesReturnLine & {
  item_code?: string;
  item_name?: string;
  account_code?: string;
  account_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_name?: string;
  line_total?: number;
  gl_account_id?: string;
};

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

type TabType = "general" | "invoicing" | "shipping";

interface ReturnStage {
  id: string;
  name: string;
  rank: number;
}

export default function SalesReturnFormView({
  slug,
  id,
  isReadOnly = false,
}: Props) {
  const router = useRouter();

  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("general");

  // const [stages, setStages] = useState<ReturnStage[]>([]);
  // const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<SalesReturnMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  // Core Document Entities States
  const [returnOrder, setReturnOrder] = useState<Partial<SalesReturn>>({
    return_no: id ? "" : "[Auto-Generated]",
    customer_id: "",
    customer_name: "",
    return_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    status: "pending inspection",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    credited_amount: 0,
    reference: "",
    email: "",
    salesperson: "",
    cust_return_no: "",
    link_to_cm: "",
    source_of_return: "Others",
    currency_code: "GBP",
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesReturnAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesReturnAddress>
  >({ address_type: "billing" });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesReturnAddress>
  >({ address_type: "shipping" });

  const [lines, setLines] = useState<SalesReturnLineUI[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  /* 
    
    useEffect(() => {
    if (!id) return;

    fetch(`/api/sales/sales-returns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.returnOrder) setReturnOrder(data.returnOrder);
        if (data.lines) setLines(data.lines);
        if (data.billing_address) setBillingAddress(data.billing_address);
        if (data.shipping_address) setShippingAddress(data.shipping_address);
      })
      .catch((err) => console.error("Error fetching return details:", err));
  }, [id]);
    */

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sales/sales-returns/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        if (payload && payload.success && payload.invoice) {
          const actualData = payload.invoice;

          setReturnOrder(actualData.invoice || {});
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

  // Load setup lifecycle pipeline workflows
  /* useEffect(() => {
    if (!isUpdateMode) {
      setIsLoadingStages(false);
      return;
    }

    async function fetchStages() {
      try {
        const response = await fetch("/api/setup/sales/sales_return_stages");
        if (response.ok) {
          const data = await response.json();
          setStages(data);
        }
      } catch (error) {
        console.error("Failed to load sales return workflow pipeline:", error);
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]); */

  const refreshLines = async () => {
    if (!returnOrder.id) return;

    const response = await fetch(
      `/api/purchase-orders/${returnOrder.id}/lines`,
    );

    const data = await response.json();

    setLines(data.lines ?? []);
  };

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  const handleTotalsChange = useCallback(
    (computed: { subtotal: number; tax: number; total: number }) => {
      setReturnOrder((prev) => ({
        ...prev,
        subtotal: computed.subtotal,
        tax_amount: computed.tax,
        total_amount: computed.total,
      }));
    },
    [],
  );

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

  /* const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setReturnOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
      email: customer.email || prev.email,
    }));

    if (customer.billing_address) {
      setBillingAddress((prev) => ({ ...prev, ...customer.billing_address }));
    }
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({ ...prev, ...customer.shipping_address }));
    }
    setCustomerModalOpen(false);
  }; */

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setReturnOrder((prev) => ({
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

  const updateReturnField = <K extends keyof SalesReturn>(
    field: K,
    value: SalesReturn[K],
  ) => {
    setReturnOrder((prev) => ({ ...prev, [field]: value }));
  };

  const handleStageClick = async (stageName: string) => {
    if (
      !id ||
      isUpdatingStatus ||
      returnOrder.status?.toLowerCase() === stageName.toLowerCase()
    )
      return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-returns/${id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageName.toLowerCase() }),
      });

      if (response.ok) {
        setReturnOrder((prev) => ({
          ...prev,
          status: stageName.toLowerCase(),
        }));
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

  const validateDates = (): string[] => {
    const errors: string[] = [];

    const orderDate = returnOrder.order_date
      ? new Date(returnOrder.order_date).getTime()
      : null;

    const dispatchDate = returnOrder.dispatch_date
      ? new Date(returnOrder.dispatch_date).getTime()
      : null;

    const deliveryDate = returnOrder.delivery_date
      ? new Date(returnOrder.delivery_date).getTime()
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
    if (!returnOrder.customer_id)
      errors.push("You must select a valid Customer record.");
    if (!returnOrder.return_date)
      errors.push("Return Date field is mandatory.");
    if (lines.length === 0)
      errors.push("Sales Return must contain at least one line element.");

    errors.push(...validateDates());

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
        order: {
          ...returnOrder,
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
        id ? `/api/sales/sales-returns/${id}` : "/api/sales/sales-returns",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save processing failed.");

      toast.success("Sales return order recorded cleanly");
      router.push(`/${slug}/sales/returns`);
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
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4 container mx-auto p-1 text-black dark:text-white">
      {/* 1. Interactive Step-by-Step Top Status Ribbon Context */}
      {isUpdateMode && !isLoadingStages && stages.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
        >
          {stages.map((stage, index) => {
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const isActive =
              returnOrder.status?.toLowerCase() === stage.name.toLowerCase();
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

      {/* 2. Primary Tab Headings Row Selection Container */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        {(
          [
            { id: "general", label: "General" },
            { id: "invoicing", label: "Invoicing" },
            { id: "shipping", label: "Shipping" },
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

      {/* Tab Panels Layout Matrix Forms */}

      <OrderFormTabs
        activeTab={activeTab}
        order={returnOrder}
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
        updateField={updateReturnField}
        setCustomerModalOpen={setCustomerModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />

      {/* Return Line Detail Component Grid */}
      <SalesReturnLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />

      {/* Summary Calculations Metrics Box Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (Net Return)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(returnOrder.subtotal || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax Aggregations (VAT)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(returnOrder.tax_amount || 0).toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
          <div className="flex justify-between font-semibold text-base">
            <span>Return Grand Total</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {Number(returnOrder.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Command Drawer Buttons */}
      <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/returns`)}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel and Return
        </button>

        <div className="flex gap-3">
          {id &&
            returnOrder.credit_status !== "CREDITED" &&
            returnOrder.status !== "CANCELLED" && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (
                    !confirm(
                      "Convert this authorized sales return into a finalized Credit Note?",
                    )
                  )
                    return;
                  try {
                    setSaving(true);
                    const res = await fetch(
                      `/api/sales/sales-returns/${id}/convert-to-credit-note`,
                      { method: "POST" },
                    );
                    const data = await res.json();
                    if (!res.ok)
                      throw new Error(data.error || "Conversion failure.");

                    toast.success("Sales Credit Note generated safely.");
                    router.push(
                      `/${slug}/sales/credit-notes/${data.credit_note_id}`,
                    );
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
                Issue Credit Note
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-medium transition shadow disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save Return Order"}
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
/* 
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">

        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Return Order No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={returnOrder.return_no || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>
                Customer No. <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={returnOrder.customer_id || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Customer Name</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.customer_name || ""}
                onChange={(e) =>
                  updateReturnField("customer_name", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>External Reference</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.reference || ""}
                onChange={(e) => updateReturnField("reference", e.target.value)}
              />
            </div>

            <div>
              <label className={labelStyle}>Return Date</label>
              <input
                type="date"
                className={inputStyle}
                value={returnOrder.return_date || ""}
                onChange={(e) =>
                  updateReturnField("return_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Posting Date</label>
              <input
                type="date"
                className={inputStyle}
                value={returnOrder.posting_date || ""}
                onChange={(e) =>
                  updateReturnField("posting_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Salesperson</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.salesperson || ""}
                onChange={(e) =>
                  updateReturnField("salesperson", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Source Of Return</label>
              <select
                className={inputStyle}
                value={returnOrder.source_of_return || "Others"}
                onChange={(e) =>
                  updateReturnField("source_of_return", e.target.value)
                }
              >
                <option value="Others">Others</option>
                <option value="Shopify">Shopify</option>
                <option value="B2B Portal">B2B Portal</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Cust. Return No.</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.cust_return_no || ""}
                onChange={(e) =>
                  updateReturnField("cust_return_no", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Link to Credit Note</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.link_to_cm || ""}
                onChange={(e) =>
                  updateReturnField("link_to_cm", e.target.value)
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelStyle}>Status Display</label>
              <input
                type="text"
                disabled
                className="w-full border border-slate-200 dark:border-slate-800 p-1.5 rounded text-xs bg-slate-50 dark:bg-slate-950 font-bold text-emerald-600 uppercase tracking-wide"
                value={returnOrder.status || ""}
              />
            </div>
          </div>
        )}


        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Bill-to Cust. No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={returnOrder.customer_id || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Billing Name</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.name || ""}
                onChange={(e) =>
                  setBillingAddress({ ...billingAddress, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Currency</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.currency_code || "GBP"}
                onChange={(e) =>
                  updateReturnField("currency_code", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Total Credited Amount</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={Number(returnOrder.credited_amount || 0).toFixed(2)}
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
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.county || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    county: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className={labelStyle}>Postcode</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.postcode || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    postcode: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Country</label>
              <input
                type="text"
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
            <div>
              <label className={labelStyle}>Telephone</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.phone || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Email Address</label>
              <input
                type="text"
                className={inputStyle}
                value={returnOrder.email || ""}
                onChange={(e) => updateReturnField("email", e.target.value)}
              />
            </div>
          </div>
        )}

 
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Return Collection Name</label>
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
              <label className={labelStyle}>Company Name</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.company_name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    company_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelStyle}>Est. Receipt/Arrival Date</label>
              <input
                type="date"
                className={inputStyle}
                value={returnOrder.receipt_date || ""}
                onChange={(e) =>
                  updateReturnField("receipt_date", e.target.value)
                }
              />
            </div>

            <div>
              <label className={labelStyle}>Address Line 1</label>
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
              <label className={labelStyle}>Address Line 2</label>
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
              <label className={labelStyle}>City Origin</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.city || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    city: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.county || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    county: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className={labelStyle}>Postcode</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.postcode || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    postcode: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Country</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.country || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    country: e.target.value,
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelStyle}>Logistics Contact Number</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.phone || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    phone: e.target.value,
                  })
                }
              />
            </div>
          </div>
        )}

     
        {activeTab === "margin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Return Value Analysis (LCY)
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Return Subtotal</span>
                  <span className="font-semibold">
                    {Number(returnOrder.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Refund Tax (VAT)</span>
                  <span className="font-semibold">
                    {Number(returnOrder.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t pt-1 font-bold text-emerald-600">
                  <span className="">Grand Total Refund</span>
                  <span className="">
                    {Number(returnOrder.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
*/

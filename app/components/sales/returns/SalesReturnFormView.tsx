// /app/components/sales/returns/SalesReturnFormView.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";

import {
  SalesReturn,
  SalesReturnAddress,
  SalesReturnLine,
} from "@/types/sales-return"; // Make sure to mirror your sales-order types structure here

import SalesReturnLines from "./SalesReturnLines";

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
};

type TabType = "general" | "invoicing" | "shipping" | "margin";

interface ReturnStage {
  id: string;
  name: string;
  rank: number;
}

export default function SalesReturnFormView({ slug, id }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const [stages, setStages] = useState<ReturnStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const isUpdateMode = !!id;

  // Core Document Entities States
  const [returnOrder, setReturnOrder] = useState<SalesReturn>({
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

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesReturnAddress>
  >({
    address_type: "billing",
    name: "",
    address_1: "",
    address_2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
    phone: "",
    email: "",
  });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesReturnAddress>
  >({
    address_type: "shipping",
    name: "",
    company_name: "",
    address_1: "",
    address_2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
    phone: "",
  });

  const [lines, setLines] = useState<SalesReturnLineUI[]>([]);

  // Hydrate Data
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

  // Load setup lifecycle pipeline workflows
  useEffect(() => {
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
  }, [isUpdateMode]);

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

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
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

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!returnOrder.customer_id)
      errors.push("You must select a valid Customer record.");
    if (!returnOrder.return_date)
      errors.push("Return Date field is mandatory.");
    if (lines.length === 0)
      errors.push("Sales Return must contain at least one line element.");

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
        returnOrder,
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
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5";

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
            { id: "shipping", label: "Return Logistics" },
            { id: "margin", label: "Value Analysis" },
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
        {/* TAB: GENERAL */}
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
              <label className={labelStyle}>Customer No. *</label>
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

        {/* TAB: INVOICING */}
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

        {/* TAB: SHIPPING (RETURN LOGISTICS) */}
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

        {/* TAB: VALUE ANALYSIS */}
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

/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormLine {
  lineNo: number;
  lineType: "ITEM" | "GL_ACCOUNT";
  itemId: string;
  glAccountId: string;
  warehouseId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

interface CustomerSetupOption {
  id: string;
  name: string;
}
interface CurrencySetupOption {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
}
interface InvoiceLookupItem {
  id: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: string | number;
  customer_name: string;
  customer_id: string;
}

interface ApiReturnedLine {
  line_no: number;
  line_type: "ITEM" | "GL_ACCOUNT";
  item_id: string | null;
  gl_account_id: string | null;
  warehouse_id: string | null;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  discount_amount: string | number;
  vat_percent: string | number;
}

export default function SalesReturnFormView({
  slug,
  id,
}: {
  slug: string;
  id?: string;
}) {
  const router = useRouter();
  const isEditMode = !!id; // Replaces static "isViewMode" to allow text mutations during edits

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Data Source Tracking State
  const [status, setStatus] = useState<"DRAFT" | "POSTED">("DRAFT");
  const isPosted = status === "POSTED";

  // Database Dependency Setup States
  const [customers, setCustomers] = useState<CustomerSetupOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencySetupOption[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceLookupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Document Entry States
  const [returnNo, setReturnNo] = useState("Draft Auto-Sequence");
  const [customerId, setCustomerId] = useState("");
  const [salesInvoiceId, setSalesInvoiceId] = useState("");

  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    {
      lineNo: 10000,
      lineType: "ITEM",
      itemId: "",
      glAccountId: "",
      warehouseId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      vatPercent: 0,
    },
  ]);

  // Gather setup definitions and load detail rows conditionally
  useEffect(() => {
    async function initializeForm() {
      try {
        const setupRes = await fetch(
          `/api/sales/sales-returns/setup-dependencies`,
        );
        const setupData = await setupRes.json();
        if (!setupData.success)
          throw new Error(setupData.error || "Dependency generation aborted.");

        setCustomers(setupData.customers);
        setCurrencies(setupData.currencies);
        setAllInvoices(setupData.invoices);

        // Pre-set Default Base Currency parameters if creating a new entry

        if (!isEditMode) {
          const baseCurr = setupData.currencies.find(
            (c: CurrencySetupOption) => c.is_base,
          );
          if (baseCurr) {
            setCurrencyId(baseCurr.id);
            setExchangeRate(Number(baseCurr.exchange_rate));
          }
          // Pre-populate empty single row item matrix on fresh setup
          setLines([
            {
              lineNo: 10000,
              lineType: "ITEM",
              itemId: "",
              glAccountId: "",
              warehouseId: "",
              description: "",
              quantity: 1,
              unitPrice: 0,
              discountAmount: 0,
              vatPercent: 0,
            },
          ]);
        }

        if (isEditMode) {
          const detailRes = await fetch(`/api/sales/sales-returns/${id}`);
          const detailData = await detailRes.json();
          if (!detailData.success)
            throw new Error(detailData.error || "Record read failure");

          const inv = detailData.invoice;
          setReturnNo(inv.return_no);
          setStatus(inv.status || "DRAFT"); // Track and apply ledger state lock parameters
          setCustomerId(inv.customer_id);
          setSalesInvoiceId(inv.sales_invoice_id || "");
          setReturnDate(new Date(inv.return_date).toISOString().split("T")[0]);
          setCurrencyId(inv.currency_id || "");
          setExchangeRate(Number(inv.exchange_rate || 1));
          setNotes(inv.notes || "");

          const mappedLines = detailData.lines.map(
            (l: ApiReturnedLine): FormLine => ({
              lineNo: l.line_no,
              lineType: l.line_type,
              // Map foreign keys cleanly back into text fields to preserve edit safety
              itemId: l.item_id || "",
              glAccountId: l.gl_account_id || "",
              warehouseId: l.warehouse_id || "",
              description: l.description || "",
              quantity: Number(l.quantity),
              unitPrice: Number(l.unit_price),
              discountAmount: Number(l.discount_amount || 0),
              vatPercent: Number(l.vat_percent || 0),
            }),
          );
          setLines(mappedLines);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    initializeForm();
  }, [id, isEditMode]);

  // Handle Post Action Worker Trigger
  const handlePost = async () => {
    if (
      !id ||
      !window.confirm(
        "Are you sure you want to POST this Credit Note? This will lock the document permanently and update financial ledgers.",
      )
    )
      return;
    setPosting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sales/sales-returns/${id}/post`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Posting process failed.");

      setStatus("POSTED"); // Immediately lock local interactive states
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // Safe Generic Form Field Matrix Mutator
  const updateLineField = <K extends keyof FormLine>(
    index: number,
    field: K,
    value: FormLine[K],
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleCurrencyChange = (targetId: string) => {
    setCurrencyId(targetId);
    const selected = currencies.find((c) => c.id === targetId);
    if (selected) {
      setExchangeRate(Number(selected.exchange_rate));
    }
  };

  const selectInvoiceFromModal = (inv: InvoiceLookupItem) => {
    setSalesInvoiceId(inv.id);
    setCustomerId(inv.customer_id); // Auto-bind customer relative to source billing trace logs
    setIsModalOpen(false);
  };

  const handleAddLine = () => {
    const nextNo = (lines[lines.length - 1]?.lineNo || 0) + 10000;
    setLines([
      ...lines,
      {
        lineNo: nextNo,
        lineType: "ITEM",
        itemId: "",
        glAccountId: "",
        warehouseId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        vatPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return; // Maintain document structure integrity
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleDelete = async () => {
    if (
      !id ||
      !window.confirm(
        "Are you sure you want to permanently delete this Credit Note? This action cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sales/sales-returns/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletions rejected");
      router.push(`/${slug}/sales/returns`);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setDeleting(false);
    }
  };

  const subtotal = lines.reduce(
    (acc, l) => acc + (l.quantity * l.unitPrice - l.discountAmount),
    0,
  );
  const taxAmount = lines.reduce(
    (acc, l) =>
      acc +
      (l.quantity * l.unitPrice - l.discountAmount) * (l.vatPercent / 100),
    0,
  );
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setSubmitting(true);
    setError(null);

    // Determine path routing based on document persistence state
    const targetUrl = isEditMode
      ? `/api/sales/sales-returns/${id}`
      : `/api/sales/sales-returns`;

    const targetMethod = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(targetUrl, {
        method: targetMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          salesInvoiceId: salesInvoiceId || null,
          returnDate,
          currencyId,
          exchangeRate,
          notes,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission rejected");
      router.push(`/${slug}/sales/returns`);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = allInvoices.filter(
    (inv) =>
      inv.invoice_no.toLowerCase().includes(modalSearch.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(modalSearch.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-6 text-xs text-gray-500 animate-pulse">
        Initializing System Credit Note Interfaces...
      </div>
    );

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
      <form onSubmit={handleSubmit}>
      
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Link
                href={`/${slug}/sales/returns`}
                className="text-xs font-semibold hover:underline text-gray-500 dark:text-gray-400"
              >
                &larr; Returns & Credit Notes Directory
              </Link>
              <h1 className="text-2xl font-bold mt-1">
                {isEditMode
                  ? `Update Credit Note — ${returnNo}`
                  : "Log New Return Document"}
              </h1>
              {isPosted ? (
                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded text-xs font-bold border border-green-200 dark:border-green-800 tracking-wide uppercase select-none">
                  Posted Ledger Record
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded text-xs font-bold border border-amber-200 dark:border-amber-800 tracking-wide uppercase select-none">
                  Draft Document
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isEditMode && !isPosted && (
                <>
                  <button
                    type="button"
                    disabled={deleting || submitting || posting}
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-medium transition disabled:bg-gray-400"
                  >
                    {deleting ? "Purging Document..." : "Delete Credit Note"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting || submitting || posting}
                    onClick={handlePost}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-xs font-medium transition disabled:bg-gray-400"
                  >
                    {posting ? "Posting..." : "Post Document"}
                  </button>
                </>
              )}

              {!isPosted && (
                <button
                  type="submit"
                  disabled={submitting || deleting || posting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-xs font-medium transition disabled:bg-gray-400"
                >
                  {submitting
                    ? "Committing..."
                    : isEditMode
                      ? "Save Adjustments"
                      : "Commit Document"}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mt-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

  
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Customer Party
            </label>
            <select
              required
              disabled={isPosted}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full text-xs border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

 
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Linked Invoice Reference
            </label>
            <div className="flex gap-1 mt-1">
              <select
                disabled={isPosted}
                value={salesInvoiceId}
                onChange={(e) => {
                  setSalesInvoiceId(e.target.value);
                  const inv = allInvoices.find((i) => i.id === e.target.value);
                  if (inv) setCustomerId(inv.customer_id);
                }}
                className="flex-1 text-xs border p-2 rounded-md bg-white dark:bg-slate-800 truncate focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
              >
                <option value="">-- Direct (Unlinked) --</option>
                {allInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_no}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isPosted}
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-900 text-white text-xs px-2.5 rounded hover:bg-gray-800 transition dark:bg-slate-700 dark:hover:bg-slate-600"
                title="Open Advanced Search Dialog"
              >
                🔍
              </button>
            </div>
          </div>


          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Billing Currency
            </label>
            <select
              required
              disabled={isPosted}
              value={currencyId}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="mt-1 w-full text-xs border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
            >
              {currencies.map((curr) => (
                <option key={curr.id} value={curr.id}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </select>
          </div>


          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Exchange Valuation Rate
            </label>
            <input
              type="number"
              required
              step="any"
              disabled={isPosted}
              min={0.000001}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full text-xs border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 font-mono text-right dark:border-slate-700"
            />
          </div>
        </div>


        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm mt-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Voucher Header Notes
          </label>
          <textarea
            value={notes}
            disabled={isPosted}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add administrative summary justifications here..."
            className="w-full text-xs border p-2 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 h-16 resize-none"
          />
        </div>


        <div className="border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 mt-4 shadow-sm overflow-x-auto">
          <table className="w-full text-xs min-w-[1050px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-800 text-left">
              <tr>
                <th className="p-3 w-32">Type</th>
                <th className="p-3">Reference (Item / Account UUID)</th>
                <th className="p-3 w-36">Location</th>
                <th className="p-3 w-24 text-right">Qty</th>
                <th className="p-3 w-28 text-right">Unit Price</th>
                <th className="p-3 w-24 text-right">Tax (%)</th>
                <th className="p-3 text-right w-32">Total</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineNet =
                  line.quantity * line.unitPrice - line.discountAmount;
                const lineTotal = lineNet + lineNet * (line.vatPercent / 100);

                return (
                  <tr
                    key={idx}
                    className="align-top border-b dark:border-slate-800/50"
                  >
                    <td className="p-2">
                      <select
                        disabled={isPosted}
                        value={line.lineType}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "lineType",
                            e.target.value as "ITEM" | "GL_ACCOUNT",
                          )
                        }
                        className="w-full text-xs border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="ITEM">ITEM</option>
                        <option value="GL_ACCOUNT">GL_ACCOUNT</option>
                      </select>
                    </td>
                    <td className="p-2 space-y-1">
                      <input
                        type="text"
                        disabled={isPosted}
                        required
                        value={
                          line.lineType === "ITEM"
                            ? line.itemId
                            : line.glAccountId
                        }
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            line.lineType === "ITEM" ? "itemId" : "glAccountId",
                            e.target.value,
                          )
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                      <input
                        type="text"
                        disabled={isPosted}
                        placeholder="Line descriptive remark text..."
                        value={line.description}
                        onChange={(e) =>
                          updateLineField(idx, "description", e.target.value)
                        }
                        className="w-full text-[11px] border p-1 rounded-md text-gray-500 bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isPosted}
                        value={line.warehouseId}
                        onChange={(e) =>
                          updateLineField(idx, "warehouseId", e.target.value)
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0}
                        step="any"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0}
                        max={100}
                        step="any"
                        value={line.vatPercent}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "vatPercent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100 pt-3.5 pr-4 select-none">
                      ${lineTotal.toFixed(2)}
                    </td>
                    {!isPosted && (
                      <td className="p-2 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 font-bold text-xs"
                          title="Delete Row"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isPosted && (
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded shadow-sm"
              >
                + Add Item Line Row
              </button>
            </div>
          )}

 
          <div className="bg-gray-50/50 dark:bg-slate-800/20 p-4 border-t dark:border-slate-800 flex flex-col items-end space-y-1 text-xs select-none">
            <div className="w-[260px] flex justify-between text-gray-600 dark:text-gray-400">
              <span>Net Return Subtotal:</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-gray-600 dark:text-gray-400">
              <span>VAT Refund Balance:</span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 border-t dark:border-slate-800 pt-1 mt-1">
              <span>Total Credit Amount:</span>
              <span className="font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>


        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-xl">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                  Select Original Document Record Source
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Filter by billing target number or customer name values..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full text-xs p-2 border dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-2 divide-y dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredInvoices.length ? (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => selectInvoiceFromModal(inv)}
                      className="p-2.5 text-xs flex justify-between items-center hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer rounded transition-colors group"
                    >
                      <div>
                        <p className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                          {inv.invoice_no}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {inv.customer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900 dark:text-gray-100">
                          ${Number(inv.total_amount).toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 italic">
                    No corresponding records resolved.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} */

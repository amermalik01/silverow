// /app/components/sales/orders/SalesOrderForm.tsx

// /app/components/sales/orders/SalesOrderForm.tsx
"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
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
} from "@/types/sales-order";
import SalesOrderLines from "./SalesOrderLines";

export type SalesOrderLineUI = SalesOrderLine & {
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

interface OrderStage {
  id: string;
  name: string;
  rank: number;
}

export default function SalesOrderForm({ slug, id }: Props) {
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
    req_delivery_date: new Date().toISOString().split("T")[0],
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

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "billing" });
  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesOrderAddress>
  >({ address_type: "shipping" });

  // const [billingAddress, setBillingAddress] = useState<SalesOrderAddress>({
  //   address_type: "billing",
  //   city: "",
  //   county: "",
  //   postcode: "",
  //   country: "",
  //   telephone: "",
  //   email: "",
  // });

  // const [shippingAddress, setShippingAddress] = useState<SalesOrderAddress>({
  //   address_type: "shipping",
  //   name: "",
  //   address_1: "",
  //   address_2: "",
  //   city: "",
  //   county: "",
  //   postcode: "",
  //   country: "",
  // });

  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);

  // Hydrate Data
  useEffect(() => {
    if (!id) return;

    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        if (data.lines) setLines(data.lines);
        if (data.billing_address) setBillingAddress(data.billing_address);
        if (data.shipping_address) setShippingAddress(data.shipping_address);
      })
      .catch((err) => console.error("Error fetching order details:", err));
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
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-sm bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
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

      {/* 2. Primary Tab Headings Row Selection Container */}
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

      {/* Tab Panels Layout Matrix Forms */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
        {/* TAB: GENERAL */}
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
              <label className={labelStyle}>Customer No. *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={order.customer_id || "Click Select..."}
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
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                className={inputStyle}
                value={order.customer_name || ""}
                onChange={(e) =>
                  updateOrderField("customer_name", e.target.value)
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
            {/* <div>
              <label className={labelStyle}>County</label>
              <input type="text" className={inputStyle} value={billingAddress.county || ""} onChange={(e) => setBillingAddress({ ...billingAddress, county: e.target.value })} />
            </div> */}

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
            {/* <div>
              <label className={labelStyle}>Postcode/Co.</label>
              <input type="text" className={inputStyle} value={billingAddress.postcode || ""} onChange={(e) => setBillingAddress({ ...billingAddress, postcode: e.target.value })} />
            </div> */}
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
              <label className={labelStyle}>Email</label>
              <input
                type="text"
                className={inputStyle}
                value={order.email || ""}
                onChange={(e) => updateOrderField("email", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Salesperson</label>
              <input
                type="text"
                className={inputStyle}
                value={order.salesperson || ""}
                onChange={(e) =>
                  updateOrderField("salesperson", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Cust. Order No.</label>
              <input
                type="text"
                className={inputStyle}
                value={order.cust_order_no || ""}
                onChange={(e) =>
                  updateOrderField("cust_order_no", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Link to PO</label>
              <input
                type="text"
                className={inputStyle}
                value={order.link_to_po || ""}
                onChange={(e) => updateOrderField("link_to_po", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>SQ No.</label>
              <input
                type="text"
                className={inputStyle}
                value={order.sq_no || ""}
                onChange={(e) => updateOrderField("sq_no", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Source Of Order</label>
              <select
                className={inputStyle}
                value={order.source_of_order || "Others"}
                onChange={(e) =>
                  updateOrderField("source_of_order", e.target.value)
                }
              >
                <option value="Others">Others</option>
                <option value="Shopify">Shopify</option>
                <option value="B2B Portal">B2B Portal</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Posting Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.posting_date || ""}
                onChange={(e) =>
                  updateOrderField("posting_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Order Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.order_date || ""}
                onChange={(e) => updateOrderField("order_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Dispatch Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.dispatch_date || ""}
                onChange={(e) =>
                  updateOrderField("dispatch_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Req. Del. Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.req_delivery_date || ""}
                onChange={(e) =>
                  updateOrderField("req_delivery_date", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Delivery Date</label>
              <input
                type="date"
                className={inputStyle}
                value={order.delivery_date || ""}
                onChange={(e) =>
                  updateOrderField("delivery_date", e.target.value)
                }
              />
            </div>
          </div>
        )}

        {/* TAB: INVOICING */}
        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Bill-to Cust. No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={order.customer_id || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Currency</label>
              <input
                type="text"
                className={inputStyle}
                value={order.currency_code || "GBP"}
                onChange={(e) =>
                  updateOrderField("currency_code", e.target.value)
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Invoiced Value Allocation</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={Number(order.invoiced_amount || 0).toFixed(2)}
              />
            </div>
          </div>
        )}

        {/* TAB: SHIPPING */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Shipping Destination Name</label>
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
              <label className={labelStyle}>City Destination</label>
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
          </div>
        )}

        {/* TAB: MARGIN ANALYSIS */}
        {activeTab === "margin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Profit Margin (LCY)
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sales Value</span>
                  <span className="font-semibold">
                    {Number(order.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Tax Amount</span>
                  <span className="font-semibold">
                    {Number(order.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 font-bold text-emerald-600">
                  <span className="">Grand Total</span>
                  <span className="">
                    {Number(order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Line Detail Component Grid */}
      <SalesOrderLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />

      {/* Order Summary Calculations Metrics Box Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-sm">
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

      {/* Bottom Action Command Drawer Buttons */}
      <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/orders`)}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
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
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                Convert To Invoice
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow disabled:opacity-50"
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

/* "use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

type Props = {
  slug: string;
  id?: string;
};

export default function SalesOrderForm({ slug, id }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Core Document Entities States
  const [order, setOrder] = useState<SalesOrder>({
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoiced_amount: 0,
  });

  const [billingAddress, setBillingAddress] = useState<SalesOrderAddress>({
    address_type: "billing",
  });
  const [shippingAddress, setShippingAddress] = useState<SalesOrderAddress>({
    address_type: "shipping",
  });
  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        if (data.lines) setLines(data.lines);
        if (data.billing_address) setBillingAddress(data.billing_address);
        if (data.shipping_address) setShippingAddress(data.shipping_address);
      })
      .catch((err) => console.error("Error fetching order details:", err));
  }, [id]);



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
      customer_name: customer.name,
    }));

    if (customer.billing_address) {
      setBillingAddress((prev) => ({ ...prev, ...customer.billing_address }));
    }
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({ ...prev, ...customer.shipping_address }));
    }
    setCustomerModalOpen(false);
  };

  // UI Client-side Validation Engine
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!order.customer_id) {
      errors.push("You must select a valid Customer record.");
    }
    if (!order.order_date) {
      errors.push("Order Date field is mandatory.");
    }
    if (lines.length === 0) {
      errors.push("Sales Order must contain at least one line element.");
    }

    lines.forEach((line, index) => {
      const lineNo = index + 1;
      if (line.line_type === "ITEM" && !line.item_id) {
        errors.push(`Line #${lineNo}: Item specification is blank.`);
      }
      if (line.line_type === "GL_ACCOUNT" && !line.gl_account_id) {
        errors.push(
          `Line #${lineNo}: General Ledger validation source is blank.`,
        );
      }
      if (line.line_type !== "COMMENT" && Number(line.quantity || 0) <= 0) {
        errors.push(
          `Line #${lineNo}: Quantity value must be greater than zero.`,
        );
      }
    });

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



  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">

      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-400 space-y-1">
          <p className="font-semibold text-red-800 dark:text-red-300">
            Please fix the following validation criteria:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

 
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Order Date
          </label>
          <input
            type="date"
            value={order.order_date}
            onChange={(e) => setOrder({ ...order, order_date: e.target.value })}
            className="border dark:border-slate-700 rounded p-2 w-full bg-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Reference / PO No
          </label>
          <input
            type="text"
            placeholder="e.g. PO-9876"
            value={order.reference || ""}
            onChange={(e) => setOrder({ ...order, reference: e.target.value })}
            className="border dark:border-slate-700 rounded p-2 w-full bg-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Customer Selection
          </label>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="border dark:border-slate-700 rounded p-2 w-full text-left bg-gray-50 dark:bg-slate-800 text-sm flex justify-between items-center"
          >
            <span
              className={
                order.customer_name
                  ? "text-black dark:text-white"
                  : "text-gray-400"
              }
            >
              {order.customer_name || "Select Customer metadata..."}
            </span>
            <span className="text-gray-400 text-xs">🔍</span>
          </button>
        </div>
      </div>


      <SalesOrderLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-sm">
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
            <span className="text-blue-600 dark:text-blue-400">
              {Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
          {id && (
            <>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Invoiced Value Allocation</span>
                <span>{Number(order.invoiced_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-600 font-medium">
                <span>Uninvoiced Remaining balance</span>
                <span>
                  {(
                    Number(order.total_amount || 0) -
                    Number(order.invoiced_amount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>


      <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/orders`)}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
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
                      "Are you sure you want to finalize and convert this order into a formal Sales Invoice?",
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

                    alert("Sales Invoice generated successfully.");
                    router.push(`/${slug}/sales/invoices/${data.invoice_id}`);
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Conversion processing aborted.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                Convert To Invoice
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow disabled:opacity-50"
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

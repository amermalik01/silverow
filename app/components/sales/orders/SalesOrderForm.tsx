// app/components/sales/orders/SalesOrderForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLineUI,
  SalesOrderMasterData,
} from "@/types/sales-order";
import SalesOrderLines from "./SalesOrderLines";
import { OrderFormTabs } from "./OrderFormTabs";
import CustomerLookupModal, { CustomerLookupItem } from "./CustomerLookupModal";
import CustomerDeliveryLocationModal from "./CustomerDeliveryLocationModal";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

type TabType = "general" | "invoicing" | "shipping" | "margin";

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
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Manage view/edit state locally
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Add states for modal control
  const [showShipModal, setShowShipModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<SalesOrderMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

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
    // status: "order processing",
    status: "draft",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoiced_amount: 0,
    reference: "",
    notes: "",
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

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  const isCompleted = order.status === "completed" || order.status === "POSTED";
  const isFormDisabled = !isEditMode || isCompleted;

  // Check if all line items with quantity > 0 have been shipped
  const isFullyDispatched = useMemo(() => {
    if (lines.length === 0) return false;
    const itemLines = lines.filter((l) => (l.line_type || "ITEM") === "ITEM");
    if (itemLines.length === 0) return false;

    return itemLines.every((l) => {
      const qty = Number(l.quantity || 0);
      const shpd = Number(l.quantity_shipped || 0);
      return qty > 0 && shpd >= qty;
    });
  }, [lines]);

  useEffect(() => {
    if (!id) return;

    show("Fetching Record...");

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

    const response = await fetch(`/api/sales/sales-orders/${order.id}/lines`);

    const data = await response.json();

    setLines(data.lines ?? []);
  };

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  /* const financials = useMemo(() => {
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
  }, [lines, currencyConfig.exchange_rate]); */

  const financials = useMemo(() => {
    const originalAmount = lines.reduce(
      (sum, l) => sum + Number(l.original_amount || 0),
      0,
    );
    const totalDiscount = lines.reduce(
      (sum, l) => sum + Number(l.discount_amount || 0),
      0,
    );
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;

    const rate =
      Number(currencyConfig.exchange_rate) > 0
        ? Number(currencyConfig.exchange_rate)
        : 1;

    const amountInclVatLCY = Number(amountInclVat) * rate;

    return {
      originalAmount,
      totalDiscount,
      amount,
      vat,
      amountInclVat,
      amountInclVatLCY,
    };
  }, [lines, currencyConfig.exchange_rate]);

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_no: customer.customer_code,
      customer_name: customer.name,
      email: customer.email || prev.email,
      // Customer Settings & Financial defaults

      customer_posting_group_id:
        customer.sales_posting_group_id || customer.posting_group || "",
      vat_business_posting_group_id:
        customer.sales_posting_group_id || customer.posting_group || "",

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
    if (!order.customer_id) errors.push("Customer selection is required.");

    if (
      !order.customer_posting_group_id &&
      !order.vat_business_posting_group_id
    ) {
      errors.push(
        "Selected customer does not have a valid Customer/VAT Posting Group assigned.",
      );
    }

    if (!order.order_date) errors.push("Order Date field is mandatory.");
    if (lines.length === 0)
      errors.push("Sales Order must contain at least one line element.");

    if (!currencyConfig.currency_id)
      errors.push("Transactional currency is required.");
    if (lines.length === 0)
      errors.push("Sales orders require at least one line item.");

    errors.push(...validateDates());

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        id ? `/api/sales/sales-orders/${id}` : "/api/sales/sales-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Execution error writing back sales records.",
        );

      toast.success(id ? "Sales Order Updated" : "Sales Order Created");

      if (id) {
        setIsEditMode(false);
        router.refresh();
      } else {
        if (result?.id)
          router.replace(`/${slug}/sales/sales-orders/${result?.id}/edit`);
        // if (result?.data?.id)
        //   router.replace(
        //     `/${slug}/sales/sales-orders/${result?.data?.id}/edit`,
        //   );
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  const handleStageClick = async (stageName: string) => {
    const standardizedStatus = stageName.toLowerCase() as SalesOrder["status"];
    if (
      !id ||
      isUpdatingStatus ||
      order.status?.toLowerCase() === stageName.toLowerCase()
    ) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      // 1. Check if the user is triggering a physical outbound shipment workflow
      if (standardizedStatus === "shipped") {
        const confirmPosting = confirm(
          "Are you sure you want to change status to Shipped? This will generate a Sales Shipment, reduce stock lines from inventory, and write entries to the G/L ledger automatically.",
        );
        if (!confirmPosting) {
          setIsUpdatingStatus(false);
          return;
        }

        toast.loading("Generating sales shipment draft context...", {
          id: "posting-toast",
        });

        // Step A: Generate the Sales Shipment Draft matching your order scope
        const shipmentDraftRes = await fetch("/api/sales/sales-shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sales_order_id: id,
            shipment_date: new Date().toISOString().split("T")[0],
            lines: lines
              .map((l) => ({
                sales_order_line_id: l.id,
                item_id: l.item_id,
                quantity:
                  Number(l.quantity || 0) - Number(l.quantity_shipped || 0),
                warehouse_location_id: l.warehouse_id || null,
              }))
              .filter((l) => l.quantity > 0),
          }),
        });

        const shipmentDraftData = await shipmentDraftRes.json();
        if (!shipmentDraftRes.ok) {
          throw new Error(
            shipmentDraftData.error ||
              "Failed to initialize shipment master record.",
          );
        }

        const targetShipmentId = shipmentDraftData.id;

        toast.loading(
          "Executing inventory dispatch and general ledger adjustments...",
          { id: "posting-toast" },
        );

        // Step B: Submit to SalesShipmentPostingService endpoint
        const postRes = await fetch(
          `/api/sales-shipments/${targetShipmentId}/post`,
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
          "Stock dispatch processing & item allocations executed successfully.",
          { id: "posting-toast" },
        );
        setOrder((prev) => ({ ...prev, status: "shipped" }));
        router.refresh();
        return;
      }

      // 2. Standard state fallback
      const response = await fetch(`/api/sales/sales-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            ...order,
            ...currencyConfig,
            customer_id: order.customer_id || "",
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
      console.error("Error updating sales order stage:", error);
      if (error instanceof Error) {
        toast.error(
          error.message || "Network error updating sales order stage status.",
          { id: "posting-toast" },
        );
      } else {
        toast.error("Network error updating sales order stage status.", {
          id: "posting-toast",
        });
      }
    } finally {
      setIsUpdatingStatus(false);
    }

    /* try {
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
    } */
  };

  // 1. Separate Handler for Shipping Items
  const handleShipItems = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Saving and Shipping Record...");

    try {
      toast.loading("Processing physical stock dispatch...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/sales/sales-orders/${id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, lines }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ship stock");

      toast.success("Stock shipped & ledger entries committed!", {
        id: "action-toast",
      });
      setShowShipModal(false);
      refreshLines();
      router.refresh();
    } catch (err) {
      if (err instanceof Error)
        toast.error(err.message || "Error shipping stock", {
          id: "action-toast",
        });
    } finally {
      setIsPosting(false);
      hide();
    }
  };

  // 2. Separate Handler for Posting Invoice
  const handlePostInvoice = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Posting Invoice...");
    try {
      toast.loading("Posting sales invoice to G/L ledger...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/sales/sales-orders/${id}/post-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_po_no: order.reference,
          posting_date: order.posting_date,
          order_date: order.order_date,
          financials: financials,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to post sales invoice");

      toast.success("Sales invoice posted cleanly!", { id: "action-toast" });
      setShowInvoiceModal(false);

      router.push(`/${slug}/sales/sales-orders`);
    } catch (err) {
      if (err instanceof Error)
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
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs text-slate-500 dark:text-slate-400 mb-0.5 col-span-4";

  return (
    <div className="space-y-4">
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
            This Sales Order is <strong>Completed / Fully Posted</strong> and
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
              [
                "general",
                "invoicing",
                "shipping",
                "margin analysis",
              ] as TabType[]
            ).map((tab) => (
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
                      // className={`px-4 py-1.5 flex items-center gap-1 transition-all duration-150 ease-in-out cursor-pointer hover:brightness-95
                      //   ${isFirst ? "rounded-l-md" : ""}
                      //   ${isLast ? "rounded-r-md" : ""}
                      //   ${isActive ? activeBg : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
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
          updateField={updateOrderField}
          setCustomerModalOpen={setCustomerModalOpen}
          setLocationModalOpen={setLocationModalOpen}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <SalesOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isFormDisabled}
        salesOrder={order}
        refreshLines={refreshLines}
      />

      {/* <SalesOrderLines lines={lines} setLines={setLines} /> */}

      <div className="bg-white border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 pl-4 pr-4">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
                className={`${inputStyle} font-mono`}
                value={order.notes || ""}
                onChange={(e) => updateOrderField("notes", e.target.value)}
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
                <input
                  type="number"
                  // step="any"
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
            {financials.totalDiscount > 0 && (
              <>
                <div className="flex justify-between pb-1 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Subtotal</span>
                  <span>
                    {financials.originalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {selectedCurrency?.code || ""}
                  </span>
                </div>
                <div className="flex justify-between pb-1 text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">Total Discount</span>
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

        <div className="flex items-center justify-between pt-4 bg-slate-50 dark:bg-slate-900/60 pl-4 pr-4 pb-4 rounded-lg">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{" "}
              Partially Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
              Reserved Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
              Dispatched Stock
            </span>
          </div>

          {/* Dedicated Action Buttons */}
          <div className="flex items-center gap-2">
            {isUpdateMode && (
              <>
                <Button
                  type="button"
                  variant="post"
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={isPosting || isCompleted}
                  // className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Post Invoice
                </Button>

                <Button
                  type="button"
                  variant="dispatch"
                  onClick={() => setShowShipModal(true)}
                  disabled={isPosting || isFullyDispatched || isCompleted}
                  // className={`px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors ${
                  //   isFullyDispatched || isCompleted
                  //     ? "text-amber-500 dark:text-amber-400 opacity-60 cursor-not-allowed"
                  //     : "text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  // }`}
                >
                  Ship Items
                </Button>
              </>
            )}
            {/* {!isCompleted && (
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )} */}

            {!isCompleted && (
              <>
                {!isEditMode ? (
                  <Button
                    type="button"
                    variant="edit"
                    onClick={() => setIsEditMode(true)}
                    // className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="save"
                    onClick={handleSave}
                    disabled={saving}
                    // className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )}
              </>
            )}

            {/* {!isUpdateMode && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded"
              >
                {saving ? "Creating..." : "Save"}
              </Button>
            )} */}

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

      {/* <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Edit / Save
            </Button>

            <Button
              type="button"
              onClick={() => router.push(`/${slug}/sales/orders`)}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div> */}

      {customerModalOpen && (
        <CustomerLookupModal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          onSelect={handleCustomerSelect}
        />
      )}

      {/* Modal to Select Location */}
      {locationModalOpen && (
        <CustomerDeliveryLocationModal
          open={locationModalOpen}
          customerId={order.customer_id}
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
    </div>
  );
}

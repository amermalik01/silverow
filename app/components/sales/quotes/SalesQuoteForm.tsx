// app/components/sales/quotes/SalesQuoteForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

import {
  SalesQuote,
  SalesQuoteAddress,
  SalesQuoteLineUI,
  SalesQuoteMasterData,
} from "@/types/sales-quote";

import SalesQuoteLines from "./SalesQuoteLines";
import { OrderFormTabs } from "./OrderFormTabs";
import { Button } from "@/components/ui/button";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { GeneralConfirmModal } from "../../shared/modals/GeneralConfirmModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import {
  PurchaseOrderLookupItem,
  PurchaseOrderLookupModal,
} from "../../shared/modals/PurchaseOrderLookupModal";
import SalespersonLookupModal, {
  Employee,
} from "../../shared/modals/SalespersonLookupModal";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../orders/CustomerLookupModal";
import CustomerDeliveryLocationModal from "../orders/CustomerDeliveryLocationModal";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

type TabType = "general" | "invoicing" | "shipping"; //  | "margin" | "attachments"

type CustomerSelectionSource = "general" | "invoicing" | "shipping_agent";

export const SalesQuoteForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { show, hide } = useLoader();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [customerSelectionSource, setCustomerSelectionSource] =
    useState<CustomerSelectionSource>("general");
  const [showCustomerChangeModal, setShowCustomerChangeModal] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [SalesPersonModalOpen, setSalesPersonModalOpen] = useState(false);

  const [POModalOpen, setPOModalOpen] = useState(false);
  const [SOModalOpen, setSOModalOpen] = useState(false);

  // Manage view/edit state locally
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Add states for modal control
  const [showShipModal, setShowShipModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

  const [masterData, setMasterData] = useState<SalesQuoteMasterData | null>(
    null,
  );

  const isUpdateMode = Boolean(id);
  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  // const isUpdateMode = !!id;

  const [quote, setQuote] = useState<Partial<SalesQuote>>({
    quote_no: id ? "" : "",
    customer_id: "",
    customer_no: "",
    customer_name: "",

    bill_to_customer_id: "",
    bill_to_customer_no: "",
    bill_to_customer_name: "",

    order_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
    dispatch_date: new Date().toISOString().split("T")[0],
    requested_delivery_date: new Date().toISOString().split("T")[0],
    delivery_date: new Date().toISOString().split("T")[0],

    status: "draft",
    subtotal: 0,
    vat_amount: 0,
    total_amount: 0,
    // invoiced_amount: 0,

    reference: "",
    notes: "",
    email: "",
    salesperson: "",
    // cust_order_no: "",
    // link_to_po: "",
    // sq_no: "",
    source_of_quote: "Others",

    currency_code: baseCurrencyCode,
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<SalesQuoteAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<SalesQuoteAddress>
  >({ address_type: "billing" });

  const [shippingAddress, setShippingAddress] = useState<
    Partial<SalesQuoteAddress>
  >({ address_type: "shipping" });

  const [lines, setLines] = useState<SalesQuoteLineUI[]>([]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  const isCompleted =
    quote.status === "expired" || quote.status === "converted";
  const isFormDisabled = !isEditMode || isCompleted;

  // Check if all line items with quantity > 0 have been shipped
  // const isFullyDispatched = useMemo(() => {
  //   if (lines.length === 0) return false;
  //   const itemLines = lines.filter((l) => (l.line_type || "ITEM") === "ITEM");
  //   if (itemLines.length === 0) return false;

  //   return itemLines.every((l) => {
  //     const qty = Number(l.quantity || 0);
  //     const shipped = Number(l.quantity_shipped || 0);
  //     return qty > 0 && shipped >= qty;
  //   });
  // }, [lines]);

  useEffect(() => {
    if (!id) return;

    show("Fetching Record...");

    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hide();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          setQuote(actualData.order || {});
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
        console.error("Error hydrating historical sales quote matrix:", err),
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
    if (!quote.id) return;

    const response = await fetch(`/api/sales/sales-orders/${quote.id}/lines`);

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
    const originalAmount = lines.reduce(
      (sum, l) =>
        sum + Number(Number(l.quantity || 0) * Number(l.unit_price || 0) || 0),
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

  const hasSelectedLineItem = useMemo(() => {
    return lines.some((line) => {
      return !!line.item_id || !!line.gl_account_id;
    });
  }, [lines]);

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
    // Remove all existing PO lines.
    setLines([]);
    // setLines([createEmptyPurchaseOrderLine()]);

    // Close confirmation modal.
    setShowCustomerChangeModal(false);

    // Now allow Customer selection.
    setCustomerModalOpen(true);
    toast.info(
      "Sales Quote lines have been cleared. Please select a customer.",
    );
  };

  const handleCancelCustomerChange = () => {
    setShowCustomerChangeModal(false);
  };

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    if (customerSelectionSource === "invoicing") {
      // --------------------------------------------
      // INVOICING TAB
      // Only update Pay To Customer + Billing Address
      // --------------------------------------------
      setQuote((prev) => ({
        ...prev,
        bill_to_customer_id: customer.id,
        bill_to_customer_no: customer.customer_code,
        bill_to_customer_name: customer.name,
      }));

      if (customer.billing_address) setBillingAddress(customer.billing_address);

      setCustomerModalOpen(false);
      return;
    }

    // Shipping Agent
    if (customerSelectionSource === "shipping_agent") {
      setQuote((prev) => ({
        ...prev,
        shipping_agent: `${customer.customer_code} - ${customer.name}`,
      }));

      setCustomerModalOpen(false);
      return;
    }

    // --------------------------------------------
    // GENERAL TAB
    // Full customer selection
    // --------------------------------------------

    setQuote((prev) => ({
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
      salesperson_code: customer.salesperson_code || "",

      contact_person: customer.finance_contact_person || "",
      // email: customer.email || "",
      phone: customer.phone || "",

      payable_bank: customer.payable_bank || "",
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

  const handlePurchaseOrderSelection = () => {
    setPOModalOpen(true);
  };

  const handleSelectPurchaseOrders = (
    selectedOrders: PurchaseOrderLookupItem[],
  ) => {
    const codes = selectedOrders.map((o) => o.order_no).join(", ");
    setQuote((prev) => ({
      ...prev,
      linked_po: codes,
    }));
    setPOModalOpen(false);
  };

  const handleSalesPersonSelection = () => {
    setSalesPersonModalOpen(true);
  };

  const handleSalesPersonSelect = (emp: Employee) => {
    setQuote((prev) => ({
      ...prev,
      salesperson: emp.employee_code + "-" + emp.display_name,
    }));
    setSalesPersonModalOpen(false);
  };

  const updateOrderField = <K extends keyof SalesQuote>(
    field: K,
    value: SalesQuote[K],
  ) => {
    setQuote((prev) => ({ ...prev, [field]: value }));
  };

  const validateDates = (): string[] => {
    const errors: string[] = [];

    const orderDate = quote.order_date
      ? new Date(quote.order_date).getTime()
      : null;

    const dispatchDate = quote.dispatch_date
      ? new Date(quote.dispatch_date).getTime()
      : null;

    const deliveryDate = quote.delivery_date
      ? new Date(quote.delivery_date).getTime()
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
    if (!quote.customer_id) errors.push("Customer selection is required.");

    if (
      !quote.customer_posting_group_id &&
      !quote.vat_business_posting_group_id
    ) {
      errors.push(
        "Selected customer does not have a valid Customer/VAT Posting Group assigned.",
      );
    }

    if (!quote.order_date) errors.push("Quote Date field is mandatory.");

    if (!currencyConfig.currency_id)
      errors.push("Transactional currency is required.");
    if (lines.length === 0)
      errors.push("Sales Quote require at least one line item.");

    errors.push(...validateDates());

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please resolve validation errors before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    show("Saving Record...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        quote: {
          ...quote,
          ...currencyConfig,
          subtotal: financials.amount,
          vat_amount: financials.vat,
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

      toast.success(id ? "Sales Quote Updated" : "Sales Quote Created");
      const targetId = id || result?.data?.id;

      if (targetId) {
        const linesRes = await fetch(
          `/api/sales/sales-orders/${targetId}/lines`,
        );
        const linesData = await linesRes.json();
        if (linesData.lines) setLines(linesData.lines);
      }

      if (id) {
        setIsEditMode(false);
        router.refresh();
      } else if (result?.data?.id) {
        router.replace(`/${slug}/sales/sales-orders/${result.data.id}/edit`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  const handleStageClick = async (targetStage: {
    id: string;
    name: string;
  }) => {
    if (!id || isUpdatingStatus || quote.stage_id === targetStage.id) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-orders/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStage.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update stage");

      setQuote((prev) => ({ ...prev, stage_id: targetStage.id }));
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

  // 2. Separate Handler for Posting Invoice
  const handlePostInvoice = async () => {
    if (!id) return;
    setIsPosting(true);

    show("Posting Sales Invoice...");

    try {
      toast.loading("Posting sales invoice ...", {
        id: "action-toast",
      });

      const res = await fetch(`/api/sales/sales-orders/${id}/post-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_po_no: quote.reference,
          posting_date: quote.posting_date,
          order_date: quote.order_date,
          financials: financials,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to post sales invoice");

      toast.success("Sales invoice posted!", { id: "action-toast" });
      setShowInvoiceModal(false);

      router.push(`/${slug}/sales/orders/new`);
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
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Sales Quote",
            href: `/${slug}/sales/sales-orders`,
          },
          { label: quote.quote_no || "" },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">Sales Quote</h1>
        {quote.quote_no && (
          <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 rounded text-xs font-mono">
            {`Order No. ${quote.quote_no}`}
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
            This Sales Quote is <strong>Completed / Fully Posted</strong> and
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
                // "margin",
                // "attachments",
              ] as TabType[]
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
        </div>

        <OrderFormTabs
          activeTab={activeTab}
          quote={quote}
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
          onGeneralCustomerSelect={handleGeneralCustomerSelection}
          onInvoicingCustomerSelect={handleInvoicingCustomerSelection}
          setLocationModalOpen={setLocationModalOpen}
          onPurchaseOrderSelect={handlePurchaseOrderSelection}
          onShippingAgentSelect={handleShippingAgentSelection}
          setSalesPersonModalOpen={handleSalesPersonSelection}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <SalesQuoteLines
          lines={lines}
          setLines={setLines}
          isReadonly={isFormDisabled}
          salesQuote={quote}
          refreshLines={refreshLines}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isReadOnly}
                className={`${inputStyle} font-mono`}
                value={quote.internal_notes || ""}
                onChange={(e) =>
                  updateOrderField("internal_notes", e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                disabled={isReadOnly}
                className="w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-slate-100 dark:bg-slate-800/80  outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200"
                value={quote.notes || ""}
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

          <div className="flex items-center gap-2">
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

      <GeneralConfirmModal
        isOpen={showInvoiceModal}
        title="Confirmation"
        message="Are you sure you want to post the invoice for this sales quote?"
        onConfirm={handlePostInvoice}
        onCancel={() => setShowInvoiceModal(false)}
        loading={isPosting}
      />

      <GeneralConfirmModal
        isOpen={showCustomerChangeModal}
        title="Change Customer"
        message="This sales quote contains line items. All line items must be deleted before the customer can be changed. Do you want to delete the existing line items and continue?"
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
          customerId={quote.customer_id}
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
};

{
  /* {isUpdateMode && (
              <>
                <Button
                  type="button"
                  variant="post"
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={isPosting || isCompleted}
                >
                  Post Invoice
                </Button>

                <Button
                  type="button"
                  variant="dispatch"
                  onClick={() => setShowShipModal(true)}
                  disabled={isPosting || isFullyDispatched || isCompleted}
                >
                  Ship Items
                </Button>
              </>
            )} */
}
{
  /* {isUpdateMode &&
            !isLoadingStages &&
            stages.length > 0 &&
            (() => {
              const currentStageIndex = stages.findIndex(
                (s) => s.id === quote.stage_id,
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
            })()} */
}

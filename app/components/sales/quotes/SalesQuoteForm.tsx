// app/components/sales/quotes/SalesQuoteForm.tsx

"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

import { SalesQuote } from "@/types/sales-quote";

import SalesQuoteLines from "./SalesQuoteLines";
import { OrderFormTabs } from "./OrderFormTabs";
import { Button } from "@/components/ui/button";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { GeneralConfirmModal } from "../../shared/modals/GeneralConfirmModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { PurchaseOrderLookupItem } from "../../shared/modals/PurchaseOrderLookupModal";
import SalespersonLookupModal, {
  Employee,
} from "../../shared/modals/SalespersonLookupModal";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../orders/CustomerLookupModal";
import CustomerDeliveryLocationModal from "../orders/CustomerDeliveryLocationModal";

import { validateSalesQuote } from "./utils/salesQuote.validation";

import { calculateSalesQuoteFinancials } from "./utils/salesQuote.calculations";

import { useSalesQuoteState, TabType } from "./hooks/useSalesQuoteState";
import { useSalesQuoteData } from "./hooks/useSalesQuoteData";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

export const SalesQuoteForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { show, hide } = useLoader();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [converting, setConverting] = React.useState(false);
  const [showConvertModal, setShowConvertModal] = React.useState(false);

  const {
    activeTab,
    setActiveTab,
    saving,
    setSaving,
    validationErrors,
    setValidationErrors,
    customerSelectionSource,
    setCustomerSelectionSource,
    showCustomerChangeModal,
    setShowCustomerChangeModal,
    customerModalOpen,
    setCustomerModalOpen,
    locationModalOpen,
    setLocationModalOpen,
    SalesPersonModalOpen,
    setSalesPersonModalOpen,
    POModalOpen,
    setPOModalOpen,
    isEditMode,
    setIsEditMode,
    masterData,
    setMasterData,
    quote,
    setQuote,
    primaryAddress,
    setPrimaryAddress,
    billingAddress,
    setBillingAddress,
    shippingAddress,
    setShippingAddress,
    lines,
    setLines,
    currencyConfig,
    setCurrencyConfig,
  } = useSalesQuoteState({ id, isReadOnly, baseCurrencyCode });

  const isUpdateMode = !!id;

  const { refreshLines } = useSalesQuoteData({
    id,
    showLoader: show,
    hideLoader: hide,
    setQuote,
    setLines,
    setPrimaryAddress,
    setBillingAddress,
    setShippingAddress,
    setCurrencyConfig,
    setMasterData,
  });

  const isCompleted =
    quote.status === "expired" || quote.status === "converted";
  const isFormDisabled = !isEditMode || isCompleted;

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  const financials = useMemo(() => {
    return calculateSalesQuoteFinancials(lines, currencyConfig.exchange_rate);
  }, [lines, currencyConfig.exchange_rate]);

  const hasSelectedLineItem = useMemo(() => {
    return lines.some((line) => !!line.item_id || !!line.gl_account_id);
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
    setLines([]);
    setShowCustomerChangeModal(false);
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

    if (customerSelectionSource === "shipping_agent") {
      setQuote((prev) => ({
        ...prev,
        shipping_agent: `${customer.customer_code} - ${customer.name}`,
      }));
      setCustomerModalOpen(false);
      return;
    }

    const customerPostingGroup = customer.posting_group?.trim();

    if (!customerPostingGroup) {
      const errorMessage = `Posting group does not exist for customer "${customer.name}". Please assign a posting group to the customer.`;

      setValidationErrors([errorMessage]);
      toast.error(errorMessage);

      return;
    }

    // Find customer's payment terms in master data
    const selectedPaymentTerm = masterData?.paymentTerms.find(
      (term) => String(term.id) === String(customer.payment_terms),
    );

    const calculateDueDate = (orderDate: string, days = 0) => {
      if (!orderDate) return "";

      const date = new Date(orderDate);
      date.setDate(date.getDate() + Number(days));

      return date.toISOString().split("T")[0];
    };

    // Calculate due date based on order date + payment term days
    const calculatedDueDate =
      quote.order_date && selectedPaymentTerm
        ? calculateDueDate(quote.order_date, selectedPaymentTerm.days)
        : quote.due_date;

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
      salesperson: customer.salesperson_code || "",
      contact_person: customer.finance_contact_person || "",
      phone: customer.phone || "",
      payable_bank: customer.payable_bank || "",
      payment_terms_id: customer.payment_terms || "",
      due_date: calculatedDueDate,
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

  const handleSalesPersonSelection = () => {
    setSalesPersonModalOpen(true);
  };

  const handleSalesPersonSelect = (emp: Employee) => {
    setQuote((prev) => ({
      ...prev,
      salesperson: `${emp.employee_code}-${emp.display_name}`,
    }));
    setSalesPersonModalOpen(false);
  };

  const updateOrderField = <K extends keyof SalesQuote>(
    field: K,
    value: SalesQuote[K],
  ) => {
    setQuote((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const errors = validateSalesQuote(quote, lines, currencyConfig.currency_id);
    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error("Please resolve validation errors before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    show("Saving Record...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const isNew = !id || id === "new";

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
        isNew ? "/api/sales/sales-quotes" : `/api/sales/sales-quotes/${id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.error || "Execution error writing back sales records.",
        );
      }

      toast.success(!isNew ? "Sales Quote Updated" : "Sales Quote Created");
      const targetId = !isNew ? id : result?.data?.id;

      if (targetId) {
        await refreshLines(targetId);
      }

      if (!isNew) {
        setIsEditMode(false);
        router.refresh();
      } else if (result?.data?.id) {
        router.replace(`/${slug}/sales/quotes/${result.data.id}/edit`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  /* const handleConvertToSalesOrder = async () => {
    // 1. Check if record exists in DB
    if (!id || id === "new") {
      toast.error("Please save the sales quote first before converting.");
      return;
    }

    // 2. Validate quote fields and lines
    const errors = validateSalesQuote(quote, lines, currencyConfig.currency_id);
    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error("Please resolve validation errors before converting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    show("Converting to Sales Order...");

    try {
      setConverting(true);
      setValidationErrors([]);

      const res = await fetch(`/api/sales/sales-quotes/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Failed to convert quote to sales order.",
        );
      }

      toast.success(
        result.message || "Quote successfully converted to Sales Order!",
      );

      // Redirect to the newly created Sales Order edit/view screen or order list
      const createdOrderId = result.data?.id;
      if (createdOrderId) {
        router.push(`/${slug}/sales/orders/${createdOrderId}/edit`);
      } else {
        router.push(`/${slug}/sales/orders`);
      }
    } catch (err) {
      console.error("Conversion Error:", err);
      if (err instanceof Error) {
        setValidationErrors([err.message]);
        toast.error(err.message);
      }
    } finally {
      setConverting(false);
      hide();
    }
  }; */

  // 1. Validates requirements and triggers confirmation modal
  const handleInitiateConversion = () => {
    if (!id || id === "new") {
      toast.error("Please save the sales quote first before converting.");
      return;
    }

    const errors = validateSalesQuote(quote, lines, currencyConfig.currency_id);
    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error("Please resolve validation errors before converting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowConvertModal(true);
  };

  // 2. Executes API request after user confirmation
  const handleConfirmConversion = async () => {
    setShowConvertModal(false);
    show("Converting to Sales Order...");

    try {
      setConverting(true);
      setValidationErrors([]);

      const res = await fetch(`/api/sales/sales-quotes/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Failed to convert quote to sales order.",
        );
      }

      toast.success(
        result.message || "Quote successfully converted to Sales Order!",
      );

      const createdOrderId = result.data?.id;
      if (createdOrderId) {
        router.push(`/${slug}/sales/orders/${createdOrderId}/edit`);
      } else {
        router.push(`/${slug}/sales/orders`);
      }
    } catch (err) {
      console.error("Conversion Error:", err);
      if (err instanceof Error) {
        setValidationErrors([err.message]);
        toast.error(err.message);
      }
    } finally {
      setConverting(false);
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
      <Breadcrumbs
        items={[
          {
            label: "Sales Quote",
            href: `/${slug}/sales/quotes`,
          },
          { label: quote.quote_no || "" },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">Sales Quote</h1>
        {quote.quote_no && (
          // <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 rounded text-xs font-mono">
          <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
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
          refreshLines={() => refreshLines(quote.id)}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
                className="w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-slate-100 dark:bg-slate-800/80 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200"
                value={quote.notes || ""}
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
                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) || 1}
                  allowDecimals={true}
                  decimalScale={6}
                  disabled={isFormDisabled}
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  onChange={(val) =>
                    setCurrencyConfig({
                      ...currencyConfig,
                      exchange_rate: Number(val) || 1,
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
            <div className="flex justify-between pt-1 text-slate-900 dark:text-white">
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
                {/* Convert to Sales Order Button */}
                {id && (
                  <Button
                    type="button"
                    onClick={handleInitiateConversion}
                    disabled={saving || converting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Icon icon="tabler:transform" className="w-4 h-4" />
                    {converting ? "Converting..." : "Convert to Sales Order"}
                  </Button>
                )}
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
                    disabled={saving || converting}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )}
              </>
            )}

            <Button
              type="button"
              onClick={() => router.push(`/${slug}/sales/quotes`)}
              variant="cancel"
              disabled={converting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <GeneralConfirmModal
        isOpen={showCustomerChangeModal}
        title="Change Customer"
        message="This sales quote contains line items. All line items must be deleted before the customer can be changed. Do you want to delete the existing line items and continue?"
        onConfirm={handleConfirmCustomerChange}
        onCancel={handleCancelCustomerChange}
        loading={false}
      />

      <GeneralConfirmModal
        isOpen={showConvertModal}
        title="Convert to Sales Order"
        message="Are you sure you want to convert this Sales Quote into an active Sales Order? This action will update the quote status and create a new Sales Order."
        onConfirm={handleConfirmConversion}
        onCancel={() => setShowConvertModal(false)}
        loading={converting}
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

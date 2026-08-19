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
} from "@/types/sales-return";

import SalesReturnLines from "./SalesReturnLines";
import { useLoader } from "@/app/context/LoaderContext";
import { OrderFormTabs } from "./OrderFormTabs";
import CustomerDeliveryLocationModal from "../orders/CustomerDeliveryLocationModal";
import { Button } from "@/components/ui/button";

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
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("general");

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

    const rate =
      Number(currencyConfig.exchange_rate) > 0
        ? Number(currencyConfig.exchange_rate)
        : 1;

    // const amountInclVatLCY = amountInclVat / rate;
    const amountInclVatLCY = Number(amountInclVat) * rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setReturnOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_no: customer.customer_code,
      customer_name: customer.name,
      email: customer.email || prev.email,
      // Customer Settings & Financial defaults
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
  const inputDateStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700  rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";

  const labelStyle =
    "block text-xs  text-slate-500 dark:text-slate-400 mb-0.5  col-span-4";

  return (
    <div className="space-y-4">
      {/*  container mx-auto p-1 text-black dark:text-white */}
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

      <div className=" bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200  pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar ">
            {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
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
                    returnOrder.status?.toLowerCase() ===
                    stage.name.toLowerCase();

                  let activeBg = "bg-blue-600 text-white";
                  if (index === 1) activeBg = "bg-amber-500 text-white";
                  if (index === 2) activeBg = "bg-indigo-600 text-white";
                  if (index >= 3) activeBg = "bg-emerald-600 text-white";

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => handleStageClick(stage.name)}
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
          order={returnOrder}
          primaryAddress={primaryAddress}
          setPrimaryAddress={setPrimaryAddress}
          billingAddress={billingAddress}
          setBillingAddress={setBillingAddress}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          currencyConfig={currencyConfig}
          setCurrencyConfig={setCurrencyConfig}
          masterData={masterData}
          updateField={updateReturnField}
          setCustomerModalOpen={setCustomerModalOpen}
          setLocationModalOpen={setLocationModalOpen}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
        />
      </div>
      <SalesReturnLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />

      <div className="  bg-white  border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 pl-4 pr-4">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                className={`${inputStyle} font-mono`}
                value={returnOrder.internal_notes || ""}
                onChange={(e) =>
                  updateReturnField("internal_notes", e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                className={`${inputStyle} font-mono`}
                value={returnOrder.notes || ""}
                onChange={(e) => updateReturnField("notes", e.target.value)}
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
                  // step="any"
                  step="0.01"
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

        <div className="flex items-center justify-between pt-4 bg-slate-50 dark:bg-slate-900/60 pl-4 pr-4 pb-4 rounded-lg">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{" "}
              Partial Allocated Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
              Allocated Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
              Received Stock
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Edit / Save
            </Button>

            <Button
              type="button"
              onClick={() => router.push(`/${slug}/sales/orders`)}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />

      {/* Modal to Select Location */}
      <CustomerDeliveryLocationModal
        open={locationModalOpen}
        customerId={returnOrder.customer_id}
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
}

{
  /* <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <Button
          type="button"
          onClick={() => router.push(`/${slug}/sales/returns`)}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel and Return
        </Button>

        <div className="flex gap-3">
          {id &&
            returnOrder.credit_status !== "CREDITED" &&
            returnOrder.status !== "CANCELLED" && (
              <Button
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
              </Button>
            )}

          <Button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-medium transition shadow disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save Return Order"}
          </Button>
        </div>
      </div> */
}

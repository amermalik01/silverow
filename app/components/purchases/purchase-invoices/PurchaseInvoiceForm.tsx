// app/components/purchases/purchase-invoices/PurchaseInvoiceForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useLoader } from "@/app/context/LoaderContext";

import {
  PurchaseOrder as PurchaseInvoice,
  PurchaseOrderAddress,
  PurchaseOrderLine,
  PurchaseOrderMasterData,
} from "@/types/purchase-order";

import PurchaseOrderLines from "../purchase-orders/PurchaseOrderLines";
import { OrderFormTabs } from "../purchase-orders/OrderFormTabs";
// import { PostedTransactionsModal } from "./PostedTransactionsModal";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { PostedTransactionsModal } from "../../finance/posted-entries/PostedTransactionsModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { PdfPreviewModal } from "@/components/ui/PdfPreviewModal";

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

type TabType = "general" | "invoicing" | "shipping";

export const PurchaseInvoiceForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = true,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [showNavigateModal, setShowNavigateModal] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<PurchaseOrderMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const [invoice, setInvoice] = useState<Partial<PurchaseInvoice>>({
    order_no: "",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",
    order_date: "",
    expected_date: "",
    invoice_date: "",
    receipt_date: "",
    due_date: "",
    status: "posted",
    reference: "",
    notes: "",
    purchase_posting_group_id: "",
    vat_business_posting_group_id: "",
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
  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  // Fetch Existing Purchase Invoice Data
  useEffect(() => {
    if (!id) return;

    show("Fetching Invoice Record...");
    fetch(`/api/purchase-invoices/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hide();
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;
          setInvoice(actualData.invoice || {});
          setLines(actualData.lines || []);

          if (actualData.primary_address)
            setPrimaryAddress(actualData.primary_address);
          if (actualData.billing_address)
            setBillingAddress(actualData.billing_address);
          if (actualData.shipping_address)
            setShippingAddress(actualData.shipping_address);

          setCurrencyConfig({
            currency_id: actualData.invoice?.currency_id || "",
            exchange_rate: actualData.invoice?.exchange_rate || 1,
          });
        }
      })
      .catch((err) => {
        hide();
        console.error("Error loading purchase invoice details:", err);
      });
  }, [id]);

  // Load Master Lookup Data
  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/purchase-orders/master-data");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMasterData(data);
      } catch (err) {
        console.error("Master data fetch error:", err);
      }
    }
    loadMasterData();
  }, []);

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ??
      null
    );
  }, [currencyConfig.currency_id, masterData]);

  const financials = useMemo(() => {
    const originalAmount = lines.reduce(
      (sum, l) =>
        sum + Number(Number(l.quantity || 0) * Number(l.unit_cost || 0) || 0),
      0,
    );
    // const originalAmount = lines.reduce(
    //   (sum, l) => sum + Number(l.original_amount || 0),
    //   0,
    // );
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
    // const amountInclVatLCY = amountInclVat / rate;
    const amountInclVatLCY = Number(amountInclVat) * rate;

    // return { amount, vat, amountInclVat, amountInclVatLCY };
    return {
      originalAmount,
      totalDiscount,
      amount,
      vat,
      amountInclVat,
      amountInclVatLCY,
    };
  }, [lines, currencyConfig.exchange_rate]);

  const noop = () => {};
  const asyncNoop = async () => {};

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs text-slate-500 dark:text-slate-400 mb-0.5 col-span-4";

  const isCompleted =
    invoice.status === "completed" || invoice.status === "POSTED";
  const isFormDisabled = isReadOnly || isCompleted;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Purchase Order",
            href: `/${slug}/purchases/purchase-orders`,
          },
          { label: invoice.invoice_no || invoice.order_no || "" },
        ]}
      />
      <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
        {/* <span className="flex items-center gap-2">
          <Icon icon="tabler:eye" className="w-4 h-4 text-blue-600" />
          Purchase Invoice Document Viewer — <strong>Read-Only Mode</strong>
        </span> */}
        {/* <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] capitalize font-bold tracking-wider">
          {invoice.status || "POSTED"}
        </span> */}

        <h1 className="text-2xl font-bold px-4">Purchase Invoice</h1>

        {invoice.purchase_order_no && (
          <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 transition-colors rounded">
            {`Invoice/Order No. ${invoice.invoice_no || ""}/${invoice.purchase_order_no || ""}`}
          </div>
        )}
      </div>

      {/* {isCompleted && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon icon="tabler:lock" className="w-4 h-4 text-emerald-600" />
            This Purchase Order is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] capitalize font-bold tracking-wider">
            Read Only
          </span>
        </div>
      )} */}

      {/* Header Tabs */}
      <div className=" bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200  pb-2 mb-4">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar ">
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

          {isUpdateMode &&
            !isLoadingStages &&
            stages.length > 0 &&
            (() => {
              // Find current stage index in the sorted stages array
              const currentStageIndex = stages.findIndex(
                (s) => s.id === invoice.stage_id,
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
                          "bg-blue-600 text-white hover:bg-blue-700";
                      }

                      return (
                        <button
                          type="button"
                          key={stage.id}
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
            })()}
        </div>

        {/* Read-Only Form Tabs */}
        <OrderFormTabs
          activeTab={activeTab}
          order={invoice}
          primaryAddress={primaryAddress}
          setPrimaryAddress={noop}
          billingAddress={billingAddress}
          setBillingAddress={noop}
          shippingAddress={shippingAddress}
          setShippingAddress={noop}
          currencyConfig={currencyConfig}
          setCurrencyConfig={noop}
          masterData={masterData}
          updateField={noop}
          // setSupplierModalOpen={noop}
          onGeneralSupplierSelect={noop}
          onInvoicingSupplierSelect={noop}
          setLocationModalOpen={noop}
          onPurchaseOrderSelect={noop}
          onSalesOrderSelect={noop}
          onCustomerSelect={noop}
          onShippingAgentSelect={noop}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          isReadOnly={true}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <PurchaseOrderLines
          lines={lines}
          setLines={noop}
          isReadonly={true}
          purchaseOrder={invoice}
          refreshLines={asyncNoop}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Internal Notes"
                disabled
                readOnly
                className={`${inputStyle} font-mono resize-none`}
                value={invoice.internal_notes || ""}
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="External Notes"
                disabled
                readOnly
                className={`${inputStyle} font-mono resize-none`}
                value={invoice.notes || ""}
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
                {/* <input
                  type="number"
                  disabled
                  readOnly
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  value={
                    Number(currencyConfig.exchange_rate).toFixed(2) ?? "1.00"
                  }
                /> */}

                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) ?? "1.00"}
                  allowDecimals={true}
                  decimalScale={2}
                  disabled
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  onChange={noop}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <span className="text-xs font-semibold text-slate-500">
                Amount Incl. VAT (LCY: {baseCurrencyCode})
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

          {/* <div className="space-y-1 text-right font-mono ml-auto w-full max-w-sm">
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
          </div> */}
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
          {/* Legend Indicators */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />{" "}
              {/* Partially Allocated */}Pending Allocation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
              Allocated Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
              Stock Received
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isUpdateMode && (
              <PdfPreviewModal
                buttonText="Print Purchase Invoice"
                pdfApiUrl={`/api/purchase-invoices/${id}/pdf`}
                fileName={`PI_${invoice.invoice_no}.pdf`}
              />
            )}
            {/* Navigate Button (Opens Legacy Modal) */}
            {isUpdateMode && (
              <Button
                type="button"
                onClick={() => setShowNavigateModal(true)}
                variant="add_line"
                // className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Navigate
              </Button>
            )}

            <Button
              type="button"
              onClick={() =>
                router.push(`/${slug}/purchases/purchase-invoices`)
              }
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* General Ledger Posted Transactions Modal */}
      {id && (
        <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          documentNo={invoice.invoice_no}
          documentTitle="Purchase Invoice"
          fetchEndpoint={`/api/purchase-invoices/${id}/posted-entries`}
        />
      )}
    </div>
  );
};
/* <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          invoiceId={id}
          invoiceNo={invoice.invoice_no}
        /> */

// app/components/sales/invoices/SalesInvoiceForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import { useLoader } from "@/app/context/LoaderContext";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLineUI,
  SalesOrderMasterData,
} from "@/types/sales-order";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import {
  validateSalesOrder,
  validateSalesOrderForStockAction,
} from "../orders/utils/salesOrder.validation";

import {
  calculateSalesOrderFinancials,
  isSalesOrderFullyDispatched,
} from "../orders/utils/salesOrder.calculations";

import { useSalesOrderState } from "../orders/hooks/useSalesOrderState";
import { useSalesOrderData } from "../orders/hooks/useSalesOrderData";

import SalesOrderLines from "../orders/SalesOrderLines";
import { OrderFormTabs } from "../orders/OrderFormTabs";

import { PdfPreviewModal } from "@/components/ui/PdfPreviewModal";
import { PostedTransactionsModal } from "../../finance/posted-entries/PostedTransactionsModal";

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

type FetchLinesAPIResponse = {
  lines?: SalesOrderLineUI[];
  success?: boolean;
  error?: string;
};

type TabType = "general" | "invoicing" | "shipping" | "margin" | "attachments";

type CustomerSelectionSource = "general" | "invoicing" | "shipping_agent";

export const SalesInvoiceForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { show, hide } = useLoader();
  isReadOnly = true;

  const noop = () => {};
  const asyncNoop = async () => {};

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [showNavigateModal, setShowNavigateModal] = useState(false);

  const state = useSalesOrderState({
    id,
    isReadOnly,
  });

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

    supplierModalOpen,
    setSupplierModalOpen,

    POModalOpen,
    setPOModalOpen,

    SOModalOpen,
    setSOModalOpen,

    SalespersonModalOpen,
    setSalespersonModalOpen,

    showMigrationModal,
    setShowMigrationModal,

    migrationSalesOrderId,
    setMigrationSalesOrderId,

    isEditMode,
    setIsEditMode,

    isUpdatingStatus,
    setIsUpdatingStatus,

    showDispatchModal,
    setShowDispatchModal,

    showInvoiceModal,
    setShowInvoiceModal,

    showDispatchAndPostModal,
    setShowDispatchAndPostModal,

    isPosting,
    setIsPosting,

    masterData,
    setMasterData,

    order,
    setOrder,

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
  } = state;

  const isUpdateMode = !!id;

  const stages = masterData?.stages ?? [];

  const isLoadingStages = !masterData;

  const isCompleted = order.status === "completed" || order.status === "POSTED";

  const isFormDisabled = !isEditMode || isCompleted;

  useSalesOrderData({
    id,

    setOrder,
    setLines,

    setPrimaryAddress,
    setBillingAddress,
    setShippingAddress,

    setCurrencyConfig,
    setMasterData,

    show,
    hide,
  });

  const isFullyDispatched = useMemo(
    () => isSalesOrderFullyDispatched(lines),
    [lines],
  );

  const selectedCurrency = useMemo(() => {
    return (
      masterData?.currencies.find(
        (currency) => currency.id === currencyConfig.currency_id,
      ) ?? null
    );
  }, [masterData, currencyConfig.currency_id]);

  const financials = useMemo(
    () =>
      calculateSalesOrderFinancials(
        lines,
        Number(currencyConfig.exchange_rate),
      ),
    [lines, currencyConfig.exchange_rate],
  );

  const hasSelectedLineItem = useMemo(
    () => lines.some((line) => !!line.item_id || !!line.gl_account_id),
    [lines],
  );

  useEffect(() => {
    if (!id) return;

    show("Fetching Record...");

    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        hide();
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
        console.error("Error hydrating historical sales Invoice matrix:", err),
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

  const updateOrderField = <K extends keyof SalesOrder>(
    field: K,
    value: SalesOrder[K],
  ) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (includeLines = true): boolean => {
    const errors = validateSalesOrder(
      order,
      lines,
      currencyConfig.currency_id,
      includeLines,
    );

    setValidationErrors(errors);

    return errors.length === 0;
  };

  const validateBeforeStockAction = (): boolean => {
    const errors = validateSalesOrderForStockAction(lines);

    setValidationErrors(errors);

    return errors.length === 0;
  };

  const refreshLines = async () => {
    if (!order.id) return;

    try {
      const response = await fetch(`/api/sales/sales-orders/${order.id}/lines`);

      if (!response.ok) {
        throw new Error(`Failed to fetch lines: ${response.statusText}`);
      }

      const data: FetchLinesAPIResponse = await response.json();

      setLines(data.lines ?? []);
    } catch (error) {
      console.error("Error refreshing sales Invoice lines:", error);
    }
  };

  const handleStageClick = async (targetStage: {
    id: string;
    name: string;
  }) => {
    if (!id || isUpdatingStatus || order.stage_id === targetStage.id) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/sales-orders/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: targetStage.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update stage");

      setOrder((prev) => ({ ...prev, stage_id: targetStage.id }));
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
            label: "Sales Invoice",
            href: `/${slug}/sales/invoices`,
          },
          {
            label: order.invoice_no || "",
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">Sales Invoice</h1>
        {order.invoice_no && (
          <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 rounded text-xs font-mono">
            {`Invoice No. ${order.invoice_no}`}
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
            This Sales Invoice is <strong>Completed / Fully Posted</strong> and
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
                "margin",
                "attachments",
              ] as TabType[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                // onClick={() => setActiveTab(tab)}
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
                (s) => s.id === order.stage_id,
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
            })()}
        </div>

        <OrderFormTabs
          activeTab={activeTab}
          order={order}
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
          onGeneralCustomerSelect={noop}
          onInvoicingCustomerSelect={noop}
          setLocationModalOpen={noop}
          onPurchaseOrderSelect={noop}
          onShippingAgentSelect={noop}
          setSalesPersonModalOpen={noop}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          inputDateStyle={inputDateStyle}
          isReadOnly={true}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <SalesOrderLines
          lines={lines}
          setLines={noop}
          isReadonly={true}
          salesOrder={order}
          refreshLines={asyncNoop}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled
                readOnly
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
                disabled
                readOnly
                className="w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-slate-100 dark:bg-slate-800/80  outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200"
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
                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) || 1}
                  allowDecimals={true}
                  decimalScale={6}
                  disabled
                  className={`${inputStyle} font-mono text-end`}
                  onChange={noop}
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
            {isUpdateMode && (
              <PdfPreviewModal
                buttonText="Print Sales Invoice"
                pdfApiUrl={`/api/sales-invoices/${id}/pdf`}
                fileName={`SI_${order.invoice_no}.pdf`}
              />
            )}

            {isUpdateMode && (
              <Button
                type="button"
                onClick={() => setShowNavigateModal(true)}
                variant="add_line"
              >
                Navigate
              </Button>
            )}

            <Button
              type="button"
              onClick={() => router.push(`/${slug}/sales/invoices`)}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {id && (
        <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          documentNo={order.invoice_no}
          documentTitle="Sales Invoice"
          fetchEndpoint={`/api/purchase-invoices/${id}/posted-entries`}
        />
      )}
    </div>
  );
};

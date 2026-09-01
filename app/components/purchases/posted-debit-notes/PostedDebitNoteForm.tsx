// app/components/purchases/posted-debit-notes/PostedDebitNoteForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import {
  DebitNote,
  DebitNoteAddress,
  DebitNoteLine,
  DebitNoteMasterData,
} from "@/types/debit-note";
import { useLoader } from "@/app/context/LoaderContext";

import { StockReceiveConfirmModal } from "../../shared/modals/StockReceiveConfirmModal";
import { Button } from "@/components/ui/button";
import DebitNoteLines from "../debit-notes/DebitNoteLines";
import { OrderFormTabs } from "../debit-notes/OrderFormTabs";
// import { PostedTransactionsModal } from "./PostedTransactionsModal";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { PostedTransactionsModal } from "../../finance/posted-entries/PostedTransactionsModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

type TabType = "general" | "invoicing" | "shipping";

export const PostedDebitNoteForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [showNavigateModal, setShowNavigateModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Manage view/edit state locally
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const [piModalOpen, setPiModalOpen] = useState(false);
  // Add states for modal control
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { show, hide } = useLoader();

  const noop = () => {};

  const [masterData, setMasterData] = useState<DebitNoteMasterData | null>(
    null,
  );

  const isLoadingStages = !masterData;
  const stages = masterData?.stages ?? [];

  const isUpdateMode = !!id;

  const [note, setNote] = useState<Partial<DebitNote>>({
    debit_note_no: id ? "" : "[Auto-Generated]",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",
    pay_to_supplier_id: "",
    pay_to_supplier_no: "",
    pay_to_supplier_name: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
    is_dispatched: false,
    is_posted: false,
  });

  const [primaryAddress, setPrimaryAddress] = useState<
    Partial<DebitNoteAddress>
  >({ address_type: "primary" });

  const [billingAddress, setBillingAddress] = useState<
    Partial<DebitNoteAddress>
  >({
    address_type: "billing",
  });
  const [shippingAddress, setShippingAddress] = useState<
    Partial<DebitNoteAddress>
  >({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<DebitNoteLine[]>([]);

  const isCompleted = note.status === "completed" || note.status === "POSTED";
  const isFormDisabled = !isEditMode || isCompleted;

  // Check if all line items with quantity > 0 have been received
  const isFullyDispatched = useMemo(() => {
    if (lines.length === 0) return false;
    const itemLines = lines.filter((l) => (l.line_type || "ITEM") === "ITEM");
    if (itemLines.length === 0) return false;

    return itemLines.every((l) => {
      const qty = Number(l.quantity || 0);
      const rcvd = Number(l.returned_quantity || 0);
      return qty > 0 && rcvd >= qty;
    });
  }, [lines]);

  const [currencyConfig, setCurrencyConfig] = useState({
    currency_id: "",
    exchange_rate: 1,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/debit-notes/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        if (payload && payload.success && payload.data) {
          const actualData = payload.data;

          console.log("API payload parsed successfully:", actualData);

          setNote(actualData.debitNote || actualData.note || {});
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
            currency_id:
              actualData.debitNote?.currency_id ||
              actualData.note?.currency_id ||
              "",
            exchange_rate:
              actualData.debitNote?.exchange_rate ||
              actualData.note?.exchange_rate ||
              1,
          });
        }
      })
      .catch((err) =>
        console.error(
          "Error hydrating historical debit document payload matrix:",
          err,
        ),
      );
  }, [id]);

  const refreshLines = async () => {
    if (!note.id) return;

    const response = await fetch(`/api/debit-notes/${note.id}/lines`);

    const data = await response.json();

    setLines(data.lines ?? []);
  };

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await fetch("/api/debit-notes/master-data");
        if (!res.ok) throw new Error();

        const data = await res.json();

        setMasterData(data);
      } catch (err) {
        console.error(err);
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

    return {
      originalAmount,
      totalDiscount,
      amount,
      vat,
      amountInclVat,
      amountInclVatLCY,
    };
  }, [lines, currencyConfig.exchange_rate]);

  const updateField = <K extends keyof DebitNote>(
    field: K,
    value: DebitNote[K],
  ) => {
    setNote((prev) => ({ ...prev, [field]: value }));
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
            label: "Posted Debit Notes",
            href: `/${slug}/purchases/posted-debit-notes`,
          },
          { label: note.debit_note_no || "" },
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">Debit Note</h1>
        <div className="bg-[#0b3310] text-white shadow-sm gap-1.5 px-2 py-0.5 transition-colors rounded">
          Debit Note No. {note.debit_note_no || ""}
        </div>
      </div>
      {/*  container mx-auto p-1 */}
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
            This Debit Note is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] capitalize font-bold tracking-wider">
            Read Only
          </span>
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

          {isUpdateMode &&
            !isLoadingStages &&
            stages.length > 0 &&
            (() => {
              // Find current stage index in the sorted stages array
              const currentStageIndex = stages.findIndex(
                (s) => s.id === note.stage_id,
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

          {/* {isUpdateMode && !isLoadingStages && stages.length > 0 && (
            <div className="flex justify-end ml-auto overflow-x-auto">
              <div
                className={`flex items-center justify-center sm:justify-start gap-1 text-xs font-bold text-slate-400 select-none pb-2 ${isUpdatingStatus ? "opacity-60 pointer-events-none" : ""}`}
              >
                {stages.map((stage, index) => {
                  const isLast = index === stages.length - 1;
                  const isActive =
                    note.status?.toLowerCase() === stage.name.toLowerCase();

                  let activeBg = "bg-blue-600 text-white";
                  if (index === 1) activeBg = "bg-amber-500 text-white";
                  if (index === 2) activeBg = "bg-indigo-600 text-white";
                  if (index >= 3) activeBg = "bg-emerald-600 text-white";

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      //   onClick={() => handleStageClick(stage.name)}
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
          )} */}
        </div>

        <OrderFormTabs
          activeTab={activeTab}
          note={note}
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
          // setSupplierModalOpen={setSupplierModalOpen}
          onGeneralSupplierSelect={noop}
          onInvoicingSupplierSelect={noop}
          setLocationModalOpen={noop}
          setPiModalOpen={noop}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          isReadOnly={isFormDisabled}
        />
      </div>

      <DebitNoteLines
        lines={lines}
        setLines={setLines}
        isReadonly={isFormDisabled}
        debitNote={note}
        refreshLines={refreshLines}
      />

      <div className="  bg-white  border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end border-b border-slate-200 mb-2 pb-2 pt-4 px-2">
          <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
            <div>
              <textarea
                placeholder="Add Internal Notes"
                disabled={isFormDisabled}
                className={`${inputStyle} font-mono`}
                value={note.internal_notes || ""}
                onChange={(e) => updateField("internal_notes", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Add External Notes"
                disabled={isFormDisabled}
                className={`${inputStyle} font-mono`}
                value={note.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
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
                {/* <input
                  type="number"
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
                /> */}

                <NumericTextInput
                  value={Number(currencyConfig.exchange_rate) ?? ""}
                  allowDecimals={true}
                  decimalScale={2}
                  disabled={isFormDisabled}
                  className={`${inputStyle} font-mono max-w-[100px] text-end`}
                  onChange={noop}
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
            <div className="flex justify-between  pt-1 text-slate-900 dark:text-white">
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

        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
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
              <Button
                type="button"
                onClick={() => setShowNavigateModal(true)}
                // className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                variant="add_line"
              >
                Navigate
              </Button>
            )}
            <Button
              type="button"
              onClick={() =>
                router.push(`/${slug}/purchases/posted-debit-notes`)
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
          documentNo={note.debit_note_no}
          documentTitle="Debit Note"
          fetchEndpoint={`/api/posted-debit-notes/${id}/posted-entries`}
        />
      )}
    </div>
  );
};
{
  /* <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          debitNoteId={id}
          debitNoteNo={note.debit_note_no}
        /> */
}

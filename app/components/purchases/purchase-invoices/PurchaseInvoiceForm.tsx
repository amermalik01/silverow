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
import { PostedTransactionsModal } from "./PostedTransactionsModal";

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

  const isUpdateMode = !!id;

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
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;
    const rate =
      Number(currencyConfig.exchange_rate) > 0
        ? Number(currencyConfig.exchange_rate)
        : 1;
    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
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
    <div className="space-y-4 w-full max-w-[100vw] px-4 py-2 mx-auto overflow-x-auto">
      <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon icon="tabler:eye" className="w-4 h-4 text-blue-600" />
          Purchase Invoice Document Viewer — <strong>Read-Only Mode</strong>
        </span>
        <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] uppercase font-bold tracking-wider">
          {invoice.status || "POSTED"}
        </span>
      </div>

      {/* {isCompleted && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon icon="tabler:lock" className="w-4 h-4 text-emerald-600" />
            This Purchase Order is <strong>Completed / Fully Posted</strong> and
            cannot be edited.
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded text-[10px] uppercase font-bold tracking-wider">
            Read Only
          </span>
        </div>
      )} */}

      {/* Header Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
          {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
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
        setSupplierModalOpen={noop}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
        isReadOnly={true}
      />

      {/* Read-Only Purchase Lines */}
      <PurchaseOrderLines
        lines={lines}
        setLines={noop}
        isReadonly={true}
        purchaseOrder={invoice}
        refreshLines={asyncNoop}
      />

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
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
              <input
                type="number"
                disabled
                readOnly
                className={`${inputStyle} font-mono max-w-[100px] text-end`}
                value={
                  Number(currencyConfig.exchange_rate).toFixed(2) ?? "1.00"
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

      {/* Bottom Action Bar matching Legacy Screenshot buttons */}
      <div className="flex items-center justify-end pt-4 gap-2">
        {/* Navigate Button (Opens Legacy Modal) */}
        {isUpdateMode && (
          <button
            type="button"
            onClick={() => setShowNavigateModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Navigate
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push(`/${slug}/purchases/purchase-invoices`)}
          className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>

      {/* General Ledger Posted Transactions Modal */}
      {id && (
        <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          invoiceId={id}
          invoiceNo={invoice.order_no}
        />
      )}
    </div>
  );
};

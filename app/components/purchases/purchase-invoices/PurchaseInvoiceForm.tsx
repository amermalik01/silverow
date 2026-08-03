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
import SupplierLookupModal, { SupplierLookupItem } from "../purchase-orders/SupplierLookupModal";

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
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [showNavigateModal, setShowNavigateModal] = useState(false);

  const { show, hide } = useLoader();

  const [masterData, setMasterData] = useState<PurchaseOrderMasterData | null>(null);

  const isUpdateMode = !!id;

  const [invoice, setInvoice] = useState<Partial<PurchaseInvoice>>({
    order_no: id ? "" : "[Auto-Generated]",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    invoice_date: new Date().toISOString().split("T")[0],
    receipt_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
  });

  const [primaryAddress, setPrimaryAddress] = useState<Partial<PurchaseOrderAddress>>({ address_type: "primary" });
  const [billingAddress, setBillingAddress] = useState<Partial<PurchaseOrderAddress>>({ address_type: "billing" });
  const [shippingAddress, setShippingAddress] = useState<Partial<PurchaseOrderAddress>>({ address_type: "shipping" });

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

          if (actualData.primary_address) setPrimaryAddress(actualData.primary_address);
          if (actualData.billing_address) setBillingAddress(actualData.billing_address);
          if (actualData.shipping_address) setShippingAddress(actualData.shipping_address);

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

  const refreshLines = async () => {
    if (!invoice.id) return;
    const response = await fetch(`/api/purchase-invoices/${invoice.id}/lines`);
    const data = await response.json();
    setLines(data.lines ?? []);
  };

  const selectedCurrency = useMemo(() => {
    return masterData?.currencies.find((c) => c.id === currencyConfig.currency_id) ?? null;
  }, [currencyConfig.currency_id, masterData]);

  const financials = useMemo(() => {
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;
    const rate = Number(currencyConfig.exchange_rate) > 0 ? Number(currencyConfig.exchange_rate) : 1;
    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  /* const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setInvoice((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,
      purchaser_code: supplier.purchaser_code || "",
      payable_bank: supplier.payable_bank || "",
      payment_terms_id: supplier.payment_terms || "",
      payment_method_id: supplier.payment_method || "",
    }));

    if (supplier.primary_address) setPrimaryAddress(supplier.primary_address);
    if (supplier.billing_address) setBillingAddress(supplier.billing_address);
    if (supplier.shipping_address) setShippingAddress(supplier.shipping_address);

    if (supplier.currency_id) {
      const matchedCurr = masterData?.currencies.find((c) => c.id === supplier.currency_id);
      setCurrencyConfig({
        currency_id: supplier.currency_id,
        exchange_rate: matchedCurr?.exchange_rate || 1,
      });
    }

    setSupplierModalOpen(false);
  }; */

  const updateField = <K extends keyof PurchaseInvoice>(
    field: K,
    value: PurchaseInvoice[K]
  ) => {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!invoice.supplier_id) errors.push("Supplier selection is required.");
    if (lines.length === 0) errors.push("Purchase invoice requires at least one line item.");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix layout validation errors before saving.");
      return;
    }

    show("Saving Invoice...");

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        invoice: {
          ...invoice,
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
        id ? `/api/purchase-invoices/${id}` : "/api/purchase-invoices",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Execution error saving invoice.");

      toast.success("Purchase Invoice Updated cleanly");
      router.push(`/${slug}/purchases/purchase-invoices`);
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
      hide();
    }
  };

  const inputStyle =
    "w-full border col-span-8 border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs text-slate-500 dark:text-slate-400 mb-0.5 col-span-4";

  return (
    <div className="space-y-4 w-full max-w-[100vw] px-4 py-2 mx-auto overflow-x-auto">
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

      {/* Tabs Form Layout */}
      <OrderFormTabs
        activeTab={activeTab}
        order={invoice}
        primaryAddress={primaryAddress}
        setPrimaryAddress={setPrimaryAddress}
        billingAddress={billingAddress}
        setBillingAddress={setBillingAddress}
        shippingAddress={shippingAddress}
        setShippingAddress={setShippingAddress}
        currencyConfig={currencyConfig}
        setCurrencyConfig={setCurrencyConfig}
        masterData={masterData}
        updateField={updateField}
        setSupplierModalOpen={setSupplierModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />

      {/* Shared Purchase Lines */}
      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadOnly}
        purchaseOrder={invoice}
        refreshLines={refreshLines}
      />

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="space-x-1 col-span-2 grid grid-cols-3 items-start">
          <div>
            <textarea
              placeholder="Add Internal Notes"
              className={`${inputStyle} font-mono`}
              value={invoice.internal_notes || ""}
              onChange={(e) => updateField("internal_notes", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <textarea
              placeholder="Add External Notes"
              className={`${inputStyle} font-mono`}
              value={invoice.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
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
                step="any"
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

        {/* <button
          type="button"
          onClick={handleSave}
          disabled={saving || isReadOnly}
          className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || isReadOnly}
          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
        >
          Purchase Invoice
        </button> */}

        <button
          type="button"
          onClick={() => router.push(`/${slug}/purchases/purchase-invoices`)}
          className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>

      {/* Supplier Lookup Modal */}
      {/* <SupplierLookupModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      /> */}

      {/* Posted Transactions Navigation Modal */}
      <PostedTransactionsModal
        isOpen={showNavigateModal}
        onClose={() => setShowNavigateModal(false)}
        invoiceId={id}
        invoiceNo={invoice.order_no}
      />
    </div>
  );
};

// app/components/purchases/debit-notes/DebitNoteForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { DebitNote, DebitNoteAddress, DebitNoteLine } from "@/types/debit-note";

import DebitNoteLines from "./DebitNoteLines";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "../../shared/modals/SupplierLookupModal";

import { DebitNotePayloadInput } from "@/lib/validations/debit-note.schema";
import { OrderFormTabs } from "./OrderFormTabs";

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

interface NoteStage {
  id: string;
  name: string;
  rank: number;
}

type TabType = "general" | "invoicing" | "shipping";

export const DebitNoteForm: React.FC<Props> = ({
  slug,
  id,
  isReadOnly = false,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [stages, setStages] = useState<NoteStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const isUpdateMode = !!id;

  const [note, setNote] = useState<Partial<DebitNote>>({
    debit_note_no: id ? "" : "[Auto-Generated]",
    supplier_id: "",
    supplier_no: "",
    supplier_name: "",
    document_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
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
  const [currencies, setCurrencies] = useState<Currency[]>([]);

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

  useEffect(() => {
    fetch("/api/parties/currencies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCurrencies(data))
      .catch((err) =>
        console.error("Error pulling financial lookup matrices:", err),
      );
  }, []);

  useEffect(() => {
    if (!isUpdateMode) {
      setIsLoadingStages(false);
      return;
    }

    async function fetchStages() {
      try {
        const response = await fetch("/api/setup/purchases/debit_note_stages");
        if (response.ok) {
          const data = await response.json();
          setStages(data);
        }
      } catch (error) {
        console.error(
          "Failed to load debit note stages configuration setup setup:",
          error,
        );
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]);

  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.id === currencyConfig.currency_id);
  }, [currencyConfig.currency_id, currencies]);

  const financials = useMemo(() => {
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;

    const rate = Number(currencyConfig.exchange_rate || 1);
    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setNote((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_no: supplier.supplier_code,
      supplier_name: supplier.name,
    }));
    if (supplier.primary_address) setPrimaryAddress(supplier.primary_address);
    if (supplier.billing_address) setBillingAddress(supplier.billing_address);
    if (supplier.shipping_address)
      setShippingAddress(supplier.shipping_address);
    setSupplierModalOpen(false);
  };

  const updateField = <K extends keyof DebitNote>(
    field: K,
    value: DebitNote[K],
  ) => {
    setNote((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!note.supplier_id) errors.push("Supplier selection is required.");
    if (!currencyConfig.currency_id)
      errors.push("Transactional currency token designation required.");
    if (lines.length === 0)
      errors.push(
        "Debit notes require at least one ledger/item breakdown entry line.",
      );

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error(
        "Please fix layout constraints validation errors before saving.",
      );
      return;
    }

    try {
      setSaving(true);
      setValidationErrors([]);

      const payload = {
        debitNote: {
          ...note,
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
        id ? `/api/debit-notes/${id}` : "/api/debit-notes",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Execution error writing debit document records.",
        );

      toast.success("Debit Document records compiled and updated cleanly");
      router.push(`/${slug}/purchases/debit-notes`);
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
    }
  };

  const handleStageClick = async (stageName: string) => {
    const standardizedStatus = stageName.toLowerCase();

    if (
      !id ||
      isUpdatingStatus ||
      note.status?.toLowerCase() === standardizedStatus
    )
      return;

    setIsUpdatingStatus(true);
    try {
      if (standardizedStatus === "posted") {
        const confirmPosting = confirm(
          "Are you sure you want to mark this Debit Note as Posted? This transaction will commit structural changes back to the general ledger and re-balance physical inventory lines permanently.",
        );
        if (!confirmPosting) {
          setIsUpdatingStatus(false);
          return;
        }

        toast.loading(
          "Executing inventory reversing dispatch lines & G/L journals ledger allocations...",
          {
            id: "posting-toast",
          },
        );
      }

      const response = await fetch(`/api/debit-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debitNote: {
            ...note,
            ...currencyConfig,
            supplier_id: note.supplier_id || "",
            document_date:
              note.document_date || new Date().toISOString().split("T")[0],
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
        setNote((prev) => ({ ...prev, status: standardizedStatus }));
        toast.success(`Stage updated successfully to: ${stageName}`, {
          id: "posting-toast",
        });
        router.refresh();
      } else {
        const errData = await response.json();
        toast.error(
          `Failed to update step stage: ${errData.error || "Unknown error"}`,
          { id: "posting-toast" },
        );
      }
    } catch (error) {
      console.error("Error patching sequence document status:", error);
      toast.error("Network error updating status pipeline adjustments.", {
        id: "posting-toast",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const inputStyle =
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5";

  return (
    <div className="space-y-4 container mx-auto p-1">
      {isUpdateMode && !isLoadingStages && stages.length > 0 && (
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
      )}

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

      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        {(["general", "invoicing", "shipping"] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <OrderFormTabs
        activeTab={activeTab}
        note={note}
        primaryAddress={primaryAddress}
        setPrimaryAddress={setPrimaryAddress}
        billingAddress={billingAddress}
        setBillingAddress={setBillingAddress}
        shippingAddress={shippingAddress}
        setShippingAddress={setShippingAddress}
        currencyConfig={currencyConfig}
        setCurrencyConfig={setCurrencyConfig}
        currencies={currencies}
        updateField={updateField}
        setSupplierModalOpen={setSupplierModalOpen}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />

      <DebitNoteLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">
              Conversion RateFactor
            </span>
            <input
              type="number"
              step="any"
              className={`${inputStyle} font-mono max-w-[180px]`}
              value={currencyConfig.exchange_rate ?? ""}
              onChange={(e) =>
                setCurrencyConfig({
                  ...currencyConfig,
                  exchange_rate: parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">
              Amount Incl. VAT ({baseCurrencyCode})
            </span>
            <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold max-w-[180px] rounded">
              {financials.amountInclVatLCY.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div className="space-y-1 text-xs font-medium text-right font-mono ml-auto w-full max-w-sm">
          <div className="flex justify-between border-b dark:border-slate-800 pb-1">
            <span className="text-slate-400 font-sans">
              Gross Adjusted Net:
            </span>
            <span>
              {financials.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {selectedCurrency?.code || ""}
            </span>
          </div>
          <div className="flex justify-between border-b dark:border-slate-800 pb-1">
            <span className="text-slate-400 font-sans">
              VAT Reversed Re-Assessment:
            </span>
            <span>
              {financials.vat.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {selectedCurrency?.code || ""}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1 text-slate-900 dark:text-white">
            <span className="font-sans">Total Balanced Credit Claim:</span>
            <span>
              {financials.amountInclVat.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {selectedCurrency?.code || ""}
            </span>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/purchases/debit-notes`)}
            className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 font-bold uppercase rounded hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-emerald-600 text-white font-bold uppercase rounded shadow hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? "Writing records..." : "Save Debit Note"}
          </button>
        </div>
      )}
      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
};
/* 
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Debit Note No.</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.debit_note_no || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Supplier Allocation *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={note.supplier_id || "Click Select..."}
                />
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:search" />
                </button>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Supplier Vendor Name</label>
              <input
                type="text"
                disabled
                className={inputStyle}
                value={note.supplier_name || ""}
              />
            </div>
            <div>
              <label className={labelStyle}>Document Date</label>
              <input
                type="date"
                className={inputStyle}
                value={note.document_date?.split("T")[0] ?? ""}
                onChange={(e) => updateField("document_date", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={billingAddress.address_1 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
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
                value={billingAddress.address_2 || ""}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    address_2: e.target.value,
                  })
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
          </div>
        )}

        {activeTab === "invoicing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Operational Currency *</label>
              <select
                className={inputStyle} 
                value={currencyConfig.currency_id ?? ""}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const matched = currencies.find((c) => c.id === targetId);
                  setCurrencyConfig({
                    currency_id: targetId,
                    exchange_rate: matched ? matched.exchange_rate : 1,
                  });
                }}
              >
                <option value="">Select Valuation Token...</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Adjustment Reason Notes</label>
              <input
                type="text"
                className={inputStyle}
                placeholder="Context breakdown lines..."
                value={note.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle}>
                Supplier Invoice Link Reference
              </label>
              <input
                type="text"
                className={inputStyle}
                placeholder="e.g. BAL-REF-992"
                value={note.reference || ""}
                onChange={(e) => updateField("reference", e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Return Consignee Name</label>
              <input
                type="text"
                className={inputStyle}
                value={shippingAddress.name || ""}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelStyle}>Shipping Dispatch St. 1</label>
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
              <label className={labelStyle}>Shipping Dispatch St. 2</label>
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
          </div>
        )}
      </div>
 */

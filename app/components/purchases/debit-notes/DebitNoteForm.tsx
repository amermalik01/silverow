// app/components/purchases/debit-notes/DebitNoteForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DebitNote, DebitNoteAddress, DebitNoteLine } from "@/types/debit-note";
import SupplierLookupModal, { SupplierLookupItem } from "../../shared/modals/SupplierLookupModal";

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number;
}

interface OrderStage {
  id: string;
  name: string;
  rank: number;
}

interface Props {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
}

type TabType = "general" | "invoicing" | "shipping";

export const DebitNoteForm: React.FC<Props> = ({ slug, id, isReadOnly = false }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [stages, setStages] = useState<OrderStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const isUpdateMode = !!id;

  const [debitNote, setDebitNote] = useState<Partial<DebitNote>>({
    debit_note_no: id ? "" : "[Auto-Generated]",
    supplier_id: "",
    supplier_name: "",
    document_date: new Date().toISOString().split("T")[0],
    status: "draft",
    reference: "",
    notes: "",
  });

  const [billingAddress, setBillingAddress] = useState<Partial<DebitNoteAddress>>({ address_type: "billing" });
  const [shippingAddress, setShippingAddress] = useState<Partial<DebitNoteAddress>>({ address_type: "shipping" });
  const [lines, setLines] = useState<DebitNoteLine[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currencyConfig, setCurrencyConfig] = useState({ currency_id: "", exchange_rate: 1 });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/debit-notes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setDebitNote(data.debitNote || {});
          setLines(data.lines || []);
          setBillingAddress(data.billing_address || { address_type: "billing" });
          setShippingAddress(data.shipping_address || { address_type: "shipping" });
          setCurrencyConfig({
            currency_id: data.debitNote?.currency_id || "",
            exchange_rate: data.debitNote?.exchange_rate || 1,
          });
        }
      })
      .catch((err) => console.error("Error hydrating structural record matrix:", err));
  }, [id]);

  useEffect(() => {
    fetch("/api/parties/currencies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCurrencies(data))
      .catch((err) => console.error("Error pulling financial lookup collections:", err));
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
        console.error("Failed to load setup configuration modules:", error);
      } finally {
        setIsLoadingStages(false);
      }
    }
    fetchStages();
  }, [isUpdateMode]);

  const financials = useMemo(() => {
    const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
    const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
    const amountInclVat = amount + vat;
    const rate = Number(currencyConfig.exchange_rate || 1);
    const amountInclVatLCY = amountInclVat / rate;

    return { amount, vat, amountInclVat, amountInclVatLCY };
  }, [lines, currencyConfig.exchange_rate]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setDebitNote((prev) => ({ ...prev, supplier_id: supplier.id, supplier_name: supplier.name }));
    if (supplier.billing_address) setBillingAddress(supplier.billing_address);
    if (supplier.shipping_address) setShippingAddress(supplier.shipping_address);
    setSupplierModalOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!debitNote.supplier_id) errors.push("Supplier selection is required.");
    if (!currencyConfig.currency_id) errors.push("Transactional currency field selection is required.");
    if (lines.length === 0) errors.push("Debit notes require at least one detail structural layout item line.");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        debitNote: {
          ...debitNote,
          ...currencyConfig,
          subtotal: financials.amount,
          tax_amount: financials.vat,
          total_amount: financials.amountInclVat,
        },
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines,
      };

      const res = await fetch(id ? `/api/debit-notes/${id}` : "/api/debit-notes", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Execution transactional rollback error writing back record.");
      toast.success("Debit Note layout updated clearly.");
      router.push(`/${slug}/purchases/debit-notes`);
    } catch (err) {
      if (err instanceof Error) setValidationErrors([err.message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 container mx-auto p-1">
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded text-sm">
          {validationErrors.map((e, idx) => <p key={idx}>{e}</p>)}
        </div>
      )}

      {/* Primary configuration controls layout container view placeholder summary */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-4">
        <h3 className="text-md font-bold text-slate-700 dark:text-slate-300">Document Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Supplier</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={debitNote.supplier_name || ""} className="w-full border p-1.5 rounded text-sm bg-gray-50" placeholder="No Supplier Selected" />
              <button type="button" disabled={isReadOnly} onClick={() => setSupplierModalOpen(true)} className="bg-blue-600 px-3 py-1 text-white rounded text-xs">Lookup</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Document Date</label>
            <input type="date" disabled={isReadOnly} value={debitNote.document_date || ""} onChange={(e) => setDebitNote(p => ({ ...p, document_date: e.target.value }))} className="w-full border p-1.5 rounded text-sm bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Reference</label>
            <input type="text" disabled={isReadOnly} value={debitNote.reference || ""} onChange={(e) => setDebitNote(p => ({ ...p, reference: e.target.value }))} className="w-full border p-1.5 rounded text-sm bg-transparent" placeholder="Ref/Invoices Matching Code" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push(`/${slug}/purchases/debit-notes`)} className="px-4 py-2 border rounded text-sm">Cancel</button>
        {!isReadOnly && <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">{saving ? "Saving..." : "Save Changes"}</button>}
      </div>

      <SupplierLookupModal open={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} onSelect={handleSupplierSelect} />
    </div>
  );
};
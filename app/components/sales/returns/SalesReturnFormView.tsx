// /app/components/sales/returns/SalesReturnFormView.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormLine {
  lineNo: number;
  lineType: "ITEM" | "GL_ACCOUNT";
  itemId: string;
  glAccountId: string;
  warehouseId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

interface CustomerSetupOption {
  id: string;
  name: string;
}
interface CurrencySetupOption {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
}
interface InvoiceLookupItem {
  id: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: string | number;
  customer_name: string;
  customer_id: string;
}

interface ApiReturnedLine {
  line_no: number;
  line_type: "ITEM" | "GL_ACCOUNT";
  item_id: string | null;
  gl_account_id: string | null;
  warehouse_id: string | null;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  discount_amount: string | number;
  vat_percent: string | number;
}

export default function SalesReturnFormView({
  slug,
  id,
}: {
  slug: string;
  id?: string;
}) {
  const router = useRouter();
  const isEditMode = !!id; // Replaces static "isViewMode" to allow text mutations during edits

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Data Source Tracking State
  const [status, setStatus] = useState<"DRAFT" | "POSTED">("DRAFT");
  const isPosted = status === "POSTED";

  // Database Dependency Setup States
  const [customers, setCustomers] = useState<CustomerSetupOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencySetupOption[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceLookupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Document Entry States
  const [returnNo, setReturnNo] = useState("Draft Auto-Sequence");
  const [customerId, setCustomerId] = useState("");
  const [salesInvoiceId, setSalesInvoiceId] = useState("");

  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    {
      lineNo: 10000,
      lineType: "ITEM",
      itemId: "",
      glAccountId: "",
      warehouseId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      vatPercent: 0,
    },
  ]);

  // Gather setup definitions and load detail rows conditionally
  useEffect(() => {
    async function initializeForm() {
      try {
        const setupRes = await fetch(
          `/api/sales/sales-returns/setup-dependencies`,
        );
        const setupData = await setupRes.json();
        if (!setupData.success)
          throw new Error(setupData.error || "Dependency generation aborted.");

        setCustomers(setupData.customers);
        setCurrencies(setupData.currencies);
        setAllInvoices(setupData.invoices);

        // Pre-set Default Base Currency parameters if creating a new entry

        if (!isEditMode) {
          const baseCurr = setupData.currencies.find(
            (c: CurrencySetupOption) => c.is_base,
          );
          if (baseCurr) {
            setCurrencyId(baseCurr.id);
            setExchangeRate(Number(baseCurr.exchange_rate));
          }
          // Pre-populate empty single row item matrix on fresh setup
          setLines([
            {
              lineNo: 10000,
              lineType: "ITEM",
              itemId: "",
              glAccountId: "",
              warehouseId: "",
              description: "",
              quantity: 1,
              unitPrice: 0,
              discountAmount: 0,
              vatPercent: 0,
            },
          ]);
        }

        if (isEditMode) {
          const detailRes = await fetch(`/api/sales/sales-returns/${id}`);
          const detailData = await detailRes.json();
          if (!detailData.success)
            throw new Error(detailData.error || "Record read failure");

          const inv = detailData.invoice;
          setReturnNo(inv.return_no);
          setStatus(inv.status || "DRAFT"); // Track and apply ledger state lock parameters
          setCustomerId(inv.customer_id);
          setSalesInvoiceId(inv.sales_invoice_id || "");
          setReturnDate(new Date(inv.return_date).toISOString().split("T")[0]);
          setCurrencyId(inv.currency_id || "");
          setExchangeRate(Number(inv.exchange_rate || 1));
          setNotes(inv.notes || "");

          const mappedLines = detailData.lines.map(
            (l: ApiReturnedLine): FormLine => ({
              lineNo: l.line_no,
              lineType: l.line_type,
              // Map foreign keys cleanly back into text fields to preserve edit safety
              itemId: l.item_id || "",
              glAccountId: l.gl_account_id || "",
              warehouseId: l.warehouse_id || "",
              description: l.description || "",
              quantity: Number(l.quantity),
              unitPrice: Number(l.unit_price),
              discountAmount: Number(l.discount_amount || 0),
              vatPercent: Number(l.vat_percent || 0),
            }),
          );
          setLines(mappedLines);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    initializeForm();
  }, [id, isEditMode]);

  // Handle Post Action Worker Trigger
  const handlePost = async () => {
    if (
      !id ||
      !window.confirm(
        "Are you sure you want to POST this Credit Note? This will lock the document permanently and update financial ledgers.",
      )
    )
      return;
    setPosting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sales/sales-returns/${id}/post`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Posting process failed.");

      setStatus("POSTED"); // Immediately lock local interactive states
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // Safe Generic Form Field Matrix Mutator
  const updateLineField = <K extends keyof FormLine>(
    index: number,
    field: K,
    value: FormLine[K],
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleCurrencyChange = (targetId: string) => {
    setCurrencyId(targetId);
    const selected = currencies.find((c) => c.id === targetId);
    if (selected) {
      setExchangeRate(Number(selected.exchange_rate));
    }
  };

  const selectInvoiceFromModal = (inv: InvoiceLookupItem) => {
    setSalesInvoiceId(inv.id);
    setCustomerId(inv.customer_id); // Auto-bind customer relative to source billing trace logs
    setIsModalOpen(false);
  };

  const handleAddLine = () => {
    const nextNo = (lines[lines.length - 1]?.lineNo || 0) + 10000;
    setLines([
      ...lines,
      {
        lineNo: nextNo,
        lineType: "ITEM",
        itemId: "",
        glAccountId: "",
        warehouseId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        vatPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return; // Maintain document structure integrity
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleDelete = async () => {
    if (
      !id ||
      !window.confirm(
        "Are you sure you want to permanently delete this Credit Note? This action cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sales/sales-returns/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletions rejected");
      router.push(`/${slug}/sales/returns`);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setDeleting(false);
    }
  };

  const subtotal = lines.reduce(
    (acc, l) => acc + (l.quantity * l.unitPrice - l.discountAmount),
    0,
  );
  const taxAmount = lines.reduce(
    (acc, l) =>
      acc +
      (l.quantity * l.unitPrice - l.discountAmount) * (l.vatPercent / 100),
    0,
  );
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setSubmitting(true);
    setError(null);

    // Determine path routing based on document persistence state
    const targetUrl = isEditMode
      ? `/api/sales/sales-returns/${id}`
      : `/api/sales/sales-returns`;

    const targetMethod = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(targetUrl, {
        method: targetMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          salesInvoiceId: salesInvoiceId || null,
          returnDate,
          currencyId,
          exchangeRate,
          notes,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission rejected");
      router.push(`/${slug}/sales/returns`);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = allInvoices.filter(
    (inv) =>
      inv.invoice_no.toLowerCase().includes(modalSearch.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(modalSearch.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-6 text-sm text-gray-500 animate-pulse">
        Initializing System Credit Note Interfaces...
      </div>
    );

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
      <form onSubmit={handleSubmit}>
        {/* Header Panel Actions Wrapper */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Link
                href={`/${slug}/sales/returns`}
                className="text-xs font-semibold hover:underline text-gray-500 dark:text-gray-400"
              >
                &larr; Returns & Credit Notes Directory
              </Link>
              <h1 className="text-2xl font-bold mt-1">
                {isEditMode
                  ? `Update Credit Note — ${returnNo}`
                  : "Log New Return Document"}
              </h1>
              {isPosted ? (
                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded text-xs font-bold border border-green-200 dark:border-green-800 tracking-wide uppercase select-none">
                  Posted Ledger Record
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded text-xs font-bold border border-amber-200 dark:border-amber-800 tracking-wide uppercase select-none">
                  Draft Document
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isEditMode && !isPosted && (
                <>
                  <button
                    type="button"
                    disabled={deleting || submitting || posting}
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:bg-gray-400"
                  >
                    {deleting ? "Purging Document..." : "Delete Credit Note"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting || submitting || posting}
                    onClick={handlePost}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:bg-gray-400"
                  >
                    {posting ? "Posting..." : "Post Document"}
                  </button>
                </>
              )}

              {!isPosted && (
                <button
                  type="submit"
                  disabled={submitting || deleting || posting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium transition disabled:bg-gray-400"
                >
                  {submitting
                    ? "Committing..."
                    : isEditMode
                      ? "Save Adjustments"
                      : "Commit Document"}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mt-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Metadata Attributes Grid */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Customer Party
            </label>
            <select
              required
              disabled={isPosted}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full text-sm border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Link Picker Element */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Linked Invoice Reference
            </label>
            <div className="flex gap-1 mt-1">
              <select
                disabled={isPosted}
                value={salesInvoiceId}
                onChange={(e) => {
                  setSalesInvoiceId(e.target.value);
                  const inv = allInvoices.find((i) => i.id === e.target.value);
                  if (inv) setCustomerId(inv.customer_id);
                }}
                className="flex-1 text-sm border p-2 rounded-md bg-white dark:bg-slate-800 truncate focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
              >
                <option value="">-- Direct (Unlinked) --</option>
                {allInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_no}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isPosted}
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-900 text-white text-xs px-2.5 rounded hover:bg-gray-800 transition dark:bg-slate-700 dark:hover:bg-slate-600"
                title="Open Advanced Search Dialog"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Dynamic Currency Dropdown Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Billing Currency
            </label>
            <select
              required
              disabled={isPosted}
              value={currencyId}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="mt-1 w-full text-sm border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
            >
              {currencies.map((curr) => (
                <option key={curr.id} value={curr.id}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exchange Weight Value Input Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Exchange Valuation Rate
            </label>
            <input
              type="number"
              required
              step="any"
              disabled={isPosted}
              min={0.000001}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full text-sm border p-2 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 font-mono text-right dark:border-slate-700"
            />
          </div>
        </div>

        {/* Global Remarks Notes Field */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm mt-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Voucher Header Notes
          </label>
          <textarea
            value={notes}
            disabled={isPosted}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add administrative summary justifications here..."
            className="w-full text-sm border p-2 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 h-16 resize-none"
          />
        </div>

        {/* Row Allocation Items Layout Table */}
        <div className="border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 mt-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-800 text-left">
              <tr>
                <th className="p-3 w-32">Type</th>
                <th className="p-3">Reference (Item / Account UUID)</th>
                <th className="p-3 w-36">Location</th>
                <th className="p-3 w-24 text-right">Qty</th>
                <th className="p-3 w-28 text-right">Unit Price</th>
                <th className="p-3 w-24 text-right">Tax (%)</th>
                <th className="p-3 text-right w-32">Total</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineNet =
                  line.quantity * line.unitPrice - line.discountAmount;
                const lineTotal = lineNet + lineNet * (line.vatPercent / 100);

                return (
                  <tr
                    key={idx}
                    className="align-top border-b dark:border-slate-800/50"
                  >
                    <td className="p-2">
                      <select
                        disabled={isPosted}
                        value={line.lineType}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "lineType",
                            e.target.value as "ITEM" | "GL_ACCOUNT",
                          )
                        }
                        className="w-full text-xs border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="ITEM">ITEM</option>
                        <option value="GL_ACCOUNT">GL_ACCOUNT</option>
                      </select>
                    </td>
                    <td className="p-2 space-y-1">
                      <input
                        type="text"
                        disabled={isPosted}
                        required
                        value={
                          line.lineType === "ITEM"
                            ? line.itemId
                            : line.glAccountId
                        }
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            line.lineType === "ITEM" ? "itemId" : "glAccountId",
                            e.target.value,
                          )
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                      <input
                        type="text"
                        disabled={isPosted}
                        placeholder="Line descriptive remark text..."
                        value={line.description}
                        onChange={(e) =>
                          updateLineField(idx, "description", e.target.value)
                        }
                        className="w-full text-[11px] border p-1 rounded-md text-gray-500 bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isPosted}
                        value={line.warehouseId}
                        onChange={(e) =>
                          updateLineField(idx, "warehouseId", e.target.value)
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0}
                        step="any"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isPosted}
                        required
                        min={0}
                        max={100}
                        step="any"
                        value={line.vatPercent}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "vatPercent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100 pt-3.5 pr-4 select-none">
                      ${lineTotal.toFixed(2)}
                    </td>
                    {!isPosted && (
                      <td className="p-2 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 font-bold text-xs"
                          title="Delete Row"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isPosted && (
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded shadow-sm"
              >
                + Add Item Line Row
              </button>
            </div>
          )}

          {/* Aggregated Ledger Totals Block Layout */}
          <div className="bg-gray-50/50 dark:bg-slate-800/20 p-4 border-t dark:border-slate-800 flex flex-col items-end space-y-1 text-sm select-none">
            <div className="w-[260px] flex justify-between text-gray-600 dark:text-gray-400">
              <span>Net Return Subtotal:</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-gray-600 dark:text-gray-400">
              <span>VAT Refund Balance:</span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 border-t dark:border-slate-800 pt-1 mt-1">
              <span>Total Credit Amount:</span>
              <span className="font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Advanced Invoice Lookup Selection Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-xl">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  Select Original Document Record Source
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Filter by billing target number or customer name values..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full text-xs p-2 border dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-2 divide-y dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredInvoices.length ? (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => selectInvoiceFromModal(inv)}
                      className="p-2.5 text-xs flex justify-between items-center hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer rounded transition-colors group"
                    >
                      <div>
                        <p className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                          {inv.invoice_no}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {inv.customer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900 dark:text-gray-100">
                          ${Number(inv.total_amount).toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 italic">
                    No corresponding records resolved.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormLine {
  lineNo: number;
  lineType: "ITEM" | "GL_ACCOUNT";
  itemId: string;
  glAccountId: string;
  warehouseId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

interface CustomerSetupOption {
  id: string;
  name: string;
}
interface CurrencySetupOption {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
}
interface InvoiceLookupItem {
  id: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: string | number;
  customer_name: string;
  customer_id: string;
}

interface ApiReturnedLine {
  line_no: number;
  line_type: "ITEM" | "GL_ACCOUNT";
  item_id: string | null;
  item_name: string | null;
  gl_account_id: string | null;
  account_name: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  discount_amount: string | number;
  vat_percent: string | number;
}

export default function SalesReturnFormView({
  slug,
  id,
}: {
  slug: string;
  id?: string;
}) {
  const router = useRouter();
  const isViewMode = !!id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database Dependency Setup States
  const [customers, setCustomers] = useState<CustomerSetupOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencySetupOption[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceLookupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Document Entry States
  const [returnNo, setReturnNo] = useState("Draft Auto-Sequence");
  const [customerId, setCustomerId] = useState("");
  const [salesInvoiceId, setSalesInvoiceId] = useState("");
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    {
      lineNo: 10000,
      lineType: "ITEM",
      itemId: "",
      glAccountId: "",
      warehouseId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      vatPercent: 0,
    },
  ]);

  // Gather setup definitions and load detail rows conditionally
  useEffect(() => {
    async function initializeForm() {
      try {
        const setupRes = await fetch(
          `/api/sales/sales-returns/setup-dependencies`,
        );
        const setupData = await setupRes.json();
        if (!setupData.success)
          throw new Error(setupData.error || "Dependency generation aborted.");

        setCustomers(setupData.customers);
        setCurrencies(setupData.currencies);
        setAllInvoices(setupData.invoices);

        // Pre-set Default Base Currency parameters
        const baseCurr = setupData.currencies.find(
          (c: CurrencySetupOption) => c.is_base,
        );
        if (baseCurr) {
          setCurrencyId(baseCurr.id);
          setExchangeRate(Number(baseCurr.exchange_rate));
        }

        if (isViewMode) {
          const detailRes = await fetch(`/api/sales/sales-returns/${id}`);
          const detailData = await detailRes.json();
          if (!detailData.success)
            throw new Error(detailData.error || "Record read failure");

          const inv = detailData.invoice;
          setReturnNo(inv.return_no);
          setCustomerId(inv.customer_id);
          setSalesInvoiceId(inv.sales_invoice_id || "");
          setSelectedInvoiceNo(inv.original_invoice_no || "");
          setReturnDate(new Date(inv.return_date).toISOString().split("T")[0]);
          setCurrencyId(inv.currency_id || "");
          setExchangeRate(Number(inv.exchange_rate || 1));
          setNotes(inv.notes || "");

          const mappedLines = detailData.lines.map(
            (l: ApiReturnedLine): FormLine => ({
              lineNo: l.line_no,
              lineType: l.line_type,
              itemId: l.item_name || l.item_id || "",
              glAccountId: l.account_name || l.gl_account_id || "",
              warehouseId: l.warehouse_name || l.warehouse_id || "",
              description: l.description || "",
              quantity: Number(l.quantity),
              unitPrice: Number(l.unit_price),
              discountAmount: Number(l.discount_amount),
              vatPercent: Number(l.vat_percent),
            }),
          );
          setLines(mappedLines);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    initializeForm();
  }, [id, isViewMode]);

  // Safe Generic Form Field Matrix Mutator
  const updateLineField = <K extends keyof FormLine>(
    index: number,
    field: K,
    value: FormLine[K],
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleCurrencyChange = (targetId: string) => {
    setCurrencyId(targetId);
    const selected = currencies.find((c) => c.id === targetId);
    if (selected) {
      setExchangeRate(Number(selected.exchange_rate));
    }
  };

  const selectInvoiceFromModal = (inv: InvoiceLookupItem) => {
    setSalesInvoiceId(inv.id);
    setSelectedInvoiceNo(inv.invoice_no);
    setCustomerId(inv.customer_id); // Auto-bind customer relative to source billing trace logs
    setIsModalOpen(false);
  };

  const handleAddLine = () => {
    const nextNo = (lines[lines.length - 1]?.lineNo || 0) + 10000;
    setLines([
      ...lines,
      {
        lineNo: nextNo,
        lineType: "ITEM",
        itemId: "",
        glAccountId: "",
        warehouseId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        vatPercent: 0,
      },
    ]);
  };

  const subtotal = lines.reduce(
    (acc, l) => acc + (l.quantity * l.unitPrice - l.discountAmount),
    0,
  );
  const taxAmount = lines.reduce(
    (acc, l) =>
      acc +
      (l.quantity * l.unitPrice - l.discountAmount) * (l.vatPercent / 100),
    0,
  );
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sales/sales-returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          salesInvoiceId: salesInvoiceId || null,
          returnDate,
          currencyId,
          exchangeRate,
          notes,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission rejected");
      router.push(`/${slug}/sales/returns`);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = allInvoices.filter(
    (inv) =>
      inv.invoice_no.toLowerCase().includes(modalSearch.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(modalSearch.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-6 text-sm text-gray-500 animate-pulse">
        Initializing System Interfaces...
      </div>
    );

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
      <form onSubmit={handleSubmit} className=" ">

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Link
                href={`/${slug}/sales/returns`}
                className="text-xs font-semibold  hover:underline"
              >
                &larr; Returns Directory
              </Link>
              <h1 className="text-2xl font-bold  mt-1">
                {isViewMode
                  ? `Credit Note ${returnNo}`
                  : "Log New Return Document"}
              </h1>
            </div>
            {!isViewMode && (
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium transition disabled:bg-gray-400"
              >
                {submitting ? "Saving Voucher Ledger..." : "Commit Document"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 border rounded-lg shadow-sm">

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Customer Party
            </label>
            <select
              required
              disabled={isViewMode}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full text-sm border p-2 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>


          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Linked Invoice Reference
            </label>
            <div className="flex gap-1 mt-1">
              <select
                disabled={isViewMode}
                value={salesInvoiceId}
                onChange={(e) => {
                  setSalesInvoiceId(e.target.value);
                  const inv = allInvoices.find((i) => i.id === e.target.value);
                  if (inv) setCustomerId(inv.customer_id);
                }}
                className="flex-1 text-sm border p-2 rounded-md bg-white truncate focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Direct (Unlinked) --</option>
                {allInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_no} ({i.customer_name})
                  </option>
                ))}
              </select>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gray-900 text-white text-xs px-2.5 rounded hover:bg-gray-800 transition"
                  title="Open Advanced Search Dialog"
                >
                  🔍
                </button>
              )}
            </div>
          </div>


          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Billing Currency
            </label>
            <select
              required
              disabled={isViewMode}
              value={currencyId}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="mt-1 w-full text-sm border p-2 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
            >
              {currencies.map((curr) => (
                <option key={curr.id} value={curr.id}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </select>
          </div>


          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Exchange Valuation Rate
            </label>
            <input
              type="number"
              required
              step="any"
              min={0.000001}
              disabled={isViewMode}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full text-sm border p-2 rounded-md focus:ring-1 focus:ring-blue-500 font-mono text-right"
            />
          </div>
        </div>


        <div className="border rounded-lg bg-white dark:bg-slate-900  mt-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-gray-50 dark:bg-slate-800 text-black dark:text-white text-left border-b">
              <tr>
                <th className="p-3 w-32">Type</th>
                <th className="p-3">Reference (Item / Account UUID)</th>
                <th className="p-3 w-36">Location</th>
                <th className="p-3 w-24 text-right">Qty</th>
                <th className="p-3 w-28 text-right">Unit Price</th>
                <th className="p-3 w-24 text-right">Tax (%)</th>
                <th className="p-3 text-right w-32">Total</th>
                {!isViewMode && <th className="p-3 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineNet =
                  line.quantity * line.unitPrice - line.discountAmount;
                const lineTotal = lineNet + lineNet * (line.vatPercent / 100);

                return (
                  <tr key={idx} className="align-top ">
                    <td className="p-2">
                      <select
                        disabled={isViewMode}
                        value={line.lineType}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "lineType",
                            e.target.value as "ITEM" | "GL_ACCOUNT",
                          )
                        }
                        className="w-full text-xs border p-1.5 rounded-md bg-white"
                      >
                        <option value="ITEM">ITEM</option>
                        <option value="GL_ACCOUNT">GL_ACCOUNT</option>
                      </select>
                    </td>
                    <td className="p-2 space-y-1">
                      <input
                        type="text"
                        required
                        disabled={isViewMode}
                        value={
                          line.lineType === "ITEM"
                            ? line.itemId
                            : line.glAccountId
                        }
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            line.lineType === "ITEM" ? "itemId" : "glAccountId",
                            e.target.value,
                          )
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Line descriptive remark text..."
                        disabled={isViewMode}
                        value={line.description}
                        onChange={(e) =>
                          updateLineField(idx, "description", e.target.value)
                        }
                        className="w-full text-[11px] border p-1 rounded-md text-gray-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isViewMode}
                        value={line.warehouseId}
                        onChange={(e) =>
                          updateLineField(idx, "warehouseId", e.target.value)
                        }
                        className="w-full text-xs font-mono border p-1.5 rounded-md"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        required
                        min={0.01}
                        step="any"
                        disabled={isViewMode}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        required
                        min={0}
                        step="any"
                        disabled={isViewMode}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        required
                        min={0}
                        max={100}
                        step="any"
                        disabled={isViewMode}
                        value={line.vatPercent}
                        onChange={(e) =>
                          updateLineField(
                            idx,
                            "vatPercent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full text-xs font-mono text-right border p-1.5 rounded-md"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-gray-900 pt-3.5 pr-4 select-none">
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isViewMode && (
            <div className="p-3 bg-gray-50 border-t">
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold bg-white border text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded shadow-sm"
              >
                + Add Item Line Row
              </button>
            </div>
          )}


          <div className="bg-gray-50/50 p-4 border-t flex flex-col items-end space-y-1 text-sm select-none">
            <div className="w-[260px] flex justify-between text-gray-600">
              <span>Net Return Subtotal:</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-gray-600">
              <span>VAT Refund Balance:</span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="w-[260px] flex justify-between text-base font-bold text-gray-900 border-t pt-1 mt-1">
              <span>Total Credit Amount:</span>
              <span className="font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>


        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border flex flex-col max-h-[85vh]">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h3 className="font-bold text-gray-900 text-sm">
                  Select Original Document Record Source
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 bg-white border-b">
                <input
                  type="text"
                  placeholder="Filter by billing target number or customer name values..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full text-xs p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-2 divide-y">
                {filteredInvoices.length ? (
                  filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => selectInvoiceFromModal(inv)}
                      className="p-2.5 text-xs flex justify-between items-center hover:bg-blue-50/60 cursor-pointer rounded transition-colors group"
                    >
                      <div>
                        <p className="font-mono font-bold text-blue-600 group-hover:underline">
                          {inv.invoice_no}
                        </p>
                        <p className="text-gray-500 font-medium mt-0.5">
                          {inv.customer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900">
                          ${Number(inv.total_amount).toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 italic">
                    No corresponding records resolved.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
 */

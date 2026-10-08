// app/components/finance/opening-balances/BankOpeningBalancesForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";
import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

export type BankOpeningBalanceRow = {
  posting_date: string;
  party_type: "supplier" | "customer";
  party_id: string;
  party_code: string | undefined;
  party_name: string;
  doc_type: "Payment" | "Refund";
  doc_no: string;
  external_ref_no: string;
  bank_gl_account_id: string;
  bank_gl_code?: string;
  bank_gl_name?: string;
  currency_id: string;
  currency_code: string;
  debit: number;
  credit: number;
  exchange_rate: number;
};

interface Props {
  apiBase?: string;
  redirectPath?: string;
}

export default function BankOpeningBalancesForm({
  apiBase = "/api/finance/opening-balances/bank",
  redirectPath = "/finance/opening-balances",
}: Props) {
  const router = useRouter();
  const { show, hide } = useLoader();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [lines, setLines] = useState<BankOpeningBalanceRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal triggers
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [glModalRowIndex, setGlModalRowIndex] = useState<number | null>(null);

  // Load currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await fetch("/api/parties/currencies");
        if (res.ok) {
          const data = await res.json();
          setCurrencies(data || []);
        }
      } catch (err) {
        console.error("Failed to load currencies:", err);
      }
    };
    fetchCurrencies();
  }, []);

  const baseCurrencyObj = currencies.find((c) => c.is_base) || { code: "GBP" };

  // Add line when Supplier is selected
  const handleSelectSupplier = (supplier: SupplierLookupItem) => {
    const defaultCurr = currencies.find((c) => c.id === supplier.currency_id);
    const newRow: BankOpeningBalanceRow = {
      posting_date: new Date().toISOString().split("T")[0],
      party_type: "supplier",
      party_id: supplier.id,
      party_code: supplier.supplier_code,
      party_name: supplier.name,
      doc_type: "Payment",
      doc_no: "",
      external_ref_no: "",
      bank_gl_account_id: "",
      currency_id: supplier.currency_id || "",
      currency_code: defaultCurr?.code || baseCurrencyObj.code,
      debit: 0,
      credit: 0,
      exchange_rate: defaultCurr ? Number(defaultCurr.exchange_rate) : 1.0,
    };
    setLines((prev) => [...prev, newRow]);
    setShowSupplierModal(false);
  };

  // Add line when Customer is selected
  const handleSelectCustomer = (customer: CustomerLookupItem) => {
    const defaultCurr = currencies.find((c) => c.id === customer.currency_id);
    const newRow: BankOpeningBalanceRow = {
      posting_date: new Date().toISOString().split("T")[0],
      party_type: "customer",
      party_id: customer.id,
      party_code: customer.customer_code,
      party_name: customer.name,
      doc_type: "Payment",
      doc_no: "",
      external_ref_no: "",
      bank_gl_account_id: "",
      currency_id: customer.currency_id || "",
      currency_code: defaultCurr?.code || baseCurrencyObj.code,
      debit: 0,
      credit: 0,
      exchange_rate: defaultCurr ? Number(defaultCurr.exchange_rate) : 1.0,
    };
    setLines((prev) => [...prev, newRow]);
    setShowCustomerModal(false);
  };

  // Select Bank G/L Account
  const handleSelectBankGL = (record: GLAccountLookupRecord) => {
    if (glModalRowIndex === null) return;
    const updated = [...lines];
    updated[glModalRowIndex].bank_gl_account_id = record.id;
    updated[glModalRowIndex].bank_gl_code = record.code;
    updated[glModalRowIndex].bank_gl_name = record.name;
    setLines(updated);
    setGlModalRowIndex(null);
  };

  const handleLineChange = (
    index: number,
    field: keyof BankOpeningBalanceRow,
    value: any,
  ) => {
    const updated = [...lines];

    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }

    if (field === "currency_id") {
      const selectedCurrency = currencies.find((c) => c.id === value);
      if (selectedCurrency) {
        updated[index].currency_code = selectedCurrency.code;
        updated[index].exchange_rate = Number(selectedCurrency.exchange_rate);
      } else {
        updated[index].currency_code = baseCurrencyObj.code;
        updated[index].exchange_rate = 1.0;
      }
    }

    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const removeRow = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Helper for Net Amount Calculation (Debit - Credit) * Exchange Rate
  const calculateAmountLCY = (line: BankOpeningBalanceRow) => {
    const netAmount =
      (Number(line.debit || 0) - Number(line.credit || 0)) *
      Number(line.exchange_rate || 1.0);
    return netAmount;
  };

  const formatLCY = (val: number) => {
    const absVal = Math.abs(val).toFixed(2);
    if (val < 0) return `(${absVal})`;
    return absVal;
  };

  const totalLCY = lines.reduce(
    (sum, line) => sum + calculateAmountLCY(line),
    0,
  );

  // Submit / Save Handler
  const handleSave = async () => {
    setErrorMsg(null);
    if (lines.length === 0) {
      setErrorMsg("Please add at least one line before saving.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.bank_gl_account_id) {
        setErrorMsg(`Line ${i + 1}: Please select a Bank G/L Account.`);
        return;
      }
      if (Number(line.debit) === 0 && Number(line.credit) === 0) {
        setErrorMsg(
          `Line ${i + 1}: Please enter either a Debit or Credit amount.`,
        );
        return;
      }
    }

    try {
      show("Saving Bank Opening Balances...");
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save bank opening balances.");
      }

      router.push(redirectPath);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      hide();
    }
  };

  return (
    <div className="space-y-6">
      {/* <Breadcrumbs
        items={[
          { label: "Setup", href: "/setup" },
          { label: "Finance", href: "/finance" },
          { label: "Opening Balances (Bank)" },
        ]}
      /> */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md font-medium text-sm">
            {errorMsg}
          </div>
        )}

        {/* Action Header Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs"
            onClick={() => setShowSupplierModal(true)}
          >
            Select Supplier
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs"
            onClick={() => setShowCustomerModal(true)}
          >
            Select Customer
          </Button>
        </div>

        {/* Matrix Grid Table */}
        <div className="overflow-x-auto border border-zinc-200 rounded">
          <table className="w-full text-left text-xs text-zinc-700 border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <th className="p-2 w-28">Posting Date</th>
                <th className="p-2 w-24">Type</th>
                <th className="p-2 w-28">Doc. Type</th>
                <th className="p-2 w-28">Doc. No.</th>
                <th className="p-2 w-32">External Ref. No.</th>
                <th className="p-2 w-28">No.</th>
                <th className="p-2 w-48">Description</th>
                <th className="p-2 w-36">Bank G/L No.</th>
                <th className="p-2 w-24">Currency</th>
                <th className="p-2 w-24 text-right">Debit</th>
                <th className="p-2 w-24 text-right">Credit</th>
                <th className="p-2 w-24 text-center">Exchange Rate</th>
                <th className="p-2 w-32 text-right">Amount in LCY</th>
                <th className="p-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {lines.map((line, index) => {
                const amountLCY = calculateAmountLCY(line);
                return (
                  <tr
                    key={index}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    {/* Posting Date */}
                    <td className="p-1.5">
                      <DatePicker
                        id={`posting-date-${index}`}
                        value={
                          line.posting_date
                            ? new Date(line.posting_date)
                            : undefined
                        }
                        onChange={(selectedDate) => {
                          if (!selectedDate) return;
                          const iso = selectedDate.toISOString().split("T")[0];
                          handleLineChange(index, "posting_date", iso);
                        }}
                      />
                    </td>

                    {/* Type */}
                    <td className="p-1.5 font-medium capitalize">
                      {line.party_type}
                    </td>

                    {/* Doc. Type */}
                    <td className="p-1.5">
                      <select
                        value={line.doc_type}
                        onChange={(e) =>
                          handleLineChange(index, "doc_type", e.target.value)
                        }
                        className="w-full border p-1 rounded bg-white"
                      >
                        <option value="Payment">Payment</option>
                        <option value="Refund">Refund</option>
                      </select>
                    </td>

                    {/* Doc. No */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={line.doc_no}
                        onChange={(e) =>
                          handleLineChange(index, "doc_no", e.target.value)
                        }
                        className="w-full border p-1 rounded font-mono"
                      />
                    </td>

                    {/* External Ref. No */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={line.external_ref_no}
                        onChange={(e) =>
                          handleLineChange(
                            index,
                            "external_ref_no",
                            e.target.value,
                          )
                        }
                        className="w-full border p-1 rounded font-mono"
                      />
                    </td>

                    {/* No. (Party Code) */}
                    <td className="p-1.5 font-mono text-zinc-600 bg-zinc-50/50">
                      {line.party_code}
                    </td>

                    {/* Description (Party Name) */}
                    <td
                      className="p-1.5 truncate max-w-[180px]"
                      title={line.party_name}
                    >
                      {line.party_name}
                    </td>

                    {/* Bank G/L No. */}
                    <td className="p-1.5">
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          readOnly
                          placeholder="Select..."
                          value={line.bank_gl_code || ""}
                          className="w-full border p-1 rounded bg-zinc-50 font-mono text-center outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setGlModalRowIndex(index)}
                          className="p-1 bg-zinc-100 hover:bg-zinc-200 border rounded text-zinc-600"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </div>
                    </td>

                    {/* Currency */}
                    <td className="p-1.5">
                      <select
                        value={line.currency_id}
                        onChange={(e) =>
                          handleLineChange(index, "currency_id", e.target.value)
                        }
                        className="w-full border p-1 rounded font-semibold text-center bg-white"
                      >
                        <option value="">{baseCurrencyObj.code}</option>
                        {currencies
                          .filter((c) => !c.is_base)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code}
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* Debit */}
                    <td className="p-1.5">
                      <NumericTextInput
                        value={Number(line.debit)}
                        allowDecimals
                        decimalScale={2}
                        onChange={(val) =>
                          handleLineChange(index, "debit", String(val))
                        }
                        className="w-full border p-1 rounded text-right"
                      />
                    </td>

                    {/* Credit */}
                    <td className="p-1.5">
                      <NumericTextInput
                        value={Number(line.credit)}
                        allowDecimals
                        decimalScale={2}
                        onChange={(val) =>
                          handleLineChange(index, "credit", String(val))
                        }
                        className="w-full border p-1 rounded text-right"
                      />
                    </td>

                    {/* Exchange Rate */}
                    <td className="p-1.5">
                      <NumericTextInput
                        value={Number(line.exchange_rate)}
                        allowDecimals
                        decimalScale={2}
                        onChange={(val) =>
                          handleLineChange(index, "exchange_rate", String(val))
                        }
                        className="w-full border p-1 rounded text-right"
                      />
                    </td>

                    {/* Amount in LCY */}
                    <td className="p-1.5 text-right font-mono font-medium">
                      {formatLCY(amountLCY)}
                    </td>

                    {/* Action */}
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-zinc-400 hover:text-red-600 p-1 border rounded"
                      >
                        <Icon icon="tabler:x" className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {lines.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-zinc-400">
                    No rows added yet. Click <strong>Select Supplier</strong> or{" "}
                    <strong>Select Customer</strong> above to start.
                  </td>
                </tr>
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t bg-zinc-50 font-bold">
                  <td colSpan={12} className="p-2 text-right">
                    Total
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatLCY(totalLCY)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-6"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(redirectPath)}
            className="border px-6"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Lookups */}
      {showSupplierModal && (
        <SupplierLookupModal
          open={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSelect={handleSelectSupplier}
        />
      )}

      {showCustomerModal && (
        <CustomerLookupModal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSelect={handleSelectCustomer}
        />
      )}

      {glModalRowIndex !== null && (
        <GLAccountLookupModal
          open={glModalRowIndex !== null}
          onClose={() => setGlModalRowIndex(null)}
          onSelect={handleSelectBankGL}
        />
      )}
    </div>
  );
}

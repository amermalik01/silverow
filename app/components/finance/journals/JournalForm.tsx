//  app/components/finance/journals/JournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

// Lookup Modal Imports
import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "../../shared/modals/SupplierLookupModal";

type Account = {
  id: string;
  code: string;
  name: string;
};

type SubEntity = {
  id: string;
  name: string;
  code?: string;
};

type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type JournalLineRow = {
  posting_date: string;
  document_type: string;
  transaction_type: "gl_no" | "customer" | "supplier";
  account_id: string;
  party_id: string;
  currency_id: string;
  exchange_rate: number;
  debit: number;
  credit: number;
  description: string;
  balancing_account_id: string;
  display_code?: string;
  display_name?: string;
  balancing_display_name?: string;
};

interface ApiJournalLine {
  posting_date: string;
  document_type: string;
  account_id: string;
  party_id: string;
  party_type: string;
  party_name: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  currency_id?: string | null;
  exchange_rate?: string | number | null;
  debit: string | number;
  credit: string | number;
  description?: string | null;
  balancing_account_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  account_code?: string;
  account_name?: string;
  customer_code?: string;
  customer_name?: string;
  supplier_code?: string;
  supplier_name?: string;
  balancing_account_code?: string;
  balancing_account_name?: string;
}

interface ApiResponsePayload {
  journal: {
    entry_date?: string;
    reference?: string | null;
    description?: string | null;
    is_posted?: boolean;
    entry_no?: string;
  };
  lines?: ApiJournalLine[];
}

type Props = {
  slug: string;
  journalId?: string;
  journalType: "customer" | "supplier" | "item" | "general";
  apiBase: string;
  redirectPath: string;
};

export default function JournalForm({
  journalId,
  journalType,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isGeneral = journalType === "general";

  const [activeModal, setActiveModal] = useState<{
    index: number;
    type: "main_account" | "balancing_account";
    target: "gl" | "customer" | "supplier";
  } | null>(null);

  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    entry_no: "",
  });

  // Base factory template helper to generate standardized lines respecting journal layout restrictions
  const createInitialRow = (): JournalLineRow => ({
    posting_date: metadata.entry_date || new Date().toISOString().split("T")[0],
    document_type: isGeneral ? "General Journal" : "Payment",
    transaction_type: isGeneral
      ? "gl_no"
      : (journalType as "customer" | "supplier"),
    account_id: "",
    party_id: "",
    currency_id: "",
    exchange_rate: 1.0,
    debit: 0,
    credit: 0,
    description: "",
    balancing_account_id: "",
    display_code: "",
    display_name: "",
    balancing_display_name: "",
  });

  const [lines, setLines] = useState<JournalLineRow[]>([createInitialRow()]);

  // Converted tracking totals (bypassing lines with explicit balancing targets)
  const totalDebitConverted = lines.reduce((sum, line) => {
    if (line.balancing_account_id && line.balancing_account_id.trim() !== "")
      return sum;
    if (Number(line.debit || 0) <= 0) return sum;

    const rate = Number(line.exchange_rate || 1.0);
    return sum + Number((Number(line.debit) * rate).toFixed(2));
  }, 0);

  const totalCreditConverted = lines.reduce((sum, line) => {
    if (line.balancing_account_id && line.balancing_account_id.trim() !== "")
      return sum;
    if (Number(line.credit || 0) <= 0) return sum;

    const rate = Number(line.exchange_rate || 1.0);
    return sum + Number((Number(line.credit) * rate).toFixed(2));
  }, 0);

  const difference = Number(
    (totalDebitConverted - totalCreditConverted).toFixed(2),
  );
  const isBalanced = Math.abs(difference) < 0.01;

  useEffect(() => {
    const loadLookupsAndData = async () => {
      try {
        const curRes = await fetch(`/api/parties/currencies`);
        if (curRes.ok) setCurrencies((await curRes.json()) || []);

        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);
          const data: ApiResponsePayload = await res.json();

          setIsPosted(!!data.journal.is_posted);
          setMetadata({
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
            entry_no: data.journal.entry_no || "",
          });

          if (data.lines && data.lines.length > 0) {
            setLines(
              data.lines.map((l) => {
                let txType: "gl_no" | "customer" | "supplier" = "gl_no";
                const rawPartyType = l.party_type || "gl_no";

                if (rawPartyType === "customer") txType = "customer";
                if (rawPartyType === "supplier") txType = "supplier";

                let dispCode = l.account_code || "";
                let dispName = l.account_name || "";

                if (rawPartyType === "customer" || l.customer_id) {
                  txType = "customer";
                  dispCode = l.customer_code || "";
                  dispName = l.party_name || "";
                } else if (rawPartyType === "supplier" || l.supplier_id) {
                  txType = "supplier";
                  dispCode = l.supplier_code || "";
                  dispName = l.party_name || "";
                }

                let finalLineDate = "";
                const rawDateValue = l.posting_date || data.journal.entry_date;

                if (rawDateValue) {
                  finalLineDate =
                    typeof rawDateValue === "string"
                      ? rawDateValue.split("T")[0]
                      : new Date(rawDateValue).toISOString().split("T")[0];
                } else {
                  finalLineDate = new Date().toISOString().split("T")[0];
                }

                return {
                  posting_date: finalLineDate,
                  document_type:
                    l.document_type ||
                    (isGeneral ? "General Journal" : "Payment"),
                  transaction_type: txType,
                  account_id: l.account_id || "",
                  party_id: l.party_id || "",
                  currency_id: l.currency_id || "",
                  exchange_rate: Number(l.exchange_rate || 1.0),
                  debit: Number(l.debit || 0),
                  credit: Number(l.credit || 0),
                  description: l.description || "",
                  balancing_account_id: l.reference_id || "",
                  display_code: dispCode,
                  display_name: dispName,
                  balancing_display_name: l.balancing_account_name
                    ? `${l.balancing_account_code || ""} - ${l.balancing_account_name}`
                    : "",
                };
              }),
            );
          }
        }
      } catch (err) {
        console.error("Error loading journal configuration data:", err);
      }
    };
    loadLookupsAndData();
  }, [journalId, apiBase, isGeneral]);

  const baseCurrencyObj = currencies.find((c) => c.is_base) || { code: "GBP" };
  const baseCurrencyCode = baseCurrencyObj.code;

  const handleLineChange = (
    index: number,
    field: keyof JournalLineRow,
    value: string | number,
  ) => {
    if (isPosted) return;
    const updated = [...lines];

    if (field === "transaction_type") {
      updated[index].account_id = "";
      updated[index].party_id = "";
      updated[index].display_code = "";
      updated[index].display_name = "";
    }

    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }

    if (field === "currency_id") {
      if (value === "") {
        updated[index].exchange_rate = 1.0;
      } else {
        const selectedCurrency = currencies.find((c) => c.id === value);
        updated[index].exchange_rate = selectedCurrency
          ? Number(selectedCurrency.exchange_rate)
          : 1.0;
      }
    }

    updated[index] = { ...updated[index], [field]: value } as JournalLineRow;
    setLines(updated);
  };

  // Selection handler from modal popups mapping context values back to the active line index
  const handleModalSelection = (selectedRecord: {
    id: string;
    code?: string;
    name: string;
  }) => {
    if (!activeModal) return;
    const { index, type } = activeModal;
    const updated = [...lines];

    if (type === "main_account") {
      if (updated[index].transaction_type === "gl_no") {
        updated[index].account_id = selectedRecord.id;
        updated[index].party_id = "";
      } else {
        updated[index].account_id = "";
        updated[index].party_id = selectedRecord.id;
      }

      updated[index].display_code = selectedRecord.code || "";
      updated[index].display_name = selectedRecord.name;
    } else if (type === "balancing_account") {
      updated[index].balancing_account_id = selectedRecord.id;
      updated[index].balancing_display_name = selectedRecord.code
        ? `${selectedRecord.code} - ${selectedRecord.name}`
        : selectedRecord.name;
    }

    setLines(updated);
    setActiveModal(null);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines([...lines, createInitialRow()]);
  };

  const removeLineRow = (index: number) => {
    if (isPosted || lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handlePersistAction = async (postToLedger: boolean) => {
    if (isPosted) return;
    setErrorMsg(null);

    if (!metadata.entry_date) {
      setErrorMsg(
        "Journal entry header requires a valid Entry Date definition.",
      );
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.transaction_type === "gl_no" && !line.account_id) {
        setErrorMsg(
          `Line ${i + 1}: Missing explicit G/L Account binding target`,
        );
        return;
      }

      if (line.transaction_type !== "gl_no" && !line.party_id) {
        setErrorMsg(
          `Line ${i + 1}: Missing sub-ledger party profile reference link`,
        );
        return;
      }

      if (Number(line.debit || 0) === 0 && Number(line.credit || 0) === 0) {
        setErrorMsg(
          `Line ${i + 1}: Entry legs require an amount value greater than 0 (Debit or Credit)`,
        );
        return;
      }
      if (Number(line.exchange_rate || 0) <= 0) {
        setErrorMsg(
          `Line ${i + 1}: Exchange conversion rate cannot be zero or a negative expression`,
        );
        return;
      }

      // if (line.debit === 0 && line.credit === 0) {
      //   setErrorMsg(
      //     `Line ${i + 1}: Entry legs require an amount value (Debit or Credit)`,
      //   );
      //   return;
      // }
    }

    if (postToLedger && !isBalanced) {
      setErrorMsg(
        `Posting blocked: Journal entries must be perfectly balanced. Discrepancy: ${difference.toFixed(2)}`,
      );
      return;
    }

    try {
      setLoading(true);

      const sanitizedLines = lines.map((line) => {
        const rate = Number(line.exchange_rate || 1.0);
        const amt = line.debit > 0 ? line.debit : line.credit;
        const convertedAmount = Number((amt * rate).toFixed(2));

        return {
          posting_date: line.posting_date,
          document_type: line.document_type,
          account_id: line.account_id || null,
          party_id: line.party_id || null,
          party_type:
            line.transaction_type === "gl_no" ? null : line.transaction_type,
          currency_id: line.currency_id || null,
          exchange_rate: rate,
          debit: line.debit,
          credit: line.credit,
          currency_amount: convertedAmount,
          description: line.description || metadata.description || "",
          reference_id: line.balancing_account_id || null,
          reference_type: line.balancing_account_id ? "G/L Account" : null,
        };
      });

      // const payload = { ...metadata, sanitizedLines, is_posted: postToLedger };

      const payload = {
        entry_date: metadata.entry_date,
        reference: metadata.reference,
        description: metadata.description,
        lines: sanitizedLines,
        is_posted: postToLedger,
      };

      const method = journalId ? "PUT" : "POST";
      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Failed to commit journal transaction layer.",
        );
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 bg-zinc-100 p-4 rounded text-xs text-zinc-800">
      {errorMsg && (
        <div className="p-2 bg-red-200 text-red-800 rounded font-medium">
          {errorMsg}
        </div>
      )}

      {/* HEADER METADATA WORKSPACE */}
      <div className="flex flex-wrap items-center gap-6 bg-white p-3 rounded shadow-sm border border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600">Journal No.</span>
          <input
            type="text"
            readOnly
            className="border bg-zinc-50 p-1 px-2 rounded w-32 font-bold tracking-wide outline-none text-zinc-700"
            value={metadata.entry_no || "DRAFT"}
          />
        </div>

        {/* <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600 shrink-0">Entry Date</span>
          <input
            type="date"
            disabled={isPosted}
            className="border p-1 px-2 rounded w-full text-zinc-700 outline-none bg-white"
            value={metadata.entry_date}
            onChange={(e) => setMetadata({ ...metadata, entry_date: e.target.value })}
          />
        </div> */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600 shrink-0">
            Header Desc.
          </span>
          <input
            type="text"
            disabled={isPosted}
            placeholder="Global transaction remarks..."
            className="border p-1 px-2 rounded w-full text-zinc-700 outline-none bg-white"
            value={metadata.description}
            onChange={(e) =>
              setMetadata({ ...metadata, description: e.target.value })
            }
          />
        </div>
      </div>

      {/* MATRIX LAYOUT */}
      <div className="overflow-x-auto bg-white text-zinc-600 rounded border border-zinc-200 shadow-sm">
        <table className="w-full border-collapse text-left min-w-[1250px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold select-none">
              <th className="p-2 w-28">Posting Date</th>
              <th className="p-2 w-32">Doc. Type</th>
              <th className="p-2 w-24">Doc. No.</th>
              <th className="p-2 w-32">Tx Type</th>
              <th className="p-2 w-72">Account Search Selection</th>
              {/* <th className="p-2">Account Name</th> */}
              <th className="p-2 w-20">Currency</th>
              <th className="p-2 w-24">Debit</th>
              <th className="p-2 w-24">Credit</th>
              <th className="p-2 w-20 text-center">Cnv. Rate</th>
              <th className="p-2 w-28">Converted</th>
              <th className="p-2 w-64">Balancing G/L Selector</th>
              <th className="p-2 w-8 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-600">
            {lines.map((line, index) => {
              const localAmount = line.debit > 0 ? line.debit : line.credit;
              const convertedValue = localAmount * line.exchange_rate;

              return (
                <tr
                  key={index}
                  className="hover:bg-zinc-200/50 transition-colors"
                >
                  {/* <td className="p-1.5">
                    <input
                      type="date"
                      disabled={isPosted}
                      value={line.posting_date}
                      onChange={(e) =>
                        handleLineChange(index, "posting_date", e.target.value)
                      }
                      className="form-control-date"
                    />
                  </td> */}
                  <td className="p-1.5 min-w-[130px]">
                    <DatePicker
                      id={`posting-date-${index}`}
                      disabled={isPosted}
                      // Convert string "YYYY-MM-DD" securely to a standard JS Date object instance
                      value={
                        line.posting_date
                          ? new Date(line.posting_date)
                          : undefined
                      }
                      onChange={(selectedDate) => {
                        if (!selectedDate) return;

                        // Extract local date parameters to prevent UTC midnight shifts
                        const year = selectedDate.getFullYear();
                        const month = String(
                          selectedDate.getMonth() + 1,
                        ).padStart(2, "0");
                        const day = String(selectedDate.getDate()).padStart(
                          2,
                          "0",
                        );
                        const localIsoString = `${year}-${month}-${day}`;

                        handleLineChange(index, "posting_date", localIsoString);
                      }}
                    />
                  </td>

                  <td className="p-1.5">
                    <select
                      disabled={isPosted}
                      value={line.document_type || "Payment"}
                      onChange={(e) =>
                        handleLineChange(index, "document_type", e.target.value)
                      }
                      className="w-full border p-1 rounded bg-white text-zinc-700"
                    >
                      {isGeneral ? (
                        <>
                          <option value="General Journal">
                            General Journal
                          </option>
                          <option value="Payment">Payment</option>
                          <option value="Refund">Refund</option>
                        </>
                      ) : (
                        <>
                          <option value="Payment">Payment</option>
                          <option value="Refund">Refund</option>
                        </>
                      )}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      disabled={isPosted}
                      placeholder="REF"
                      value={metadata.reference}
                      onChange={(e) =>
                        setMetadata({ ...metadata, reference: e.target.value })
                      }
                      className="w-full border p-1 rounded text-center uppercase font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <select
                      disabled={isPosted || journalType !== "general"}
                      value={line.transaction_type}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "transaction_type",
                          e.target.value,
                        )
                      }
                      className="w-full border p-1 rounded bg-white text-zinc-700 font-semibold"
                    >
                      <option value="gl_no">G/L No.</option>
                      <option value="customer">Customer</option>
                      <option value="supplier">Supplier</option>
                    </select>
                  </td>

                  {/* MODAL TRIGGER LOOKUP COMPONENT */}
                  <td className="p-1.5">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        placeholder={`Click Select to lookup ${line.transaction_type}...`}
                        value={
                          line.display_code
                            ? `${line.display_code} - ${line.display_name}`
                            : ""
                        }
                        className="w-full border p-1 rounded bg-zinc-50 text-zinc-700 font-mono text-[11px] outline-none truncate"
                      />
                      <button
                        type="button"
                        disabled={isPosted}
                        onClick={() =>
                          setActiveModal({
                            index,
                            type: "main_account",
                            target:
                              line.transaction_type === "gl_no"
                                ? "gl"
                                : line.transaction_type,
                          })
                        }
                        className="px-2 bg-zinc-200 hover:bg-zinc-300 border text-zinc-700 rounded font-semibold transition"
                      >
                        Select
                      </button>
                    </div>
                  </td>

                  {/* <td className="p-1.5 text-zinc-500 max-w-[150px] truncate select-none">
                    {line.display_name || (
                      <span className="text-zinc-300 font-normal">
                        No account bound
                      </span>
                    )}
                  </td> */}

                  <td className="p-1.5">
                    <select
                      disabled={isPosted}
                      value={line.currency_id}
                      onChange={(e) =>
                        handleLineChange(index, "currency_id", e.target.value)
                      }
                      className="w-full border p-1 rounded bg-white font-bold text-center"
                    >
                      <option value="">{baseCurrencyCode}</option>
                      {currencies
                        .filter((c) => !c.is_base)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                    </select>
                  </td>

                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.01"
                      disabled={isPosted}
                      value={line.debit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "debit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full border p-1 rounded text-right font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.01"
                      disabled={isPosted}
                      value={line.credit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "credit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full border p-1 rounded text-right font-mono"
                    />
                  </td>

                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.000001"
                      disabled={!line.currency_id || isPosted}
                      value={line.currency_id ? line.exchange_rate : 1}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "exchange_rate",
                          parseFloat(e.target.value) || 1.0,
                        )
                      }
                      className="w-full border p-1 rounded text-center bg-zinc-50 font-mono"
                    />
                  </td>

                  <td className="p-1.5 text-right font-mono bg-zinc-50/60 text-zinc-600 font-semibold pr-3">
                    {convertedValue > 0 ? convertedValue.toFixed(2) : "0.00"}
                  </td>

                  <td className="p-1.5">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="None (Cross-balance layout)"
                        value={line.balancing_display_name || ""}
                        className="w-full border p-1 rounded bg-zinc-50 text-zinc-700 font-mono text-[11px] outline-none truncate"
                      />
                      <button
                        type="button"
                        disabled={isPosted}
                        onClick={() =>
                          setActiveModal({
                            index,
                            type: "balancing_account",
                            target: "gl",
                          })
                        }
                        className="px-2 bg-zinc-200 hover:bg-zinc-300 border text-zinc-700 rounded font-semibold transition"
                      >
                        Select
                      </button>
                      {line.balancing_account_id && (
                        <button
                          type="button"
                          disabled={isPosted}
                          onClick={() => {
                            const updated = [...lines];
                            updated[index].balancing_account_id = "";
                            updated[index].balancing_display_name = "";
                            setLines(updated);
                          }}
                          className="px-1 text-red-500 font-bold hover:bg-zinc-100 rounded"
                          title="Clear line balance target"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      disabled={lines.length === 1 || isPosted}
                      onClick={() => removeLineRow(index)}
                      className="w-5 h-5 bg-zinc-100 hover:bg-red-100 hover:text-red-600 rounded text-zinc-400 font-bold flex items-center justify-center disabled:opacity-20"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-white rounded border border-zinc-200">
        {/* <button
          type="button"
          onClick={addLineRow}
          className="secondary"
          // className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold transition shadow-sm"
        >
          <span className="text-base font-bold leading-none">+</span> Add Row
          Line
        </button> */}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPosted}
          onClick={addLineRow}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 border-emerald-200"
        >
          <span className="text-xs font-bold">+</span>
          Add Row Line
        </Button>

        <div className="flex items-center gap-6 font-mono text-zinc-600 bg-zinc-50 border p-2 px-4 rounded font-bold">
          <div>
            Total Converted Debit:{" "}
            <span className="text-zinc-800">
              {totalDebitConverted.toFixed(2)}
            </span>
          </div>
          <div>
            Total Converted Credit:{" "}
            <span className="text-zinc-800">
              {totalCreditConverted.toFixed(2)}
            </span>
          </div>
          <div className="border-l pl-6">
            Difference:{" "}
            <span className={isBalanced ? "text-emerald-600" : "text-red-500"}>
              {difference.toFixed(2)}
            </span>
          </div>
        </div>

        {/* <div className="flex items-center gap-6 font-mono text-zinc-600 bg-zinc-50 border p-2 px-4 rounded font-bold">
          <div>
            Difference:{" "}
            <span className={isBalanced ? "text-emerald-600" : "text-red-500"}>
              {difference.toFixed(2)}
            </span>
          </div>
        </div> */}
      </div>

      {/* <div className="flex justify-end gap-2 pt-2">
        {!isPosted && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePersistAction(false)}
              className="px-5 py-1.5 bg-zinc-600 hover:bg-zinc-700 text-white font-semibold rounded shadow-sm transition"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={
                loading ||
                (!isBalanced && lines.every((l) => !l.balancing_account_id))
              }
              onClick={() => handlePersistAction(true)}
              className="px-5 py-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded shadow-sm disabled:opacity-40 transition"
            >
              {loading ? "Posting..." : "Post Journal"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => router.push(redirectPath)}
          className="px-5 py-1.5 bg-white hover:bg-zinc-50 border rounded font-semibold text-zinc-700 transition"
        >
          {isPosted ? "Back" : "Cancel"}
        </button>
      </div> */}

      <div className="flex justify-end gap-2 pt-2">
        {!isPosted && (
          <>
            {/* Save Draft Button */}
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => handlePersistAction(false)}
              className="px-5 font-semibold shadow-sm"
            >
              Save Draft
            </Button>

            {/* Post Journal Button */}
            <Button
              type="button"
              disabled={
                loading ||
                (!isBalanced && lines.every((l) => !l.balancing_account_id))
              }
              onClick={() => handlePersistAction(true)}
              className="px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm disabled:opacity-40"
            >
              {loading ? "Posting..." : "Post Journal"}
            </Button>
          </>
        )}

        {/* Cancel / Back Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(redirectPath)}
          className="px-5 font-semibold text-zinc-700 hover:bg-zinc-50 bg-white"
        >
          {isPosted ? "Back" : "Cancel"}
        </Button>
      </div>

      {/* LOOKUP MODALS RENDER OVERLAYS */}
      <GLAccountLookupModal
        open={activeModal?.target === "gl"}
        onClose={() => setActiveModal(null)}
        onSelect={(account: GLAccountLookupRecord) =>
          handleModalSelection({
            id: account.id,
            code: account.code,
            name: account.name,
          })
        }
      />

      <CustomerLookupModal
        open={activeModal?.target === "customer"}
        onClose={() => setActiveModal(null)}
        onSelect={(customer: CustomerLookupItem) =>
          handleModalSelection({
            id: customer.id,
            code: customer.customer_code || "CUST",
            name: customer.name,
          })
        }
      />

      <SupplierLookupModal
        open={activeModal?.target === "supplier"}
        onClose={() => setActiveModal(null)}
        onSelect={(supplier: SupplierLookupItem) =>
          handleModalSelection({
            id: supplier.id,
            code: supplier.supplier_code || "SUPP",
            name: supplier.name,
          })
        }
      />
    </div>
  );
}

/* 



  const [lines, setLines] = useState<JournalLineRow[]>([
    {
      posting_date: new Date().toISOString().split("T")[0],
      document_type: isGeneral ? "General Journal" : "Payment",
      transaction_type: isGeneral
        ? "gl_no"
        : (journalType as "customer" | "supplier"),
      account_id: "",
      party_id: "",
      currency_id: "",
      exchange_rate: 1.0,
      debit: 0,
      credit: 0,
      description: "",
      balancing_account_id: "",
      display_code: "",
      display_name: "",
      balancing_display_name: "",
    },
  ]);
*/

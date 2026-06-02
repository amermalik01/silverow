//  app/components/finance/journals/JournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  code: string;
  name: string;
};

// Sub-ledger entity type definition
type SubEntity = {
  id: string;
  name: string;
};

type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type JournalLineRow = {
  account_id: string;
  party_id: string;
  currency_id: string;
  exchange_rate: number;
  debit: number;
  credit: number;
  description: string;
};

interface ApiJournalLine {
  account_id: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  currency_id?: string | null;
  exchange_rate?: string | number | null;
  debit: string | number;
  credit: string | number;
  description?: string | null;
}

interface ApiResponsePayload {
  journal: {
    entry_date?: string;
    reference?: string | null;
    description?: string | null;
    is_posted?: boolean;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subEntities, setSubEntities] = useState<SubEntity[]>([]); // Customer/Supplier list storage
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false); // 🔒 View-only switch state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
  });

  const [lines, setLines] = useState<JournalLineRow[]>([
    {
      account_id: "",
      party_id: "",
      currency_id: "",
      exchange_rate: 1.0,
      debit: 0,
      credit: 0,
      description: "",
    },
    {
      account_id: "",
      party_id: "",
      currency_id: "",
      exchange_rate: 1.0,
      debit: 0,
      credit: 0,
      description: "",
    },
  ]);

  // const [lines, setLines] = useState<JournalLineRow[]>([
  //   { account_id: "", party_id: "", debit: 0, credit: 0, description: "" },
  //   { account_id: "", party_id: "", debit: 0, credit: 0, description: "" },
  // ]);

  // const totalDebit = lines.reduce(
  //   (sum, line) => sum + Number(line.debit || 0),
  //   0,
  // );
  // const totalCredit = lines.reduce(
  //   (sum, line) => sum + Number(line.credit || 0),
  //   0,
  // );
  // const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const totalDebit = lines.reduce(
    (sum, line) => sum + Number(line.debit || 0) * (line.exchange_rate || 1.0),
    0,
  );

  const totalCredit = lines.reduce(
    (sum, line) => sum + Number(line.credit || 0) * (line.exchange_rate || 1.0),
    0,
  );
  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load General Ledger structural accounts
        const accountRes = await fetch(`/api/lookups/gl-accounts?all=true`);
        const accountData = await accountRes.json();
        setAccounts(accountData.data || []);

        try {
          const currencyRes = await fetch(`/api/parties/currencies`);

          if (currencyRes.ok) {
            const data = await currencyRes.json();
            setCurrencies(data || []);
          }
        } catch (cErr) {
          console.error("Failed to load currency lookup dictionary:", cErr);
        }

        // 2. Dynamically fetch Sub-ledger lookup options if context requires it
        if (journalType === "customer") {
          const res = await fetch(`/api/lookups/customers`); // Adjust lookup URL endpoints to match your project
          const lookup = await res.json();
          setSubEntities(lookup.data || []);
        } else if (journalType === "supplier") {
          const res = await fetch(`/api/lookups/suppliers`);
          const lookup = await res.json();
          setSubEntities(lookup.data || []);
        } else if (journalType === "item") {
          const res = await fetch(`/api/lookups/items`);
          const lookup = await res.json();
          setSubEntities(lookup.data || []); // Reuses subEntities array state variable to hold item assets!
        }

        // 3. Populate existing document records on edit/view states
        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);
          const data: ApiResponsePayload = await res.json();

          setIsPosted(!!data.journal.is_posted); // Sets read-only mode if true

          setMetadata({
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
          });

          if (data.lines && data.lines.length > 0) {
            setLines(
              data.lines.map((l) => ({
                account_id: l.account_id,
                party_id: l.customer_id || l.supplier_id || "",
                currency_id: l.currency_id || "",
                exchange_rate: Number(l.exchange_rate || 1.0),
                debit: Number(l.debit),
                credit: Number(l.credit),
                description: l.description || "",
              })),
            );
          }
        }
      } catch (err) {
        console.error("Error loading form operational models:", err);
      }
    };
    loadData();
  }, [journalId, apiBase, journalType]);

  // Find the base currency from our array state to extract code names/rates
  const baseCurrencyObj = currencies.find((c) => c.is_base);
  const baseCurrencyCode = baseCurrencyObj?.code || "GBP";

  const handleLineChange = (
    index: number,
    field: keyof JournalLineRow,
    value: string | number,
  ) => {
    if (isPosted) return;
    const updated = [...lines];

    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }
    // UPDATE: If the user changes the currency dropdown, pull and set its default exchange rate
    if (field === "currency_id") {
      const selectedCurrency = currencies.find((c) => c.id === value);
      if (selectedCurrency) {
        updated[index].exchange_rate =
          Number(selectedCurrency.exchange_rate) || 1.0;
      } else {
        updated[index].exchange_rate = 1.0; // Fallback for local currency
      }
    }

    updated[index] = { ...updated[index], [field]: value } as JournalLineRow;
    setLines(updated);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines([
      ...lines,
      {
        account_id: "",
        party_id: "",
        currency_id: "",
        exchange_rate: 1.0,
        debit: 0,
        credit: 0,
        description: "",
      },
    ]);
  };

  const removeLineRow = (index: number) => {
    if (isPosted || lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setErrorMsg(null);

    if (!isBalanced) {
      setErrorMsg(
        `Journal is unbalanced. Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
      );
      return;
    }

    try {
      setLoading(true);
      const payload = { ...metadata, lines };
      const method = journalId ? "PUT" : "POST";
      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save journal data.");
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
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 border rounded shadow-sm bg-white dark:bg-zinc-900"
    >
      {isPosted && (
        <div className="p-3 text-sm bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 rounded font-medium">
          🔒 View Only: This journal entry has been posted to the general ledger
          and cannot be edited.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          {errorMsg}
        </div>
      )}

      {/* HEADER INFO METADATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Entry Date *</label>
          <input
            type="date"
            required
            disabled={isPosted}
            value={metadata.entry_date}
            onChange={(e) =>
              setMetadata({ ...metadata, entry_date: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference</label>
          <input
            type="text"
            disabled={isPosted}
            value={metadata.reference}
            onChange={(e) =>
              setMetadata({ ...metadata, reference: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
            placeholder="e.g. JV-01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Memo description
          </label>
          <input
            type="text"
            disabled={isPosted}
            value={metadata.description}
            onChange={(e) =>
              setMetadata({ ...metadata, description: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
            placeholder="Transaction notes"
          />
        </div>
      </div>

      {/* MULTI-LINE ENTRY MATRIX GRID */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50 dark:bg-zinc-800 text-sm">
              <th className="p-2 w-1/4">GL Account *</th>
              {/* Conditional header label depending on module context type */}
              {journalType !== "general" && (
                <th className="p-2 w-1/4 capitalize">{journalType} Contact</th>
              )}

              <th className="p-2 w-32">Currency</th>
              <th className="p-2 w-28">Ex. Rate</th>
              <th className="p-2 w-1/6">Debit</th>
              <th className="p-2 w-1/6">Credit</th>
              <th className="p-2 w-32 bg-zinc-100/50 dark:bg-zinc-800/50">
                Amount ({baseCurrencyCode})
              </th>
              <th className="p-2">Description</th>
              {!isPosted && <th className="p-2 text-center w-12">Action</th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              // Calculate conversions for line-level visibility
              const rawAmount = line.debit > 0 ? line.debit : line.credit;
              const convertedBaseAmount =
                rawAmount * (line.exchange_rate || 1.0);
              const isDebitText = line.debit > 0;
              return (
                <tr key={index} className="border-b text-sm">
                  {/* GENERAL LEDGER SELECTOR */}
                  <td className="p-2">
                    <select
                      required
                      disabled={isPosted}
                      value={line.account_id}
                      onChange={(e) =>
                        handleLineChange(index, "account_id", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
                    >
                      <option value="">Select Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* SUB-LEDGER CONTACT SELECTION COLUMN (Renders dynamically if not general journal) */}
                  {journalType !== "general" && (
                    <td className="p-2">
                      <select
                        disabled={isPosted}
                        value={line.party_id || ""}
                        onChange={(e) =>
                          handleLineChange(index, "party_id", e.target.value)
                        }
                        className="border p-2 rounded w-full bg-transparent disabled:opacity-60 font-medium"
                      >
                        <option value="">No Contact (Direct Offset)</option>
                        {subEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {/* CURRENCY SELECTOR */}
                  <td className="p-2">
                    <select
                      disabled={isPosted}
                      value={line.currency_id}
                      onChange={(e) =>
                        handleLineChange(index, "currency_id", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
                    >
                      <option value="">Local Currency</option>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* EXCHANGE RATE VALUE */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      disabled={isPosted || !line.currency_id}
                      value={line.currency_id ? line.exchange_rate : 1.0}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "exchange_rate",
                          parseFloat(e.target.value) || 1.0,
                        )
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60 font-mono"
                    />
                  </td>

                  {/* DEBIT SPLIT */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isPosted}
                      value={line.debit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "debit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60 font-mono"
                    />
                  </td>

                  {/* CREDIT SPLIT */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isPosted}
                      value={line.credit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "credit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60 font-mono"
                    />
                  </td>

                  {/* ADDED: LINE BASE CURRENCY CALCULATION COLUMN */}
                  <td className="p-2 font-mono bg-zinc-50 dark:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400 vertical-middle align-middle font-medium">
                    {rawAmount > 0 ? (
                      <span
                        className={
                          isDebitText ? "text-emerald-600" : "text-blue-600"
                        }
                      >
                        {baseCurrencyCode}{" "}
                        {convertedBaseAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[10px] block text-zinc-400 italic">
                          {isDebitText ? "Converted Dr." : "Converted Cr."}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>

                  {/* NARRATION TEXT LINE */}
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Narration split notes"
                      disabled={isPosted}
                      value={line.description}
                      onChange={(e) =>
                        handleLineChange(index, "description", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent disabled:opacity-60"
                    />
                  </td>

                  {/* DELETION BUTTON TRIGGER */}
                  {!isPosted && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineRow(index)}
                        disabled={lines.length <= 2}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 px-2"
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
      </div>

      {/* FOOTER & CALCULATIONS TOTAL INDICATORS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800 p-4 rounded">
        {!isPosted ? (
          <button
            type="button"
            onClick={addLineRow}
            className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-2 rounded text-sm font-medium transition"
          >
            + Add Line Row
          </button>
        ) : (
          <div className="text-xs text-zinc-400 italic">
            Structural additions locked
          </div>
        )}

        <div className="text-sm space-y-1 font-mono text-right w-full sm:w-auto">
          <div>
            Total Debits:{" "}
            <span className="font-bold text-emerald-600">
              {baseCurrencyCode} {totalDebit.toFixed(2)}
            </span>
          </div>
          <div>
            Total Credits:{" "}
            <span className="font-bold text-blue-600">
              {baseCurrencyCode} {totalCredit.toFixed(2)}
            </span>
          </div>
          <div
            className={`text-xs ${isBalanced ? "text-emerald-500" : "text-red-500"}`}
          >
            {isBalanced ? "✓ Status: Balanced" : "✗ Status: Unbalanced"}
          </div>
        </div>
      </div>

      {/* SUBMIT ROW BUTTON */}
      {!isPosted && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !isBalanced}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-40 font-medium transition"
          >
            {loading ? "Processing..." : "Save Journal Voucher"}
          </button>
        </div>
      )}
    </form>
  );
}

/* const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isBalanced) {
      setErrorMsg(
        `Journal is unbalanced. Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
      );
      return;
    }

    try {
      setLoading(true);
      const payload = { ...metadata, lines };
      const method = journalId ? "PUT" : "POST";
      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save journal adjustments.");
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }; */

/* return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 border rounded shadow-sm bg-white dark:bg-zinc-900"
    >
      {isPosted && (
        <div className="p-3 text-sm bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 rounded font-medium">
          🔒 View Only: This journal entry has been posted to the general ledger
          and cannot be edited.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          {errorMsg}
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Entry Date *</label>
          <input
            type="date"
            required
            value={metadata.entry_date}
            onChange={(e) =>
              setMetadata({ ...metadata, entry_date: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference</label>
          <input
            type="text"
            value={metadata.reference}
            onChange={(e) =>
              setMetadata({ ...metadata, reference: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent"
            placeholder="e.g. JV-01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Memo description
          </label>
          <input
            type="text"
            value={metadata.description}
            onChange={(e) =>
              setMetadata({ ...metadata, description: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent"
            placeholder="General transaction notes"
          />
        </div>
      </div>


      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50 dark:bg-zinc-800 text-sm">
              <th className="p-2 w-2/5">GL Account *</th>
              <th className="p-2 w-1/5">Debit</th>
              <th className="p-2 w-1/5">Credit</th>
              <th className="p-2 w-1/5">Line Description</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-b text-sm">
                <td className="p-2">
                  <select
                    required
                    value={line.account_id}
                    onChange={(e) =>
                      handleLineChange(index, "account_id", e.target.value)
                    }
                    className="border p-2 rounded w-full bg-transparent"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.debit || ""}
                    onChange={(e) =>
                      handleLineChange(
                        index,
                        "debit",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="border p-2 rounded w-full bg-transparent"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.credit || ""}
                    onChange={(e) =>
                      handleLineChange(
                        index,
                        "credit",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="border p-2 rounded w-full bg-transparent"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Line narration"
                    value={line.description}
                    onChange={(e) =>
                      handleLineChange(index, "description", e.target.value)
                    }
                    className="border p-2 rounded w-full bg-transparent"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeLineRow(index)}
                    disabled={lines.length <= 2}
                    className="text-red-500 hover:text-red-700 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800 p-4 rounded">
        <button
          type="button"
          onClick={addLineRow}
          className="bg-zinc-200 dark:bg-zinc-700 px-4 py-2 rounded text-sm font-medium"
        >
          + Add Line Row
        </button>

        <div className="text-sm space-y-1 font-mono text-right w-full sm:w-auto">
          <div>
            Total Debits:{" "}
            <span className="font-bold text-emerald-600">
              ${totalDebit.toFixed(2)}
            </span>
          </div>
          <div>
            Total Credits:{" "}
            <span className="font-bold text-blue-600">
              ${totalCredit.toFixed(2)}
            </span>
          </div>
          <div
            className={`text-xs ${isBalanced ? "text-emerald-500" : "text-red-500"}`}
          >
            {isBalanced ? "✓ Status: Balanced" : "✗ Status: Unbalanced"}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !isBalanced}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-40 font-medium"
        >
          {loading ? "Processing..." : "Save Journal Voucher"}
        </button>
      </div>
    </form>
  ); */

/* "use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

type Party = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  slug: string;

  journalId?: string;

  journalType: "customer" | "supplier" | "item" | "general";

  apiBase: string;

  redirectPath: string;
};

export default function JournalForm({
  slug,
  journalId,
  journalType,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  const [parties, setParties] = useState<Party[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    entry_date: "",
    party_id: "",
    account_id: "",
    amount: "",
    type: "PAYMENT",
    reference: "",
    description: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const partyType =
          journalType === "customer"
            ? "customer"
            : journalType === "supplier"
              ? "supplier"
              : null;

        let partyData = { data: [] };

        if (partyType) {
          const partyRes = await fetch(`/api/parties?type=${partyType}`);
          partyData = await partyRes.json();
        }

        // ✅ STEP 1: Route to your lightweight lookup API with all=true
        const accountRes = await fetch(`/api/lookups/gl-accounts?all=true`);
        const accountData = await accountRes.json();

        setParties(partyData.data || []);

        // ✅ STEP 2: Use accountData.data because your lookup API bundles rows in a .data array object!
        setAccounts(accountData.data || []);

        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);
          const data = await res.json();

          const partyLine = data.lines.find(
            (line: { party_id?: string }) => line.party_id,
          );
          const offsetLine = data.lines.find(
            (line: { party_id?: string }) => !line.party_id,
          );

          setForm({
            entry_date: data.entry_date || "",
            party_id: partyLine?.party_id || "",
            account_id: offsetLine?.account_id || "",
            amount: String(partyLine?.debit || partyLine?.credit || ""),
            type: partyLine?.debit > 0 ? "PAYMENT" : "RECEIPT",
            reference: data.reference || "",
            description: data.description || "",
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [journalId, apiBase, journalType]);

  // useEffect(() => {
  //   const loadData = async () => {
  //     try { 
  //       const partyType =
  //         journalType === "customer"
  //           ? "customer"
  //           : journalType === "supplier"
  //             ? "supplier"
  //             : null;


  //       let partyData = { data: [] };

  //       if (partyType) {
  //         const partyRes = await fetch(`/api/parties?type=${partyType}`);

  //         partyData = await partyRes.json();
  //       }

  //       const accountRes = await fetch(`/api/finance/accounts`);

  //       // const partyData = await partyRes.json();

  //       const accountData = await accountRes.json();

  //       setParties(partyData.data || []);
  //       setAccounts(accountData.data || []);

  //       if (journalId) {
  //         const res = await fetch(`${apiBase}/${journalId}`);

  //         const data = await res.json();

  //         const partyLine = data.lines.find(
  //           (line: { party_id?: string }) => line.party_id,
  //         );

  //         const offsetLine = data.lines.find(
  //           (line: { party_id?: string }) => !line.party_id,
  //         );

  //         setForm({
  //           entry_date: data.entry_date || "",
  //           party_id: partyLine?.party_id || "",
  //           account_id: offsetLine?.account_id || "",
  //           amount: String(partyLine?.debit || partyLine?.credit || ""),
  //           type: partyLine?.debit > 0 ? "PAYMENT" : "RECEIPT",
  //           reference: data.reference || "",
  //           description: data.description || "",
  //         });
  //       }
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };

  //   loadData();
  // }, [journalId, apiBase, journalType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

      const method = journalId ? "PUT" : "POST";

      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed to save journal");
      }

      router.push(redirectPath);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 rounded shadow dark:shadow-white bg-white dark:bg-slate-900 text-black dark:text-white"
    >
      <div className="grid grid-cols-2 gap-4">

        <div>
          <label className="block text-sm mb-1">Entry Date *</label>

          <input
            type="date"
            required
            value={form.entry_date}
            onChange={(e) =>
              setForm({
                ...form,
                entry_date: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>


        <div>
          <label className="block text-sm mb-1">Type *</label>

          <select
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          >
            <option value="PAYMENT">Payment</option>

            <option value="RECEIPT">Receipt</option>
          </select>
        </div>



        {journalType !== "general" && (
          <div>
            <label className="block text-sm mb-1">
              {journalType === "customer"
                ? "Customer"
                : journalType === "supplier"
                  ? "Supplier"
                  : "Party"}

            </label>

            <select
              required
              value={form.party_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  party_id: e.target.value,
                })
              }
              className="border p-2 rounded w-full"
            >
              <option value="">Select</option>

              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Offset Account</label>

          <select
            required
            value={form.account_id}
            onChange={(e) =>
              setForm({
                ...form,
                account_id: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          >
            <option value="">Select</option>

            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Amount *</label>

          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm({
                ...form,
                amount: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>


        <div>
          <label className="block text-sm mb-1">Reference</label>

          <input
            type="text"
            value={form.reference}
            onChange={(e) =>
              setForm({
                ...form,
                reference: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1">Description</label>

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
            rows={4}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Journal"}
        </button>
      </div>
    </form>
  );
} */

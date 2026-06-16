//  app/components/finance/journals/JournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  transaction_type: "gl_no" | "customer" | "supplier";
  account_id: string; // Destination/Primary Account ID
  party_id: string; // Customer or Supplier reference ID if applicable
  currency_id: string;
  exchange_rate: number;
  debit: number;
  credit: number;
  description: string;
  balancing_account_id: string; // Instant line offset balancing feature
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
  balancing_account_id?: string | null;
}

interface ApiResponsePayload {
  journal: {
    entry_date?: string;
    reference?: string | null;
    description?: string | null;
    is_posted?: boolean;
    journal_no?: string;
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
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<SubEntity[]>([]);
  const [suppliers, setSuppliers] = useState<SubEntity[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    journal_no: "",//GJ" + Math.floor(1000 + Math.random() * 9000), // Visual match for placeholder
  });

  const [lines, setLines] = useState<JournalLineRow[]>([
    {
      transaction_type: "gl_no",
      account_id: "",
      party_id: "",
      currency_id: "",
      exchange_rate: 1.0,
      debit: 0,
      credit: 0,
      description: "",
      balancing_account_id: "",
    },
  ]);

  // Combined Conversion-Based Balancing Logic
  const totalDebit = lines.reduce(
    (sum, line) => sum + Number(line.debit || 0) * (line.exchange_rate || 1.0),
    0,
  );

  const totalCredit = lines.reduce(
    (sum, line) => sum + Number(line.credit || 0) * (line.exchange_rate || 1.0),
    0,
  );

  // If a line features an inline balancing offset account, it internally satisfies its own double entry status
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [glRes, curRes, custRes, suppRes] = await Promise.all([
          fetch(`/api/lookups/gl-accounts?all=true`),
          fetch(`/api/parties/currencies`),
          fetch(`/api/lookups/customers`),
          fetch(`/api/lookups/suppliers`),
        ]);

        if (glRes.ok) setGlAccounts((await glRes.json()).data || []);
        if (curRes.ok) setCurrencies((await curRes.json()) || []);
        if (custRes.ok) setCustomers((await custRes.json()).data || []);
        if (suppRes.ok) setSuppliers((await suppRes.json()).data || []);

        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);
          const data: ApiResponsePayload = await res.json();

          setIsPosted(!!data.journal.is_posted);
          setMetadata({
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
            journal_no: data.journal.journal_no || "",
          });

          if (data.lines && data.lines.length > 0) {
            setLines(
              data.lines.map((l) => {
                let txType: "gl_no" | "customer" | "supplier" = "gl_no";
                if (l.customer_id) txType = "customer";
                if (l.supplier_id) txType = "supplier";

                return {
                  transaction_type: txType,
                  account_id: l.account_id,
                  party_id: l.customer_id || l.supplier_id || "",
                  currency_id: l.currency_id || "",
                  exchange_rate: Number(l.exchange_rate || 1.0),
                  debit: Number(l.debit || 0),
                  credit: Number(l.credit || 0),
                  description: l.description || "",
                  balancing_account_id: l.balancing_account_id || "",
                };
              }),
            );
          }
        }
      } catch (err) {
        console.error("Error setting up lookup dictionaries:", err);
      }
    };
    loadLookups();
  }, [journalId, apiBase]);

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
    }

    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }

    if (field === "currency_id") {
      const selectedCurrency = currencies.find((c) => c.id === value);
      updated[index].exchange_rate = selectedCurrency
        ? Number(selectedCurrency.exchange_rate)
        : 1.0;
    }

    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines([
      ...lines,
      {
        transaction_type: "gl_no",
        account_id: "",
        party_id: "",
        currency_id: "",
        exchange_rate: 1.0,
        debit: 0,
        credit: 0,
        description: "",
        balancing_account_id: "",
      },
    ]);
  };

  const removeLineRow = (index: number) => {
    if (isPosted || lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const getTargetAccountName = (line: JournalLineRow) => {
    if (line.transaction_type === "gl_no") {
      return glAccounts.find((a) => a.id === line.account_id)?.name || "";
    } else if (line.transaction_type === "customer") {
      return customers.find((c) => c.id === line.party_id)?.name || "";
    } else if (line.transaction_type === "supplier") {
      return suppliers.find((s) => s.id === line.party_id)?.name || "";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setErrorMsg(null);

    if (!isBalanced) {
      setErrorMsg(
        `Journal entries must match base calculation limits. Discrepancy: ${difference.toFixed(2)}`,
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
        throw new Error(
          errData.error || "Failed to finalize journal ledger context.",
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
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 bg-zinc-100 p-4 rounded text-xs text-zinc-800"
    >
      {errorMsg && (
        <div className="p-2 bg-red-200 text-red-800 rounded font-medium">
          {errorMsg}
        </div>
      )}

      {/* HEADER METADATA CONTAINER PANEL */}
      <div className="flex flex-wrap items-center gap-6 bg-white p-3 rounded shadow-sm border border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600">Journal No.</span>
          <input
            type="text"
            readOnly
            className="border bg-zinc-50 p-1 px-2 rounded w-32 font-bold tracking-wide outline-none text-zinc-700"
            value={metadata.journal_no}
          />
        </div>
        {/* <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600">Select Template</span>
          <select className="border p-1 rounded bg-white outline-none min-w-[140px]">
            <option>--New Template--</option>
          </select>
        </div> */}
      </div>

      {/* TRANSACTION MATRIX WORKSPACE */}
      <div className="overflow-x-auto bg-white rounded border border-zinc-200 shadow-sm">
        <table className="w-full border-collapse text-left min-w-[1200px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold select-none shadow-sm">
              <th className="p-2 w-28">Posting Date</th>
              <th className="p-2 w-32">Doc. Type</th>
              <th className="p-2 w-24">Doc. No.</th>
              <th className="p-2 w-36">Transaction Type</th>
              <th className="p-2 w-44">Account No.</th>
              <th className="p-2">Name</th>
              <th className="p-2 w-20">Currency</th>
              <th className="p-2 w-24">Debit</th>
              <th className="p-2 w-24">Credit</th>
              <th className="p-2 w-16 text-center">Cnv. Rate</th>
              <th className="p-2 w-28 bg-zinc-50/50">Converted Amount</th>
              <th className="p-2 w-40">Balancing G/L No.</th>
              <th className="p-2 w-44">Balancing G/L Name</th>
              <th className="p-2 w-8 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {lines.map((line, index) => {
              const localAmount = line.debit > 0 ? line.debit : line.credit;
              const convertedValue = localAmount * line.exchange_rate;

              return (
                <tr
                  key={index}
                  className="hover:bg-zinc-50/50 transition-colors"
                >
                  {/* POSTING DATE */}
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={metadata.entry_date}
                      onChange={(e) =>
                        setMetadata({ ...metadata, entry_date: e.target.value })
                      }
                      className="w-full border p-1 rounded outline-none input shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white "
                      
                    />
                  </td>

                  {/* DOCUMENT TYPE */}
                  <td className="p-1.5">
                    <select className="w-full border p-1 rounded bg-white outline-none">
                      <option>General Journal</option>
                      <option>Payment</option>
                      <option>Refund</option>
                    </select>
                  </td>

                  {/* DOCUMENT NO */}
                  <td className="p-1.5">
                    <input
                      type="text"
                      placeholder="e.g. XYZ"
                      value={metadata.reference}
                      onChange={(e) =>
                        setMetadata({ ...metadata, reference: e.target.value })
                      }
                      className="w-full border p-1 rounded outline-none tracking-wide text-center uppercase"
                    />
                  </td>

                  {/* TRANSACTION TYPE DROP-DOWN */}
                  <td className="p-1.5">
                    <select
                      value={line.transaction_type}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "transaction_type",
                          e.target.value,
                        )
                      }
                      className="w-full border p-1 rounded bg-white outline-none font-semibold text-zinc-700"
                    >
                      <option value="gl_no">G/L No.</option>
                      <option value="customer">Customer</option>
                      <option value="supplier">Supplier</option>
                    </select>
                  </td>

                  {/* TARGET SELECTION LOOKUP COLUMN */}
                  <td className="p-1.5">
                    {line.transaction_type === "gl_no" && (
                      <select
                        value={line.account_id}
                        onChange={(e) =>
                          handleLineChange(index, "account_id", e.target.value)
                        }
                        className="w-full border p-1 rounded bg-white outline-none"
                      >
                        <option value="">Select G/L Account</option>
                        {glAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code}
                          </option>
                        ))}
                      </select>
                    )}
                    {line.transaction_type === "customer" && (
                      <select
                        value={line.party_id}
                        onChange={(e) =>
                          handleLineChange(index, "party_id", e.target.value)
                        }
                        className="w-full border p-1 rounded bg-white outline-none"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code || c.name.substring(0, 5).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                    {line.transaction_type === "supplier" && (
                      <select
                        value={line.party_id}
                        onChange={(e) =>
                          handleLineChange(index, "party_id", e.target.value)
                        }
                        className="w-full border p-1 rounded bg-white outline-none"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code || s.name.substring(0, 5).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* RESOLVED ACCOUNT NAME DISPLAY */}
                  <td className="p-1.5 text-zinc-500 max-w-[180px] truncate select-none">
                    {getTargetAccountName(line) || (
                      <span className="text-zinc-300 font-normal">
                        No account bound
                      </span>
                    )}
                  </td>

                  {/* CURRENCY CODES */}
                  <td className="p-1.5">
                    <select
                      value={line.currency_id}
                      onChange={(e) =>
                        handleLineChange(index, "currency_id", e.target.value)
                      }
                      className="w-full border p-1 rounded bg-white text-center font-bold outline-none"
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

                  {/* DEBIT SPLIT VALUE */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "debit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full border p-1 rounded outline-none text-right font-mono"
                    />
                  </td>

                  {/* CREDIT SPLIT VALUE */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={line.credit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "credit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full border p-1 rounded outline-none text-right font-mono"
                    />
                  </td>

                  {/* CONVERSION FACTOR CONTEXT */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      step="0.000001"
                      disabled={!line.currency_id}
                      value={line.currency_id ? line.exchange_rate : 1}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "exchange_rate",
                          parseFloat(e.target.value) || 1.0,
                        )
                      }
                      className="w-full border p-1 rounded outline-none text-center bg-zinc-50 font-mono disabled:opacity-50"
                    />
                  </td>

                  {/* DYNAMIC READ-ONLY CALCULATED BASE AMOUNT */}
                  <td className="p-1.5 text-right font-mono bg-zinc-50/60 text-zinc-600 font-semibold select-none pr-3">
                    {convertedValue > 0 ? convertedValue.toFixed(2) : "0.00"}
                  </td>

                  {/* INLINE BALANCING OFFSET ACCOUNT */}
                  <td className="p-1.5">
                    <select
                      value={line.balancing_account_id}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "balancing_account_id",
                          e.target.value,
                        )
                      }
                      className="w-full border p-1 rounded bg-white outline-none text-zinc-700"
                    >
                      <option value="">Select Balance G/L</option>
                      {glAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* BALANCING ACCOUNT DESCRIPTION NAME */}
                  <td className="p-1.5 text-zinc-500 max-w-[150px] truncate select-none">
                    {glAccounts.find((a) => a.id === line.balancing_account_id)
                      ?.name || ""}
                  </td>

                  {/* ACTIONS DISMISS ICON */}
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      disabled={lines.length === 1}
                      onClick={() => removeLineRow(index)}
                      className="w-5 h-5 bg-zinc-100 hover:bg-red-100 hover:text-red-600 rounded text-zinc-400 font-bold transition flex items-center justify-center disabled:opacity-20"
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

      {/* MATRIX ACTIONS BAR & CONVERTED TRACKING FOOTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-white rounded border border-zinc-200">
        <button
          type="button"
          onClick={addLineRow}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold transition shadow-sm"
        >
          <span className="text-base font-bold leading-none">+</span> Add Row
          Line
        </button>

        <div className="flex items-center gap-6 font-mono text-zinc-600 bg-zinc-50 border p-2 px-4 rounded font-bold">
          <div>
            Difference:{" "}
            <span
              className={`${isBalanced ? "text-emerald-600" : "text-red-500"}`}
            >
              {difference.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS BAR */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !isBalanced}
          className="px-5 py-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded shadow-sm disabled:opacity-40 transition"
        >
          {loading ? "Posting..." : "Post Journal"}
        </button>
        <button
          type="button"
          onClick={() => router.push(redirectPath)}
          className="px-5 py-1.5 bg-white hover:bg-zinc-50 border rounded font-semibold text-zinc-700 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* "use client";

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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50 dark:bg-zinc-800 text-sm">
              <th className="p-2 w-1/4">GL Account *</th>

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
} */

//  app/components/finance/journals/ItemJournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// --- Lookups & Type Definitions ---
type Account = {
  id: string;
  code: string;
  name: string;
};

type Currency = {
  id: string;
  code: string;
  name: string;
  is_base: boolean;
};

type InventoryItem = {
  id: string;
  code: string;
  name: string;
  uom: string;
};

type Warehouse = {
  id: string;
  name: string;
};

type StorageLocation = {
  id: string;
  warehouse_id: string;
  name: string;
};

// Modeled explicitly after your legacy system's tabular requirements
type ItemJournalLineRow = {
  transaction_type: "Positive Entry" | "Negative Entry";
  item_id: string;
  item_description: string;
  warehouse_id: string;
  location_id: string;
  quantity: number;
  uom: string;
  cost_per_unit: number;
  amount: number;
  account_id: string; // The selected G/L Offset Account
};

// Define what a raw database row looks like coming back from the API
interface RawBackendJournalLine {
  id: string;
  account_id: string;
  debit: string | number;
  credit: string | number;
  item_id?: string | null;
  item_description?: string | null;
  warehouse_id?: string | null;
  location_id?: string | null;
  quantity?: string | number | null;
  uom?: string | null;
  cost_per_unit?: string | number | null;
}

interface ApiResponsePayload {
  journal: {
    entry_date?: string;
    reference?: string | null;
    description?: string | null;
    is_posted?: boolean;
  };
  lines?: RawBackendJournalLine[]; // 🌟 Replaced any[] with our strict interface
}

type Props = {
  slug: string;
  journalId?: string;
  apiBase: string;
  redirectPath: string;
};

export default function ItemJournalForm({
  journalId,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  // Lookup data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Status states
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false); // 🔒 Toggles view-only mode if posted
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Header metadata fields
  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
  });

  // Dynamic tabular grid matrix lines initialization
  const [lines, setLines] = useState<ItemJournalLineRow[]>([
    {
      transaction_type: "Positive Entry",
      item_id: "",
      item_description: "",
      warehouse_id: "",
      location_id: "",
      quantity: 0,
      uom: "Pcs",
      cost_per_unit: 0,
      amount: 0,
      account_id: "",
    },
  ]);

  // --- Initial Data Hydration ---
  useEffect(() => {
    const loadFormLookups = async () => {
      try {
        setLoading(true);
        // 1. Fetch cross-cutting financial and inventory dictionaries
        const [accountRes, itemRes, whRes, currencyRes] =
          await Promise.all([
            fetch(`/api/lookups/gl-accounts?all=true`),
            fetch(`/api/lookups/items`),
            fetch(`/api/lookups/warehouses`),
            // fetch(`/api/lookups/locations`),
            fetch(`/api/parties/currencies`),
          ]);
          // locRes, 

        const [accountData, itemData, whData,  currencyData] =
          await Promise.all([
            accountRes.json(),
            itemRes.json(),
            whRes.json(),
            currencyRes.ok ? currencyRes.json() : Promise.resolve([]),
          ]);
          // locData, locRes?.json(),

        setAccounts(accountData.data || []);
        setItems(itemData.data || []);
        setWarehouses(whData.data || []);
        // setLocations(locData.data || []);
        setCurrencies(currencyData || []);

        // 2. Hydrate data fields if working with an existing Voucher ID (Edit / View Mode)
        if (journalId) {
          const detailRes = await fetch(`${apiBase}/${journalId}`);
          if (!detailRes.ok)
            throw new Error("Failed to pull individual voucher data records");

          const data: ApiResponsePayload = await detailRes.json();
          setIsPosted(!!data.journal.is_posted);

          setMetadata({
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
          });

          if (data.lines && data.lines.length > 0) {
            const structuralLines: ItemJournalLineRow[] = [];

            data.lines.forEach((l: RawBackendJournalLine) => {
              // 🌟 Replaced l: any
              if (l.item_id) {
                const isPositive = Number(l.debit) > 0;

                // Find matching offset account id within the database result payload array
                const associatedOffset = data.lines?.find(
                  (
                    o: RawBackendJournalLine, // 🌟 Replaced o: any
                  ) =>
                    o.id !== l.id &&
                    Math.abs(Number(o.debit) - Number(l.credit)) < 0.01,
                );

                structuralLines.push({
                  transaction_type: isPositive
                    ? "Positive Entry"
                    : "Negative Entry",
                  item_id: l.item_id,
                  item_description: l.item_description || "",
                  warehouse_id: l.warehouse_id || "",
                  location_id: l.location_id || "",
                  quantity: Number(l.quantity || 0),
                  uom: l.uom || "Pcs",
                  cost_per_unit: Number(l.cost_per_unit || 0),
                  amount: isPositive ? Number(l.debit) : Number(l.credit),
                  account_id:
                    l.account_id || associatedOffset?.account_id || "",
                });
              }
            });

            if (structuralLines.length > 0) {
              setLines(structuralLines);
            }
          }
        }
      } catch (err) {
        console.error(
          "Critical Exception caught while loading item journal layouts:",
          err,
        );
        setErrorMsg("Failed to fully synchronize lookups and data elements.");
      } finally {
        setLoading(false);
      }
    };

    loadFormLookups();
  }, [journalId, apiBase]);

  // Extract base currency symbol
  const baseCurrencyCode = currencies.find((c) => c.is_base)?.code || "GBP";

  // Compute absolute cumulative value summary ($Amount = Qty * Unit Cost)
  const totalBatchValuation = lines.reduce(
    (sum, line) => sum + (line.amount || 0),
    0,
  );

  // --- Grid Matrix Mutator Event Handlers ---
  const handleLineChange = <K extends keyof ItemJournalLineRow>(
    index: number,
    field: K,
    value: ItemJournalLineRow[K], // 🌟 Resolves perfectly to either string or number based on the field key
  ) => {
    if (isPosted) return;
    const updated = [...lines];

    if (field === "item_id") {
      const selectedItem = items.find((i) => i.id === (value as string));
      updated[index].item_id = value as string;
      updated[index].item_description = selectedItem ? selectedItem.name : "";
      updated[index].uom = selectedItem ? selectedItem.uom : "Pcs";
    } else {
      // Safely assign the dynamic property using a clean shallow assignment
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }

    // Reactively recompute running subtotals immediately upon quantitative data shifts
    if (field === "quantity" || field === "cost_per_unit") {
      updated[index].amount =
        Number(updated[index].quantity || 0) *
        Number(updated[index].cost_per_unit || 0);
    }

    setLines(updated);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines([
      ...lines,
      {
        transaction_type: "Positive Entry",
        item_id: "",
        item_description: "",
        warehouse_id: "",
        location_id: "",
        quantity: 0,
        uom: "Pcs",
        cost_per_unit: 0,
        amount: 0,
        account_id: "",
      },
    ]);
  };

  const removeLineRow = (index: number) => {
    if (isPosted || lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // --- Document Save Action ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setErrorMsg(null);

    // Form Client side validation rules
    const hasInvalidEntries = lines.some(
      (l) =>
        !l.item_id ||
        !l.warehouse_id ||
        !l.location_id ||
        l.quantity <= 0 ||
        !l.account_id,
    );

    if (hasInvalidEntries) {
      setErrorMsg(
        "Validation Error: Ensure Item, Warehouse, Bin Location, Offset Account and positive quantities are populated.",
      );
      return;
    }

    try {
      setLoading(true);
      // Explicit payload bundle highlighting contextual flag adjustments
      const payload = {
        ...metadata,
        is_item_journal: true,
        lines,
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
          errData.error ||
            "Server engine failed to save item journal entry parameters.",
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
      className="space-y-6 p-6 border rounded shadow-sm bg-white dark:bg-zinc-900"
    >
      {/* Dynamic View Restrictions banner check */}
      {isPosted && (
        <div className="p-3 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 rounded font-medium">
          🔒 View Only: This inventory adjustment document batch has been
          officially posted and is locked from inline modifications.
        </div>
      )}

      {errorMsg && (
        <div className="p-3 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          {errorMsg}
        </div>
      )}

      {/* HEADER INFO FIELD CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Posting Date *
          </label>
          <input
            type="date"
            required
            disabled={isPosted}
            value={metadata.entry_date}
            onChange={(e) =>
              setMetadata({ ...metadata, entry_date: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent text-sm focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Document No. / Reference
          </label>
          <input
            type="text"
            disabled={isPosted}
            value={metadata.reference}
            onChange={(e) =>
              setMetadata({ ...metadata, reference: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent text-sm focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            placeholder="e.g. ITEM-JV-0024"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Memo Narration Description
          </label>
          <input
            type="text"
            disabled={isPosted}
            value={metadata.description}
            onChange={(e) =>
              setMetadata({ ...metadata, description: e.target.value })
            }
            className="border p-2 rounded w-full bg-transparent text-sm focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            placeholder="e.g. Mid-year inventory stock reconciliation adjustments"
          />
        </div>
      </div>

      {/* DATA INPUT MATRIX CONTROL SHEET */}
      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left border-collapse min-w-[1250px]">
          <thead>
            <tr className="border-b bg-zinc-50 dark:bg-zinc-800/60 text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-300">
              <th className="p-3 w-44">Transaction Type</th>
              <th className="p-3 w-40">Item No *</th>
              <th className="p-3 min-w-[180px]">Item Description</th>
              <th className="p-3 w-44">Warehouse *</th>
              <th className="p-3 w-44">Location *</th>
              <th className="p-3 w-24 text-right">Qty *</th>
              <th className="p-3 w-20 text-center">UOM</th>
              <th className="p-3 w-32 text-right">Cost Per Unit</th>
              <th className="p-3 w-32 text-right">Amount</th>
              <th className="p-3 w-52">G/L Offset Account *</th>
              {!isPosted && <th className="p-3 text-center w-12">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lines.map((line, index) => {
              // Context-driven filtering targeting location scopes mapping to the distinct selected warehouse row
              const contextLocations = locations.filter(
                (l) => l.warehouse_id === line.warehouse_id,
              );

              return (
                <tr
                  key={index}
                  className="text-sm align-middle hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20"
                >
                  {/* TRANSACTION TYPE SELECTION */}
                  <td className="p-2">
                    <select
                      disabled={isPosted}
                      value={line.transaction_type}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "transaction_type",
                          e.target.value as "Positive Entry" | "Negative Entry",
                        )
                      }
                      className="border p-2 rounded w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="Positive Entry">Positive Entry (+)</option>
                      <option value="Negative Entry">Negative Entry (-)</option>
                    </select>
                  </td>

                  {/* MASTER ITEM LINK SELECTOR */}
                  <td className="p-2">
                    <select
                      required
                      disabled={isPosted}
                      value={line.item_id}
                      onChange={(e) =>
                        handleLineChange(index, "item_id", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="">Select Item</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.code}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* ITEM NARRATIVE DISPLAY PROFILE */}
                  <td className="p-2">
                    <input
                      type="text"
                      disabled
                      value={line.item_description}
                      className="border p-2 rounded w-full bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 text-xs truncate"
                      placeholder="No item configured"
                    />
                  </td>

                  {/* WAREHOUSE SELECTOR */}
                  <td className="p-2">
                    <select
                      required
                      disabled={isPosted}
                      value={line.warehouse_id}
                      onChange={(e) => {
                        handleLineChange(index, "warehouse_id", e.target.value);
                        handleLineChange(index, "location_id", ""); // Clear location child block down sequence cascading adjustments
                      }}
                      className="border p-2 rounded w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="">Select Whse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* CASCADING STORAGE BIN / LOCATION SELECTOR */}
                  <td className="p-2">
                    <select
                      required
                      disabled={isPosted || !line.warehouse_id}
                      value={line.location_id}
                      onChange={(e) =>
                        handleLineChange(index, "location_id", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="">Select Location</option>
                      {contextLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* RECORD QUANTITY INPUT */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0.000001"
                      step="any"
                      required
                      disabled={isPosted}
                      value={line.quantity || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="border p-2 rounded w-full text-right font-mono text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                      placeholder="0"
                    />
                  </td>

                  {/* UOM TEXT TRACK SIGNPOST */}
                  <td className="p-2 text-center font-medium text-xs text-zinc-500 dark:text-zinc-400">
                    {line.uom}
                  </td>

                  {/* COST PER UNIT METRIC INPUT */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      required
                      disabled={isPosted}
                      value={line.cost_per_unit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "cost_per_unit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="border p-2 rounded w-full text-right font-mono text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                      placeholder="0.00"
                    />
                  </td>

                  {/* CALCULATED VALUE DISPLAY FIELD ($AMOUNT = QTY * COST) */}
                  <td className="p-2 text-right font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {line.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* COMPLEMENTARY BALANCING G/L ACCOUNT OFFSET SELECTOR */}
                  <td className="p-2">
                    <select
                      required
                      disabled={isPosted}
                      value={line.account_id}
                      onChange={(e) =>
                        handleLineChange(index, "account_id", e.target.value)
                      }
                      className="border p-2 rounded w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="">Select Offset Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* ACTION CONTROLS */}
                  {!isPosted && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineRow(index)}
                        disabled={lines.length <= 1}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-20 transition px-2"
                        title="Remove Row"
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

      {/* FOOTER BATCH VALUATION SUMMARY CONTAINER */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
        {!isPosted ? (
          <button
            type="button"
            onClick={addLineRow}
            className="text-xs bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded font-medium transition shadow-sm"
          >
            + Add Adjustment Row
          </button>
        ) : (
          <div className="text-xs text-zinc-400 italic">
            Matrix structural updates locked
          </div>
        )}

        <div className="text-sm font-mono text-zinc-600 dark:text-zinc-400 text-right">
          Total Batch Operational Valuation:{" "}
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 pl-1">
            {baseCurrencyCode}{" "}
            {totalBatchValuation.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* ACTIONS TRIGGER SUBMIT STRIP */}
      {!isPosted && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-6 py-2.5 rounded text-sm font-medium transition shadow-sm disabled:opacity-40"
          >
            {loading
              ? "Processing Ledger Updates..."
              : "Save Item Journal Adjustments"}
          </button>
        </div>
      )}
    </form>
  );
}

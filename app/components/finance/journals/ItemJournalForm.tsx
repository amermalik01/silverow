//  app/components/finance/journals/ItemJournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemLookupModal, {
  ItemLookupRecord,
} from "../../shared/modals/ItemLookupModal";
import StockAllocationModal, {
  StockAllocationRecord,
} from "../../shared/modals/StockAllocationModal";

// --- Lookups & Type Definitions ---
interface Account {
  id: string;
  code: string;
  name: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  is_base: boolean;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StorageLocation {
  id: string;
  warehouse_id: string;
  title: string;
  code: string | null;
}
interface ItemJournalLineRow {
  transaction_type: "Positive Entry" | "Negative Entry";
  item_id: string;
  item_code: string;
  item_description: string;
  warehouse_id: string;
  location_id: string;
  quantity: number;
  uom: string;
  cost_per_unit: number;
  amount: number;
  account_id: string;

  allocations: StockAllocationRecord[];
  is_allocated: boolean;
}

// Define what a raw database row looks like coming back from the API
interface RawBackendJournalLine {
  id: string;
  account_id: string;
  debit: string | number;
  credit: string | number;
  item_id?: string | null;
  item_code?: string | null;
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
  lines?: RawBackendJournalLine[];
}

interface Props {
  slug: string;
  journalId?: string;
  apiBase: string;
  redirectPath: string;
}

interface ItemJournalFormProps {
  journalId?: string;       // Present if editing an existing voucher
  initialStatus?: boolean;  // is_posted flag from DB
  onPostSuccess?: () => void;
}

export default function ItemJournalForm({
  journalId,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  // Lookup data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // 🌟 Dynamic state tracking reactive location caches per-row unique mappings
  // Formatted structure as: Record<RowIndex, StorageLocation[]>
  const [rowLocationsCache, setRowLocationsCache] = useState<
    Record<number, StorageLocation[]>
  >({});

  // 🌟 Modal UI Interaction Tracking Flags
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalRowIndex, setActiveModalRowIndex] = useState<number | null>(
    null,
  );

  // State to control the visibility of the Stock Allocation Modal
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  // Tracks which row index we are currently configuring allocations for
  const [activeAllocationRowIndex, setActiveAllocationRowIndex] = useState<
    number | null
  >(null);

  const openStockAllocationModal = (index: number) => {
    setActiveAllocationRowIndex(index);
    setIsAllocationModalOpen(true);
  };

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
      item_code: "",
      item_description: "",
      warehouse_id: "",
      location_id: "",
      quantity: 0,
      uom: "Pcs",
      cost_per_unit: 0,
      amount: 0,
      account_id: "",
      allocations: [],
      is_allocated: false,
    },
  ]);

  // --- Initial Dictionaries Load Hydration ---
  useEffect(() => {
    const loadCoreLookups = async () => {
      try {
        setLoading(true);
        const [accountRes, whRes, currencyRes] = await Promise.all([
          fetch(`/api/lookups/gl-accounts?all=true`),
          fetch(`/api/lookups/warehouses`),
          fetch(`/api/parties/currencies`),
        ]);

        const [accountData, whData, currencyData] = await Promise.all([
          accountRes.json(),
          whRes.json(),
          currencyRes.ok ? currencyRes.json() : Promise.resolve([]),
        ]);

        setAccounts(accountData.data || []);
        setWarehouses(whData.data || []);
        setCurrencies(currencyData || []);

        // Rehydrate transactional record variables if an ID exists
        if (journalId) {
          const detailRes = await fetch(`${apiBase}/${journalId}`);
          if (!detailRes.ok)
            throw new Error("Failed to load historical record voucher context");

          const data: ApiResponsePayload = await detailRes.json();
          setIsPosted(!!data.journal.is_posted);

          setMetadata({
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
          });

          if (data.lines && data.lines.length > 0) {
            const structuralLines: ItemJournalLineRow[] = [];

            for (let i = 0; i < data.lines.length; i++) {
              const l = data.lines[i];
              if (l.item_id) {
                const isPositive = Number(l.debit) > 0;
                const associatedOffset = data.lines.find(
                  (o) =>
                    o.id !== l.id &&
                    Math.abs(Number(o.debit) - Number(l.credit)) < 0.01,
                );

                structuralLines.push({
                  transaction_type: isPositive
                    ? "Positive Entry"
                    : "Negative Entry",
                  item_id: l.item_id,
                  item_code: l.item_code || "",
                  item_description: l.item_description || "",
                  warehouse_id: l.warehouse_id || "",
                  location_id: l.location_id || "",
                  quantity: Number(l.quantity || 0),
                  uom: l.uom || "Pcs",
                  cost_per_unit: Number(l.cost_per_unit || 0),
                  amount: isPositive ? Number(l.debit) : Number(l.credit),
                  account_id:
                    l.account_id || associatedOffset?.account_id || "",
                  allocations: [],
                  is_allocated: false,
                });

                // Fetch location listings for existing rows immediately
                if (l.warehouse_id) {
                  await fetchLocationsForSpecificRow(
                    structuralLines.length - 1,
                    l.warehouse_id,
                  );
                }
              }
            }

            if (structuralLines.length > 0) {
              setLines(structuralLines);
            }
          }
        }
      } catch (err) {
        console.error("Hydration runtime issue:", err);
        setErrorMsg("Failed to synchronize component schema records.");
      } finally {
        setLoading(false);
      }
    };

    loadCoreLookups();
  }, [journalId, apiBase]);

  // 🌟 REACTIVE REFETCH HANDLER FOR LOCATIONS
  const fetchLocationsForSpecificRow = async (
    rowIndex: number,
    warehouseId: string,
  ) => {
    if (!warehouseId) {
      setRowLocationsCache((prev) => ({ ...prev, [rowIndex]: [] }));
      return;
    }
    try {
      // Query filter points to your target specific warehouse_id parameters
      const res = await fetch(
        `/api/lookups/locations?warehouse_id=${warehouseId}`,
      );
      if (res.ok) {
        const payload = await res.json();
        setRowLocationsCache((prev) => ({
          ...prev,
          [rowIndex]: payload.data || [],
        }));
      }
    } catch (err) {
      console.error("Failed pulling targeted location indices:", err);
    }
  };

  const handleSaveAllocations = (
    index: number,
    allocationsData: StockAllocationRecord[],
  ) => {
    const updated = [...lines];
    updated[index].allocations = allocationsData;

    // Calculate if assigned total quantities perfectly match the line's order quantity
    const totalAllocated = allocationsData.reduce(
      (sum, alloc) => sum + alloc.quantity,
      0,
    );
    updated[index].is_allocated = totalAllocated === updated[index].quantity;

    setLines(updated);
  };
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
    value: ItemJournalLineRow[K],
  ) => {
    if (isPosted) return;
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "cost_per_unit") {
      updated[index].amount =
        Number(updated[index].quantity || 0) *
        Number(updated[index].cost_per_unit || 0);
    }

    setLines(updated);
  };

  // 🌟 TRIGGERED EXCLUSIVELY VIA SELECTION MODAL
  // 🌟 Handles selection using your exact shared ItemLookupRecord structure safely
  const handleModalItemSelect = (selectedItem: ItemLookupRecord) => {
    if (activeModalRowIndex === null) return;

    const updated = [...lines];
    updated[activeModalRowIndex].item_id = selectedItem.id;
    updated[activeModalRowIndex].item_code = selectedItem.item_code;
    updated[activeModalRowIndex].item_description = selectedItem.name;

    // Fallback to "Pcs" or read from your custom setup if needed since base_uom_name isn't in the shared record
    updated[activeModalRowIndex].uom = "Pcs";

    // Map cost if provided safely, fallback to 0 if it is undefined
    updated[activeModalRowIndex].cost_per_unit = Number(
      selectedItem.standard_cost || 0,
    );

    // Compute total line valuation changes immediately
    updated[activeModalRowIndex].amount =
      updated[activeModalRowIndex].quantity *
      updated[activeModalRowIndex].cost_per_unit;

    setLines(updated);
    setActiveModalRowIndex(null);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines([
      ...lines,
      {
        transaction_type: "Positive Entry",
        item_id: "",
        item_code: "",
        item_description: "",
        warehouse_id: "",
        location_id: "",
        quantity: 0,
        uom: "Pcs",
        cost_per_unit: 0,
        amount: 0,
        account_id: "",
        allocations: [],
        is_allocated: false,
      },
    ]);
  };

  const removeLineRow = (index: number) => {
    if (isPosted || lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
    // Re-index cache layout mappings safely
    const cleanCache = { ...rowLocationsCache };
    delete cleanCache[index];
    setRowLocationsCache(cleanCache);
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
          errData.error || "Failed database ledger ingestion routine.",
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
          🔒 View Only: Document batch has been posted.
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
              // Extract current unique locations filtered list for this row index configuration
              const activeRowLocations = rowLocationsCache[index] || [];
              // Context-driven filtering targeting location scopes mapping to the distinct selected warehouse row
              //   const contextLocations = locations.filter(
              //     (l) => l.warehouse_id === line.warehouse_id,
              //   );

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

                  {/* 🌟 ITEM PICKER TRIGGER ELEMENT BUTTON BLOCK */}
                  <td className="p-2">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="Click Find"
                        value={line.item_code}
                        className="border p-2 rounded w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200"
                      />
                      <button
                        type="button"
                        disabled={isPosted}
                        onClick={() => {
                          setActiveModalRowIndex(index);
                          setIsModalOpen(true);
                        }}
                        className="bg-zinc-100 hover:bg-zinc-200 border px-2.5 rounded text-xs transition font-medium text-zinc-600"
                      >
                        Find
                      </button>
                    </div>
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
                        const nextWhId = e.target.value;
                        handleLineChange(index, "warehouse_id", nextWhId);
                        handleLineChange(index, "location_id", "");
                        fetchLocationsForSpecificRow(index, nextWhId);
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

                  {/* 🌟 REACTIVE WAREHOUSE LOCATIONS POPULATION */}
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
                      {activeRowLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.title} {loc.code ? `(${loc.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* RECORD QUANTITY INPUT */}
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
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
                      step="0.01"
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
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Allocation Trigger Button */}
                      <button
                        type="button"
                        disabled={!line.item_id || !line.warehouse_id}
                        onClick={() => {
                          // Open your Stock Allocation Modal for this row index
                          openStockAllocationModal(index);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-700 disabled:opacity-30"
                        title="Configure Stock Allocation"
                      >
                        {/* 🟢/🔴 Status dot based on allocation completion matching line.quantity */}
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full mr-1 ${
                            line.is_allocated ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                      </button>

                      {!isPosted && (
                        <button
                          type="button"
                          onClick={() => removeLineRow(index)}
                          disabled={lines.length <= 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-20 px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
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
          <div className="text-xs text-zinc-400 italic">Layout immutable</div>
        )}

        <div className="text-sm font-mono text-zinc-600 dark:text-zinc-400 text-right">
          Total Batch Valuation:{" "}
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

      {/* 🌟 INLINE SEARCH LOOKUP MODAL INJECTION */}
      <ItemLookupModal
        open={isModalOpen} // Matches 'open' prop from your file
        onClose={() => {
          setIsModalOpen(false);
          setActiveModalRowIndex(null);
        }}
        onSelect={handleModalItemSelect}
      />

      {/* 🌟 SHARED STOCK ALLOCATION MODAL INJECTION */}
      {activeAllocationRowIndex !== null && (
        <StockAllocationModal
          key={`allocation-row-${activeAllocationRowIndex}`}
          open={isAllocationModalOpen}
          onClose={() => {
            setIsAllocationModalOpen(false);
            setActiveAllocationRowIndex(null);
          }}
          targetQuantity={lines[activeAllocationRowIndex].quantity}
          itemCode={lines[activeAllocationRowIndex].item_code}
          itemName={lines[activeAllocationRowIndex].item_description}
          warehouseName={
            warehouses.find(
              (w) => w.id === lines[activeAllocationRowIndex].warehouse_id,
            )?.name || ""
          }
          locationName={
            (rowLocationsCache[activeAllocationRowIndex] || []).find(
              (l) => l.id === lines[activeAllocationRowIndex].location_id,
            )?.title || ""
          }
          initialAllocations={lines[activeAllocationRowIndex].allocations || []}
          onSave={(allocationsPayload) =>
            handleSaveAllocations(activeAllocationRowIndex, allocationsPayload)
          }
        />
      )}
    </form>
  );
}

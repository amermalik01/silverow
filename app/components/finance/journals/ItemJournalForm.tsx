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
import { toast } from "sonner";

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
  local_key: string;
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

export default function ItemJournalForm({
  journalId,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  // Status states
  const [loading, setLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lookup data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Location cache linked to unique local row keys
  const [rowLocationsCache, setRowLocationsCache] = useState<
    Record<string, StorageLocation[]>
  >({});

  // Modals state management
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeItemRowKey, setActiveItemRowKey] = useState<string | null>(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationRowKey, setActiveAllocationRowKey] = useState<
    string | null
  >(null);
  // Header metadata fields
  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
  });

  // Default row helper
  const createBlankRow = (): ItemJournalLineRow => ({
    local_key: Math.random().toString(36).substring(2, 9),
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
  });

  const [lines, setLines] = useState<ItemJournalLineRow[]>([createBlankRow()]);

  // --- Initial Dictionaries Load Hydration ---
  useEffect(() => {
    const loadCoreLookups = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

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
            const initialLocationCaches: Record<string, StorageLocation[]> = {};

            for (let i = 0; i < data.lines.length; i++) {
              const l = data.lines[i];
              if (l.item_id) {
                const isPositive = Number(l.debit) > 0;
                const associatedOffset = data.lines.find(
                  (o) =>
                    o.id !== l.id &&
                    Math.abs(Number(o.debit) - Number(l.credit)) < 0.01,
                );

                const generatedKey = Math.random().toString(36).substring(2, 9);

                structuralLines.push({
                  local_key: generatedKey,
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
                  const locRes = await fetch(
                    `/api/lookups/locations?warehouse_id=${l.warehouse_id}`,
                  );
                  if (locRes.ok) {
                    const locPayload = await locRes.json();
                    initialLocationCaches[generatedKey] = locPayload.data || [];
                  }
                }
              }
            }

            if (structuralLines.length > 0) {
              setRowLocationsCache(initialLocationCaches);
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
    rowIndex: string,
    warehouseId: string,
  ) => {
    if (!warehouseId) {
      setRowLocationsCache((prev) => ({ ...prev, [rowIndex]: [] }));
      return;
    }
    try {
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

  const handleSaveAllocations = (allocationsData: StockAllocationRecord[]) => {
    if (!activeAllocationRowKey) return;

    setLines((prev) =>
      prev.map((line) => {
        if (line.local_key !== activeAllocationRowKey) return line;
        const totalAllocated = allocationsData.reduce(
          (sum, a) => sum + a.quantity,
          0,
        );
        return {
          ...line,
          allocations: allocationsData,
          is_allocated: totalAllocated === line.quantity,
        };
      }),
    );

    setIsAllocationModalOpen(false);
    setActiveAllocationRowKey(null);
  };

  // Extract base currency symbol
  const baseCurrencyCode = currencies.find((c) => c.is_base)?.code || "GBP";

  // Compute absolute cumulative value summary ($Amount = Qty * Unit Cost)
  const totalBatchValuation = lines.reduce(
    (sum, line) => sum + (line.amount || 0),
    0,
  );

  const activeAllocationLine = lines.find(
    (l) => l.local_key === activeAllocationRowKey,
  );

  // --- Grid Matrix Mutator Event Handlers ---

  const handleLineChange = <K extends keyof ItemJournalLineRow>(
    key: string,
    field: K,
    value: ItemJournalLineRow[K],
  ) => {
    if (isPosted) return;
    setLines((prev) =>
      prev.map((line) => {
        if (line.local_key !== key) return line;
        const updated = { ...line, [field]: value };

        if (field === "quantity" || field === "cost_per_unit") {
          updated.amount =
            Number(updated.quantity || 0) * Number(updated.cost_per_unit || 0);
        }
        return updated;
      }),
    );
  };

  const handleModalItemSelect = (selectedItem: ItemLookupRecord) => {
    if (!activeItemRowKey) return;

    setLines((prev) =>
      prev.map((line) => {
        if (line.local_key !== activeItemRowKey) return line;
        const cost = Number(selectedItem.standard_cost || 0);
        return {
          ...line,
          item_id: selectedItem.id,
          item_code: selectedItem.item_code,
          item_description: selectedItem.name,
          cost_per_unit: cost,
          amount: line.quantity * cost,
        };
      }),
    );

    setIsItemModalOpen(false);
    setActiveItemRowKey(null);
  };

  const addLineRow = () => {
    if (isPosted) return;
    setLines((prev) => [...prev, createBlankRow()]);
  };

  const removeLineRow = (key: string) => {
    if (isPosted || lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.local_key !== key));
    setRowLocationsCache((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosted) return;
    setErrorMsg(null);

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

      toast.success("Draft Saved Successfully", {
        className: "bg-emerald-600 text-white border-emerald-700",
      });

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJournal = async () => {
    if (!journalId) {
      toast.warning("Draft verification required", {
        description:
          "Please save the item journal as a draft before attempting to post.",
        className: "bg-amber-500 text-white border-amber-600 !important",
        descriptionClassName: "text-amber-100",
      });
      return;
    }

    const confirmPost = window.confirm(
      "Are you sure you want to post this item journal? This will lock the ledger and commit all batch/serial inventory movements.",
    );
    if (!confirmPost) return;

    setIsPosting(true);

    try {
      const response = await fetch(
        `/api/finance/item-journal/${journalId}/post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to finalize ledger posting entries.",
        );
      }

      toast.success("Journal Posted Successfully!", {
        description:
          "Financial ledgers locked and inventory sub-ledger tracking registers updated.",
        className: "bg-emerald-600 text-white border-emerald-700",
        descriptionClassName: "text-emerald-100",
      });
      setIsPosted(true);

      // Optional callback to refresh parent components/catalogs
      // if (onPostSuccess) onPostSuccess();

      router.refresh();
    } catch (err) {
      console.error("Posting Error:", err);

      toast.error("Ledger Posting Failed", {
        description:
          err instanceof Error
            ? err.message
            : "An unexpected execution error occurred.",
        className: "bg-rose-600 text-white border-rose-700",
        descriptionClassName: "text-rose-100",
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 border rounded-xl shadow-sm bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
      {/* HEADER BAR AND GLOBAL ACTIONS SETUP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-5 gap-4 border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Item Journal Vouchers {journalId ? `#${journalId}` : "(New Draft)"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review ledger allocations and confirm inventory balance counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isPosted ? (
            <>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || isPosting}
                className="rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 transition disabled:opacity-40"
              >
                {loading ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handlePostJournal}
                disabled={loading || isPosting || !journalId}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPosting ? "Posting..." : "Post Transaction"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push(redirectPath)}
              className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 shadow-sm hover:bg-zinc-50"
            >
              Back to List Index
            </button>
          )}
        </div>
      </div>

      {/* SYSTEM WARNING RIBBONS AND INPUT ALERTS */}
      {isPosted && (
        <div className="p-4 text-sm bg-zinc-50 border border-zinc-200 text-zinc-600 dark:bg-zinc-800/40 dark:border-zinc-700 dark:text-zinc-300 rounded-lg font-medium flex items-center gap-2">
          <span>🔒 View Only: Document batch has been posted.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800/40 dark:text-rose-400 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6 p-6 border rounded shadow-sm bg-white dark:bg-zinc-900"
      >
        <fieldset disabled={isPosted} className="space-y-6 disabled:opacity-90">
          {/* HEADER INFO FIELD CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50/50 dark:bg-zinc-800/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                className="border p-2 rounded-lg w-full bg-white dark:bg-zinc-800 text-sm focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Document No. / Reference
              </label>
              <input
                type="text"
                disabled={isPosted}
                value={metadata.reference}
                onChange={(e) =>
                  setMetadata({ ...metadata, reference: e.target.value })
                }
                className="border p-2 rounded-lg w-full bg-white dark:bg-zinc-800 text-sm focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
                placeholder="e.g. ITEM-JV-0024"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Memo Narration Description
              </label>
              <input
                type="text"
                disabled={isPosted}
                value={metadata.description}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                className="border p-2 rounded-lg w-full bg-white dark:bg-zinc-800 text-sm focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
                placeholder="Stock reconciliation updates"
              />
            </div>
          </div>

          {/* DATA INPUT MATRIX CONTROL SHEET */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
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
                  {!isPosted && (
                    <th className="p-3 text-center w-12">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lines.map((line) => {
                  const activeRowLocations =
                    rowLocationsCache[line.local_key] || [];

                  return (
                    <tr
                      key={line.local_key}
                      className="text-sm align-middle hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20"
                    >
                      {/* TRANSACTION TYPE SELECTION */}
                      <td className="p-2">
                        <select
                          disabled={isPosted}
                          value={line.transaction_type}
                          onChange={(e) =>
                            handleLineChange(
                              line.local_key,
                              "transaction_type",
                              e.target.value as
                                | "Positive Entry"
                                | "Negative Entry",
                            )
                          }
                          className="border p-2 rounded-lg w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
                        >
                          <option value="Positive Entry">
                            Positive Entry (+)
                          </option>
                          <option value="Negative Entry">
                            Negative Entry (-)
                          </option>
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
                            className="border p-2 rounded-lg w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-mono font-bold border-zinc-200 dark:border-zinc-700"
                          />
                          <button
                            type="button"
                            disabled={isPosted}
                            onClick={() => {
                              setActiveItemRowKey(line.local_key);
                              setIsItemModalOpen(true);
                            }}
                            className="bg-zinc-100 hover:bg-zinc-200 border px-2.5 rounded-lg text-xs font-medium text-zinc-600"
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
                          className="border p-2 rounded-lg w-full bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 text-xs truncate border-zinc-200 dark:border-zinc-700"
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
                            handleLineChange(
                              line.local_key,
                              "warehouse_id",
                              nextWhId,
                            );
                            handleLineChange(line.local_key, "location_id", "");
                            fetchLocationsForSpecificRow(
                              line.local_key,
                              nextWhId,
                            );
                          }}
                          className="border p-2 rounded-lg w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
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
                            handleLineChange(
                              line.local_key,
                              "location_id",
                              e.target.value,
                            )
                          }
                          className="border p-2 rounded-lg w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
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
                          required
                          value={line.quantity || ""}
                          onChange={(e) =>
                            handleLineChange(
                              line.local_key,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="border p-2 rounded-lg w-full text-right font-mono text-xs border-zinc-200 dark:border-zinc-700"
                          placeholder="0"
                        />
                      </td>

                      {/* UOM TEXT TRACK SIGNPOST */}
                      <td className="p-2 text-center font-medium text-xs text-zinc-500">
                        {line.uom}
                      </td>

                      {/* COST PER UNIT METRIC INPUT */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={line.cost_per_unit || ""}
                          onChange={(e) =>
                            handleLineChange(
                              line.local_key,
                              "cost_per_unit",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="border p-2 rounded-lg w-full text-right font-mono text-xs border-zinc-200 dark:border-zinc-700"
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
                          value={line.account_id}
                          onChange={(e) =>
                            handleLineChange(
                              line.local_key,
                              "account_id",
                              e.target.value,
                            )
                          }
                          className="border p-2 rounded-lg w-full bg-transparent text-xs focus:ring-1 focus:ring-emerald-500 border-zinc-200 dark:border-zinc-700"
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
                          <button
                            type="button"
                            disabled={!line.item_id || !line.warehouse_id}
                            onClick={() => {
                              setActiveAllocationRowKey(line.local_key);
                              setIsAllocationModalOpen(true);
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-700 disabled:opacity-30"
                            title="Configure Stock Allocation"
                          >
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full mr-1 ${line.is_allocated ? "bg-green-500" : "bg-red-500"}`}
                            />
                          </button>

                          {!isPosted && (
                            <button
                              type="button"
                              onClick={() => removeLineRow(line.local_key)}
                              disabled={lines.length <= 1}
                              className="text-zinc-400 hover:text-red-500 disabled:opacity-20 text-xs px-1"
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
        </fieldset>
      </form>

      {/* MATRIX CALCULATIONS FOOTER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
        {!isPosted ? (
          <button
            type="button"
            onClick={addLineRow}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white dark:text-zinc-200 px-4 py-2 rounded-lg font-medium transition shadow-sm"
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
      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setActiveItemRowKey(null);
          }}
          onSelect={handleModalItemSelect}
        />
      )}

      {isAllocationModalOpen &&
        activeAllocationRowKey &&
        activeAllocationLine && (
          <StockAllocationModal
            key={`allocation-row-${activeAllocationRowKey}`}
            open={isAllocationModalOpen}
            onClose={() => {
              setIsAllocationModalOpen(false);
              setActiveAllocationRowKey(null);
            }}
            targetQuantity={activeAllocationLine.quantity}
            itemCode={activeAllocationLine.item_code}
            itemName={activeAllocationLine.item_description}
            warehouseName={
              warehouses.find((w) => w.id === activeAllocationLine.warehouse_id)
                ?.name || ""
            }
            locationName={
              (rowLocationsCache[activeAllocationRowKey] || []).find(
                (l) => l.id === activeAllocationLine.location_id,
              )?.title || ""
            }
            initialAllocations={activeAllocationLine.allocations || []}
            onSave={(allocationsPayload) =>
              handleSaveAllocations(allocationsPayload)
            }
          />
        )}
    </div>
  );
}

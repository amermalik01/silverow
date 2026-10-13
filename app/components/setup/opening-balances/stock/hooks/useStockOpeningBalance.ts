// app/components/setup/opening-balances/stock/hooks/useStockOpeningBalance.ts

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

import {
  calculateStockAmount,
  createStockOpeningBalanceRow,
  createStableKey,
} from "../constants";

import type {
  LocationOption,
  StockOpeningBalanceApiResponse,
  StockOpeningBalanceField,
  StockOpeningBalanceFieldValue,
  StockOpeningBalanceLineRow,
  WarehouseOption,
} from "../types";

const API_BASE = "/api/finance/opening-balances/stock";
const POST_API = `${API_BASE}/post`;

function getErrorMessage(
  result: unknown,
  fallback: string,
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return fallback;
}

function formatDateOnly(value: unknown): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str.slice(0, 10);
}

function normalizeRows(
  result: unknown,
): StockOpeningBalanceLineRow[] {
  const rows =
    Array.isArray(result)
      ? result
      : typeof result === "object" &&
          result !== null &&
          "data" in result &&
          Array.isArray(result.data)
        ? result.data
        : [];

  return rows.map((value: unknown) => {
    const row = value as Record<string, unknown>;

    const quantity = Number(row.quantity ?? 0);
    const unitPrice = Number(row.unit_price ?? 0);

    return {
      _stableKey: String(row._stableKey ?? row.id ?? createStableKey()),
      id: row.id ? String(row.id) : undefined,

      posting_date: formatDateOnly(row.posting_date),

      item_id: String(row.item_id ?? ""),
      item_no: String(row.item_no ?? ""),
      item_description: String(row.item_description ?? ""),
      uom: String(row.uom ?? "Pcs"),

      production_date: formatDateOnly(row.production_date),
      date_received: formatDateOnly(row.date_received),
      use_by_date: formatDateOnly(row.use_by_date),

      consignment_no: String(row.consignment_no ?? ""),
      ref_no: String(row.ref_no ?? ""),
      batch_no: String(row.batch_no ?? ""),

      warehouse_id: String(row.warehouse_id ?? ""),
      warehouse_code: String(row.warehouse_code ?? ""),
      warehouse_name: String(row.warehouse_name ?? ""),

      location_id: String(row.location_id ?? ""),
      location_name: String(row.location_name ?? ""),

      quantity,
      unit_price: unitPrice,
      amount: calculateStockAmount(quantity, unitPrice),

      posted: row.posted === true || row.posted === 1,
      posted_at: row.posted_at ? String(row.posted_at) : null,
    };
  });
}

export function useStockOpeningBalance() {
  const [lines, setLines] = useState<StockOpeningBalanceLineRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locationsByWarehouse, setLocationsByWarehouse] = useState<
    Record<string, LocationOption[]>
  >({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [balanceResponse, warehouseResponse, locationResponse] =
        await Promise.all([
          fetch(API_BASE),
          fetch("/api/inventory/warehouses"),
          fetch("/api/inventory/warehouse-locations"),
        ]);

      const [balanceResult, warehouseResult, locationResult] =
        await Promise.all([
          balanceResponse.json().catch(() => null),
          warehouseResponse.json().catch(() => null),
          locationResponse.json().catch(() => null),
        ]);

      if (!balanceResponse.ok) {
        throw new Error(
          getErrorMessage(
            balanceResult,
            "Failed to load stock opening balances.",
          ),
        );
      }

      if (!warehouseResponse.ok) {
        throw new Error(
          getErrorMessage(warehouseResult, "Failed to load warehouses."),
        );
      }

      if (!locationResponse.ok) {
        throw new Error(
          getErrorMessage(locationResult, "Failed to load locations."),
        );
      }

      const warehouseRows: WarehouseOption[] = Array.isArray(warehouseResult)
        ? warehouseResult
        : Array.isArray(
              (warehouseResult as { data?: unknown } | null)?.data,
            )
          ? (warehouseResult as { data: WarehouseOption[] }).data
          : [];

      const locationRows: LocationOption[] = Array.isArray(locationResult)
        ? locationResult
        : Array.isArray(
              (locationResult as { data?: unknown } | null)?.data,
            )
          ? (locationResult as { data: LocationOption[] }).data
          : [];

      setWarehouses(warehouseRows);

      const grouped = locationRows.reduce<
        Record<string, LocationOption[]>
      >((accumulator, location) => {
        if (!accumulator[location.warehouse_id]) {
          accumulator[location.warehouse_id] = [];
        }

        accumulator[location.warehouse_id].push(location);

        return accumulator;
      }, {});

      setLocationsByWarehouse(grouped);
      setLines(normalizeRows(balanceResult));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load stock opening balances.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleMultipleItemSelect = useCallback(
    (selectedItems: ItemLookupRecord[]) => {
      setLines((previous) => {
        const existingItemIds = new Set(
          previous.map((line) => line.item_id),
        );

        const newRows = selectedItems
          .filter((item) => !existingItemIds.has(item.id))
          .map((item) => createStockOpeningBalanceRow(item, warehouses));

        return [...previous, ...newRows];
      });

      setIsItemModalOpen(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    },
    [warehouses],
  );

  const handleLineChange = useCallback(
    (
      index: number,
      field: StockOpeningBalanceField,
      value: StockOpeningBalanceFieldValue,
    ) => {
      setLines((previous) => {
        const current = previous[index];

        if (!current || current.posted) {
          return previous;
        }

        const updated = [...previous];
        const next = { ...current, [field]: value };

        if (field === "quantity" || field === "unit_price") {
          next.amount = calculateStockAmount(
            Number(next.quantity),
            Number(next.unit_price),
          );
        }

        if (field === "warehouse_id") {
          const warehouse = warehouses.find(
            (item) => item.id === String(value),
          );

          next.warehouse_id = String(value);
          next.warehouse_code = warehouse?.code || "";
          next.warehouse_name = warehouse?.name || "";
          next.location_id = "";
          next.location_name = "";
        }

        if (field === "location_id") {
          const location = (
            locationsByWarehouse[next.warehouse_id] || []
          ).find((item) => item.id === String(value));

          next.location_id = String(value);
          next.location_name = location?.title || "";
        }

        updated[index] = next;

        return updated;
      });

      setErrorMessage(null);
      setSuccessMessage(null);
    },
    [warehouses, locationsByWarehouse],
  );

  const handleWarehouseSelect = useCallback(
    (index: number, warehouseId: string) => {
      handleLineChange(index, "warehouse_id", warehouseId);
    },
    [handleLineChange],
  );

  const removeLineRow = useCallback((index: number) => {
    setLines((previous) => {
      const line = previous[index];

      if (!line || line.posted) {
        return previous;
      }

      return previous.filter((_, rowIndex) => rowIndex !== index);
    });

    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const validateLines = useCallback((): string | null => {
    if (lines.length === 0) {
      return "Please select at least one item.";
    }

    const itemIds = new Set<string>();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const rowNumber = index + 1;

      if (line.posted) {
        continue;
      }

      if (!line.item_id) {
        return `Item is required on row ${rowNumber}.`;
      }

      if (itemIds.has(line.item_id)) {
        return `Duplicate item found on row ${rowNumber}.`;
      }

      itemIds.add(line.item_id);

      if (!line.posting_date) {
        return `Posting date is required on row ${rowNumber}.`;
      }

      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        return `Quantity must be greater than zero on row ${rowNumber}.`;
      }

      if (!Number.isFinite(line.unit_price) || line.unit_price < 0) {
        return `Unit cost cannot be negative on row ${rowNumber}.`;
      }

      if (!line.warehouse_id) {
        return `Warehouse is required on row ${rowNumber}.`;
      }

      if (line.location_id) {
        const location = (
          locationsByWarehouse[line.warehouse_id] || []
        ).find((item) => item.id === line.location_id);

        if (!location) {
          return `The selected location does not belong to the warehouse on row ${rowNumber}.`;
        }
      }
    }

    if (lines.every((line) => line.posted)) {
      return "All opening balance lines have already been posted.";
    }

    return null;
  }, [lines, locationsByWarehouse]);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines
            .filter((line) => !line.posted)
            .map(({ _stableKey, amount, posted, posted_at, ...line }) => ({
              ...line,
              quantity: Number(line.quantity),
              unit_price: Number(line.unit_price),
            })),
        }),
      });

      const result: StockOpeningBalanceApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to save stock opening balances.",
        );
      }

      setSuccessMessage(
        result.message || "Stock opening balances saved successfully.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save stock opening balances.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [lines, validateLines, loadData]);

  const handleDelete = useCallback(
    async (line: StockOpeningBalanceLineRow) => {
      if (!line.id) {
        setLines((previous) =>
          previous.filter((row) => row._stableKey !== line._stableKey),
        );
        return;
      }

      if (line.posted) {
        setErrorMessage(
          "Posted opening balances cannot be deleted here. Use the appropriate reversal process.",
        );
        return;
      }

      if (!window.confirm(`Delete opening balance for ${line.item_no}?`)) {
        return;
      }

      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(line.id)}`,
          { method: "DELETE" },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Failed to delete opening balance."),
          );
        }

        setSuccessMessage("Opening balance deleted successfully.");
        await loadData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to delete opening balance.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [loadData],
  );

  const handlePost = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const unpostedLines = lines.filter((line) => !line.posted);

    if (unpostedLines.some((line) => !line.id)) {
      setErrorMessage(
        "Save all opening balance lines before posting them.",
      );
      return;
    }

    if (
      !window.confirm(
        `Post ${unpostedLines.length} opening balance line(s) to inventory and the general ledger? This action should not be repeated.`,
      )
    ) {
      return;
    }

    setPosting(true);

    try {
      const response = await fetch(POST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: unpostedLines.map((line) => line.id),
        }),
      });

      const result: StockOpeningBalanceApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to post stock opening balances.",
        );
      }

      setSuccessMessage(
        result.message || "Stock opening balances posted successfully.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to post stock opening balances.",
      );
    } finally {
      setPosting(false);
    }
  }, [lines, validateLines, loadData]);

  const totalDebitAmount = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + Number(line.amount || 0),
        0,
      ),
    [lines],
  );

  const unpostedCount = useMemo(
    () => lines.filter((line) => !line.posted).length,
    [lines],
  );

  return {
    lines,
    loading,
    submitting,
    posting,
    errorMessage,
    successMessage,
    warehouses,
    locationsByWarehouse,
    isItemModalOpen,
    totalDebitAmount,
    unpostedCount,

    setIsItemModalOpen,
    handleMultipleItemSelect,
    handleLineChange,
    handleWarehouseSelect,
    removeLineRow,
    handleSave,
    handlePost,
    handleDelete,
    loadData,
  };
}

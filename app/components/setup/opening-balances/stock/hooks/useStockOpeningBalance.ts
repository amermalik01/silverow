// app/components/setup/opening-balances/stock/hooks/useStockOpeningBalance.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StockOpeningBalanceLineRow,
  WarehouseOption,
  LocationOption,
} from "../types";
import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

// Type for the incoming API balance response item before state enrichment
type StockOpeningBalanceApiRow = Omit<
  StockOpeningBalanceLineRow,
  "_stableKey" | "amount"
> & {
  id?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
};

// Response interface for save POST request
interface SaveApiResponse {
  error?: string;
}

export function useStockOpeningBalance() {
  const [lines, setLines] = useState<StockOpeningBalanceLineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locationsByWarehouse, setLocationsByWarehouse] = useState<
    Record<string, LocationOption[]>
  >({});

  // Fetch Existing Data & Master Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [resLines, resWh, resLoc] = await Promise.all([
        fetch("/api/setup/opening-balances/stock"),
        fetch("/api/inventory/warehouses"),
        fetch("/api/inventory/locations"),
      ]);

      if (resLines.ok) {
        const data: StockOpeningBalanceApiRow[] = await resLines.json();
        setLines(
          (data || []).map((row) => ({
            ...row,
            _stableKey: row.id || Math.random().toString(36).substring(2, 9),
            amount: Number(row.quantity || 0) * Number(row.unit_price || 0),
          })),
        );
      }

      if (resWh.ok) {
        const whData: WarehouseOption[] = await resWh.json();
        setWarehouses(whData);
      }

      if (resLoc.ok) {
        const locData: LocationOption[] = await resLoc.json();
        const grouped = locData.reduce(
          (acc, loc) => {
            if (!acc[loc.warehouse_id]) acc[loc.warehouse_id] = [];
            acc[loc.warehouse_id].push(loc);
            return acc;
          },
          {} as Record<string, LocationOption[]>,
        );
        setLocationsByWarehouse(grouped);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load stock opening balance data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Append Selected Items from Lookup Modal
  const handleMultipleItemSelect = (selectedItems: ItemLookupRecord[]) => {
    const today = new Date().toISOString().split("T")[0];

    const newRows: StockOpeningBalanceLineRow[] = selectedItems.map((item) => ({
      _stableKey: Math.random().toString(36).substring(2, 9),
      posting_date: today,
      item_id: item.id,
      item_no: item.item_code || "",
      item_description: item.description || item.name || "",
      uom: item.base_uom_name || "Pcs",
      production_date: "",
      date_received: "",
      use_by_date: "",
      consignment_no: "",
      ref_no: "",
      batch_no: "",
      warehouse_id: warehouses[0]?.id || "",
      warehouse_code: warehouses[0]?.code || "",
      warehouse_name: warehouses[0]?.name || "",
      location_id: "",
      location_name: "",
      quantity: 1,
      unit_price: Number(item.standard_sales_price || item.standard_cost || 0),
      amount: Number(item.standard_sales_price || item.standard_cost || 0),
    }));

    setLines((prev) => [...prev, ...newRows]);
    setIsItemModalOpen(false);
  };

  // Type-safe field updater mapped using TS generics
  const handleLineChange = <K extends keyof StockOpeningBalanceLineRow>(
    index: number,
    field: K,
    value: StockOpeningBalanceLineRow[K],
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === "quantity" || field === "unit_price") {
        row.amount = Number(row.quantity || 0) * Number(row.unit_price || 0);
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleWarehouseSelect = (index: number, warehouseId: string) => {
    const selectedWh = warehouses.find((w) => w.id === warehouseId);
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        warehouse_id: warehouseId,
        warehouse_name: selectedWh?.name || "",
        warehouse_code: selectedWh?.code || "",
        location_id: "",
        location_name: "",
      };
      return updated;
    });
  };

  const removeLineRow = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebitAmount = lines.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  );

  const handleSave = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/setup/opening-balances/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });

      const data: SaveApiResponse = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to save stock opening balances.");

      await fetchData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Save action failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    lines,
    loading,
    submitting,
    errorMessage,
    warehouses,
    locationsByWarehouse,
    isItemModalOpen,
    totalDebitAmount,
    setIsItemModalOpen,
    handleMultipleItemSelect,
    handleLineChange,
    handleWarehouseSelect,
    removeLineRow,
    handleSave,
  };
}

/* "use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StockOpeningBalanceLineRow,
  WarehouseOption,
  LocationOption,
} from "../types";
import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

export function useStockOpeningBalance() {
  const [lines, setLines] = useState<StockOpeningBalanceLineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locationsByWarehouse, setLocationsByWarehouse] = useState<
    Record<string, LocationOption[]>
  >({});

  // Fetch Existing Data & Master Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [resLines, resWh, resLoc] = await Promise.all([
        fetch("/api/setup/opening-balances/stock"),
        fetch("/api/inventory/warehouses"),
        fetch("/api/inventory/locations"),
      ]);

      if (resLines.ok) {
        const data = await resLines.json();
        setLines(
          (data || []).map((row: any) => ({
            ...row,
            _stableKey: row.id || Math.random().toString(36).substring(2, 9),
            amount: Number(row.quantity || 0) * Number(row.unit_price || 0),
          })),
        );
      }

      if (resWh.ok) {
        const whData = await resWh.json();
        setWarehouses(whData);
      }

      if (resLoc.ok) {
        const locData: LocationOption[] = await resLoc.json();
        const grouped = locData.reduce(
          (acc, loc) => {
            if (!acc[loc.warehouse_id]) acc[loc.warehouse_id] = [];
            acc[loc.warehouse_id].push(loc);
            return acc;
          },
          {} as Record<string, LocationOption[]>,
        );
        setLocationsByWarehouse(grouped);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load stock opening balance data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Append Selected Items from Lookup Modal
  const handleMultipleItemSelect = (selectedItems: ItemLookupRecord[]) => {
    const today = new Date().toISOString().split("T")[0];

    const newRows: StockOpeningBalanceLineRow[] = selectedItems.map((item) => ({
      _stableKey: Math.random().toString(36).substring(2, 9),
      posting_date: today,
      item_id: item.id,
      item_no: item.item_code || "",
      item_description: item.description || item.name || "",
      uom: item.base_uom_name || "Pcs",
      production_date: "",
      date_received: "",
      use_by_date: "",
      consignment_no: "",
      ref_no: "",
      batch_no: "",
      warehouse_id: warehouses[0]?.id || "",
      warehouse_code: warehouses[0]?.code || "",
      warehouse_name: warehouses[0]?.name || "",
      location_id: "",
      location_name: "",
      quantity: 1,
      unit_price: Number(item.standard_sales_price || item.standard_cost || 0),
      amount: Number(item.standard_sales_price || item.standard_cost || 0),
    }));

    setLines((prev) => [...prev, ...newRows]);
    setIsItemModalOpen(false);
  };

  const handleLineChange = (
    index: number,
    field: keyof StockOpeningBalanceLineRow,
    value: any,
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === "quantity" || field === "unit_price") {
        row.amount = Number(row.quantity || 0) * Number(row.unit_price || 0);
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleWarehouseSelect = (index: number, warehouseId: string) => {
    const selectedWh = warehouses.find((w) => w.id === warehouseId);
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        warehouse_id: warehouseId,
        warehouse_name: selectedWh?.name || "",
        warehouse_code: selectedWh?.code || "",
        location_id: "",
        location_name: "",
      };
      return updated;
    });
  };

  const removeLineRow = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebitAmount = lines.reduce(
    (sum, row) => sum + (row.amount || 0),
    0,
  );

  const handleSave = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/setup/opening-balances/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to save stock opening balances.");

      await fetchData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Save action failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    lines,
    loading,
    submitting,
    errorMessage,
    warehouses,
    locationsByWarehouse,
    isItemModalOpen,
    totalDebitAmount,
    setIsItemModalOpen,
    handleMultipleItemSelect,
    handleLineChange,
    handleWarehouseSelect,
    removeLineRow,
    handleSave,
  };
} */

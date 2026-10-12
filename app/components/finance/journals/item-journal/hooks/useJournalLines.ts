// app/components/finance/journals/item-journal/hooks/useJournalLines.ts

"use client";

import { useCallback, useState } from "react";
import type { 
  ItemJournalLineRow, 
  ItemModalState, 
  GLModalState, 
  WarehouseOption, 
  LocationOption 
} from "../types";
import { calculateAmount, createInitialRow, getStockStatus } from "../utils";

interface UseItemJournalLinesProps {
  initialDate: string;
  setLocationsByWarehouse: React.Dispatch<React.SetStateAction<Record<string, LocationOption[]>>>;
  fetchLocationsForWarehouse: (warehouseId: string) => Promise<LocationOption[]>;
}

export function useItemJournalLines({
  initialDate,
  setLocationsByWarehouse,
  fetchLocationsForWarehouse,
}: UseItemJournalLinesProps) {
  const [lines, setLines] = useState<ItemJournalLineRow[]>(() => [createInitialRow(initialDate)]);
  const [activeModal, setActiveModal] = useState<GLModalState | null>(null);
  const [itemActiveModal, setItemActiveModal] = useState<ItemModalState | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);
  const [locationIndex, setLocationIndex] = useState<number | null>(null);

  const updateLineField = useCallback(<K extends keyof ItemJournalLineRow>(
    index: number,
    field: K,
    value: ItemJournalLineRow[K]
  ) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;

        const updated = { ...line, [field]: value };

        // Recalculate amount if quantity or cost changes
        if (field === "quantity" || field === "cost_per_unit") {
          updated.amount = calculateAmount(
            field === "quantity" ? Number(value) : updated.quantity,
            field === "cost_per_unit" ? Number(value) : updated.cost_per_unit
          );
          updated.stock_status = getStockStatus(Number(updated.quantity), updated.allocations);
          updated.is_allocated = updated.stock_status === "allocated";
        }

        return updated;
      })
    );
  }, []);

  const handleWarehouseChange = useCallback(async (index: number, warehouseId: string, warehouses: WarehouseOption[]) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              warehouse_id: warehouseId,
              warehouse_code: warehouse?.code || "",
              warehouse_name: warehouse?.name || "",
              location_id: "",
              location_name: "",
            }
          : line
      )
    );

    if (warehouseId) {
      const locations = await fetchLocationsForWarehouse(warehouseId);
      setLocationsByWarehouse((prev) => ({ ...prev, [warehouseId]: locations }));
    }
  }, [fetchLocationsForWarehouse, setLocationsByWarehouse]);

  return {
    lines,
    setLines,
    activeModal,
    setActiveModal,
    itemActiveModal,
    setItemActiveModal,
    warehouseIndex,
    setWarehouseIndex,
    locationIndex,
    setLocationIndex,
    updateLineField,
    handleWarehouseChange,
  };
}

/* "use client";

import { useCallback } from "react";

import type {
  BuildItemLine,
  ItemJournalLineRow,
  JournalMetadata,
} from "../types";

import {
  calculateAmount,
  createInitialRow,
  getAllocationTotal,
  getStockStatus,
} from "../utils";

interface UseJournalLinesProps {
  lines: ItemJournalLineRow[];
  setLines: React.Dispatch<React.SetStateAction<ItemJournalLineRow[]>>;
  metadata: JournalMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<JournalMetadata>>;
  formDisabled: boolean;
  buildItemLine: BuildItemLine;
}

export function useJournalLines({
  lines,
  setLines,
  metadata,
  setMetadata,
  formDisabled,
  buildItemLine,
}: UseJournalLinesProps) {
  const handleMetadataChange = useCallback(
    (field: keyof JournalMetadata, value: string) => {
      if (formDisabled) return;

      setMetadata((previous) => ({ ...previous, [field]: value }));

      if (field === "entry_date" && value) {
        setLines((previous) =>
          previous.map((line) => ({
            ...line,
            posting_date: line.posting_date || value,
          })),
        );
      }
    },
    [formDisabled, setLines, setMetadata],
  );

  const handleLineChange = useCallback(
    (
      index: number,
      field: keyof ItemJournalLineRow,
      value: string | number,
    ) => {
      if (formDisabled) return;

      setLines((previous) =>
        previous.map((line, lineIndex) => {
          if (lineIndex !== index) return line;

          const updated = {
            ...line,
            [field]: value,
          } as ItemJournalLineRow;

          if (field === "quantity" || field === "cost_per_unit") {
            const quantity = Number(updated.quantity || 0);
            const cost = Number(updated.cost_per_unit || 0);

            updated.quantity = Number.isFinite(quantity) ? quantity : 0;
            updated.cost_per_unit = Number.isFinite(cost) ? cost : 0;
            updated.amount = calculateAmount(
              updated.quantity,
              updated.cost_per_unit,
            );

            if (getAllocationTotal(updated.allocations) > updated.quantity) {
              updated.allocations = [];
            }

            updated.stock_status = getStockStatus(
              updated.quantity,
              updated.allocations,
            );
            updated.is_allocated = updated.stock_status === "allocated";
          }

          if (field === "item_id" && !String(value || "")) {
            updated.allocations = [];
            updated.stock_status = "unallocated";
            updated.is_allocated = false;
          }

          return updated;
        }),
      );
    },
    [formDisabled, setLines],
  );

  const addLineRow = useCallback(() => {
    if (formDisabled) return;

    setLines((previous) => [
      ...previous,
      createInitialRow(metadata.entry_date),
    ]);
  }, [formDisabled, metadata.entry_date, setLines]);

  const removeLineRow = useCallback(
    (index: number) => {
      if (formDisabled) return;

      setLines((previous) => {
        if (previous.length <= 1) {
          return [createInitialRow(metadata.entry_date)];
        }

        return previous.filter((_, lineIndex) => lineIndex !== index);
      });
    },
    [formDisabled, metadata.entry_date, setLines],
  );

  const buildItemLines = useCallback(
    async (
      items: Parameters<BuildItemLine>[0][],
    ): Promise<ItemJournalLineRow[]> => Promise.all(items.map(buildItemLine)),
    [buildItemLine],
  );

  return {
    handleMetadataChange,
    handleLineChange,
    addLineRow,
    removeLineRow,
    buildItemLines,
  };
} */

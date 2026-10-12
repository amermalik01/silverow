// app/components/finance/journals/item-journal/hooks/useStockAllocation.ts

"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ItemJournalAllocationRecord, ItemJournalLineRow } from "../types";

import { getAllocationTotal, getStockStatus } from "../utils";

import type {
  StockSequenceRecord,
  AvailableStockRecord,
  StockAllocationRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

type NormalizeAllocation = (
  allocation: Partial<ItemJournalAllocationRecord>,
  fallbackLocationId?: string,
  fallbackLocationName?: string,
) => ItemJournalAllocationRecord;

interface UseStockAllocationProps {
  lines: ItemJournalLineRow[];
  setLines: React.Dispatch<React.SetStateAction<ItemJournalLineRow[]>>;
  formDisabled: boolean;

  fetchStockSequences: (
    itemId: string,
    warehouseId: string,
    locationId?: string,
  ) => Promise<StockSequenceRecord[]>;

  fetchAvailableStock: (
    itemId: string,
    warehouseId: string,
  ) => Promise<AvailableStockRecord[]>;

  normalizeAllocation: NormalizeAllocation;

  show: (message: string) => void;
  hide: () => void;
}

export function useStockAllocation({
  lines,
  setLines,
  formDisabled,
  fetchStockSequences,
  fetchAvailableStock,
  normalizeAllocation,
  show,
  hide,
}: UseStockAllocationProps) {
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  const [activeAllocationLineId, setActiveAllocationLineId] = useState<
    string | null
  >(null);

  const [existingSequences, setExistingSequences] = useState<
    StockSequenceRecord[]
  >([]);

  const [availableStock, setAvailableStock] = useState<AvailableStockRecord[]>(
    [],
  );

  const activeAllocationLine = useMemo(
    () =>
      lines.find((line) => line._stableKey === activeAllocationLineId) ?? null,
    [lines, activeAllocationLineId],
  );

  const handleOpenAllocation = useCallback(
    async (line: ItemJournalLineRow) => {
    //   if (formDisabled) return;

      if (!line.item_id) {
        toast.error("Please select an item first.");
        return;
      }

      if (!line.warehouse_id) {
        toast.error("Please select a warehouse first.");
        return;
      }

      if (!line.location_id) {
        toast.error("Please select a location first.");
        return;
      }

      if (Number(line.quantity || 0) <= 0) {
        toast.error("Please enter a quantity first.");
        return;
      }

      setActiveAllocationLineId(line._stableKey);
      setExistingSequences([]);
      setAvailableStock([]);

      try {
        const isPositive = line.transaction_type === "Positive Entry";

        show(
          isPositive
            ? "Loading stock sequences..."
            : "Loading available stock...",
        );

        if (isPositive) {
          const sequences = await fetchStockSequences(
            line.item_id,
            line.warehouse_id,
            line.location_id,
          );

          setExistingSequences(sequences);
        } else {
          const stock = await fetchAvailableStock(
            line.item_id,
            line.warehouse_id,
          );

          setAvailableStock(stock);
        }

        setIsAllocationModalOpen(true);
      } catch (error: unknown) {
        console.error("Failed to load stock allocation data:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load stock allocation data.",
        );

        setActiveAllocationLineId(null);
        setIsAllocationModalOpen(false);
      } finally {
        hide();
      }
    },
    [formDisabled, show, hide, fetchStockSequences, fetchAvailableStock],
  );

  const handleCloseAllocation = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
    setAvailableStock([]);
  }, []);

  const handleSaveAllocations = useCallback(
    (allocationsData: StockAllocationRecord[]) => {
      if (!activeAllocationLineId || formDisabled) {
        return;
      }
      

      let validationError: string | null = null;

      setLines((previous) =>
        previous.map((line) => {
          if (line._stableKey !== activeAllocationLineId) {
            return line;
          }

          const quantity = Number(line.quantity || 0);

          const allocations = allocationsData
            .map((allocation) =>
              normalizeAllocation(
                allocation,
                line.location_id,
                line.location_name,
              ),
            )
            .filter((allocation) => allocation.quantity > 0);

          const allocatedQuantity = getAllocationTotal(allocations);

          if (allocatedQuantity > quantity + 0.000001) {
            validationError =
              "Allocated quantity cannot exceed the journal quantity.";
            return line;
          }

          const sequenceKeys = new Set<string>();

          for (const allocation of allocations) {
            if (!allocation.sequence_no) continue;

            const key = [
              allocation.location_id,
              allocation.sequence_no,
              allocation.batch_no,
              allocation.serial_no,
            ].join("|");

            if (sequenceKeys.has(key)) {
              validationError =
                "The same stock sequence cannot be allocated more than once.";
              return line;
            }

            sequenceKeys.add(key);
          }

          const status = getStockStatus(quantity, allocations);

          return {
            ...line,
            allocations,
            initialAllocations:
              line.initialAllocations?.map((allocation) => ({
                ...allocation,
              })) ?? [],
            stock_status: status,
            is_allocated: status === "allocated",
          };
        }),
      );

      // Preserve the existing behavior: keep the modal open
      // when allocation validation fails.
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setIsAllocationModalOpen(false);
      setActiveAllocationLineId(null);
      setExistingSequences([]);
      setAvailableStock([]);
    },
    [activeAllocationLineId, formDisabled, normalizeAllocation, setLines],
  );

  const resetAllocation = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
    setAvailableStock([]);
  }, []);

  return {
    isAllocationModalOpen,
    setIsAllocationModalOpen,

    activeAllocationLineId,
    setActiveAllocationLineId,
    activeAllocationLine,

    existingSequences,
    setExistingSequences,

    availableStock,
    setAvailableStock,

    handleOpenAllocation,
    handleCloseAllocation,
    handleSaveAllocations,
    resetAllocation,
  };
}

/* "use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ItemJournalAllocationRecord, ItemJournalLineRow } from "../types";

import { getAllocationTotal, getStockStatus } from "../utils";

import type {
  StockSequenceRecord,
  AvailableStockRecord,
  StockAllocationRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

type NormalizeAllocation = (
  allocation: Partial<ItemJournalAllocationRecord>,
  fallbackLocationId?: string,
  fallbackLocationName?: string,
) => ItemJournalAllocationRecord;

interface UseStockAllocationProps {
  lines: ItemJournalLineRow[];
  setLines: React.Dispatch<React.SetStateAction<ItemJournalLineRow[]>>;
  formDisabled: boolean;
  fetchStockSequences: (
    itemId: string,
    warehouseId: string,
    locationId?: string,
  ) => Promise<StockSequenceRecord[]>;
  fetchAvailableStock: (
    itemId: string,
    warehouseId: string,
  ) => Promise<AvailableStockRecord[]>;
  normalizeAllocation: NormalizeAllocation;
  show: (message: string) => void;
  hide: () => void;
}

export function useStockAllocation({
  lines,
  setLines,
  formDisabled,
  fetchStockSequences,
  fetchAvailableStock,
  normalizeAllocation,
  show,
  hide,
}: UseStockAllocationProps) {
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationLineId, setActiveAllocationLineId] = useState<
    string | null
  >(null);
  const [existingSequences, setExistingSequences] = useState<
    StockSequenceRecord[]
  >([]);
  const [availableStock, setAvailableStock] = useState<AvailableStockRecord[]>(
    [],
  );

  const activeAllocationLine = useMemo(
    () =>
      lines.find((line) => line._stableKey === activeAllocationLineId) ?? null,
    [lines, activeAllocationLineId],
  );

  const resetAllocation = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
    setAvailableStock([]);
  }, []);

  const handleOpenAllocation = useCallback(
    async (line: ItemJournalLineRow) => {
      if (formDisabled) return;

      if (!line.item_id) {
        toast.error("Please select an item first.");
        return;
      }
      if (!line.warehouse_id) {
        toast.error("Please select a warehouse first.");
        return;
      }
      if (!line.location_id) {
        toast.error("Please select a location first.");
        return;
      }
      if (Number(line.quantity || 0) <= 0) {
        toast.error("Please enter a quantity first.");
        return;
      }

      setActiveAllocationLineId(line._stableKey);
      setExistingSequences([]);
      setAvailableStock([]);

      try {
        const isPositive = line.transaction_type === "Positive Entry";

        show(
          isPositive
            ? "Loading stock sequences..."
            : "Loading available stock...",
        );

        if (isPositive) {
          setExistingSequences(
            await fetchStockSequences(
              line.item_id,
              line.warehouse_id,
              line.location_id,
            ),
          );
        } else {
          setAvailableStock(
            await fetchAvailableStock(line.item_id, line.warehouse_id),
          );
        }

        setIsAllocationModalOpen(true);
      } catch (error: unknown) {
        console.error("Failed to load stock allocation data:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load stock allocation data.",
        );
        resetAllocation();
      } finally {
        hide();
      }
    },
    [
      formDisabled,
      show,
      hide,
      fetchStockSequences,
      fetchAvailableStock,
      resetAllocation,
    ],
  );

  const handleSaveAllocations = useCallback(
    (data: StockAllocationRecord[]) => {
      if (!activeAllocationLineId || formDisabled) return;

      let validationError: string | null = null;
      let foundLine = false;

      setLines((previous) =>
        previous.map((line) => {
          if (line._stableKey !== activeAllocationLineId) return line;

          foundLine = true;

          const quantity = Number(line.quantity || 0);
          const allocations = data
            .map((allocation) =>
              normalizeAllocation(
                allocation,
                line.location_id,
                line.location_name,
              ),
            )
            .filter((allocation) => allocation.quantity > 0);

          if (getAllocationTotal(allocations) > quantity + 0.000001) {
            validationError =
              "Allocated quantity cannot exceed the journal quantity.";
            return line;
          }

          const keys = new Set<string>();

          for (const allocation of allocations) {
            if (!allocation.sequence_no) continue;

            const key = [
              allocation.location_id,
              allocation.sequence_no,
              allocation.batch_no,
              allocation.serial_no,
            ].join("|");

            if (keys.has(key)) {
              validationError =
                "The same stock sequence cannot be allocated more than once.";
              return line;
            }

            keys.add(key);
          }

          const status = getStockStatus(quantity, allocations);

          return {
            ...line,
            allocations,
            initialAllocations:
              line.initialAllocations?.map((item) => ({ ...item })) ?? [],
            stock_status: status,
            is_allocated: status === "allocated",
          };
        }),
      );

      if (!foundLine) {
        toast.error("The journal line no longer exists.");
        resetAllocation();
        return;
      }

      if (validationError) {
        toast.error(validationError);
        return;
      }

      resetAllocation();
    },
    [
      activeAllocationLineId,
      formDisabled,
      normalizeAllocation,
      setLines,
      resetAllocation,
    ],
  );

  return {
    isAllocationModalOpen,
    setIsAllocationModalOpen,
    activeAllocationLineId,
    setActiveAllocationLineId,
    activeAllocationLine,
    existingSequences,
    setExistingSequences,
    availableStock,
    setAvailableStock,
    handleOpenAllocation,
    handleCloseAllocation: resetAllocation,
    handleSaveAllocations,
    resetAllocation,
  };
} */

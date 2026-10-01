// app/components/finance/journals/item-journal/hooks/useItemJournal.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLoader } from "@/app/context/LoaderContext";

import type {
  ItemJournalFormProps,
  ItemJournalLineRow,
  JournalMetadata,
  LocationOption,
  WarehouseOption,
  ItemModalState,
  GLModalState,
  ApiResponse,
} from "../types";

import {
  calculateAmount,
  createInitialRow,
  createStableKey,
  getAllocationTotal,
  getStockStatus,
  normalizeDate,
  today,
} from "../utils";

import { GLAccountLookupRecord } from "@/app/components/shared/modals/GLAccountLookupModal";
import { StockAllocationRecord } from "@/app/components/shared/modals/StockAllocationModal";
import { WarehouseLookupRecord } from "@/app/components/shared/modals/WarehouseLookupModal";
import { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

export function useItemJournal({
  journalId,
  apiBase,
  redirectPath,
  readOnly = false,
}: ItemJournalFormProps) {
  const router = useRouter();

  const { show, hide } = useLoader();

  const [loading, setLoading] = useState(false);

  const [isPosted, setIsPosted] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(!journalId);

  const [currentJournalId, setCurrentJournalId] = useState<string | null>(
    journalId || null,
  );

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const [locationsByWarehouse, setLocationsByWarehouse] = useState<
    Record<string, LocationOption[]>
  >({});

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  const [activeAllocationLineId, setActiveAllocationLineId] = useState<
    string | null
  >(null);

  const [activeModal, setActiveModal] = useState<GLModalState | null>(null);

  const [itemActiveModal, setItemActiveModal] = useState<ItemModalState | null>(
    null,
  );

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [locationIndex, setLocationIndex] = useState<number | null>(null);

  const [metadata, setMetadata] = useState<JournalMetadata>({
    entry_no: "",
    entry_date: today(),
  });

  const [lines, setLines] = useState<ItemJournalLineRow[]>(() => [
    createInitialRow(today()),
  ]);

  const formDisabled = readOnly || isPosted || !isEditing || loading;

  const activeAllocationLine = useMemo(() => {
    if (!activeAllocationLineId) {
      return null;
    }

    return (
      lines.find((line) => line._stableKey === activeAllocationLineId) || null
    );
  }, [activeAllocationLineId, lines]);

  const fetchLocationsForWarehouse = useCallback(
    async (warehouseId: string): Promise<LocationOption[]> => {
      if (!warehouseId) {
        return [];
      }

      try {
        const response = await fetch(
          `/api/lookups/locations?warehouse_id=${encodeURIComponent(
            warehouseId,
          )}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load locations.");
        }

        const payload = await response.json();

        const data = Array.isArray(payload) ? payload : (payload.data ?? []);

        return data.map((location: Record<string, unknown>) => ({
          id: String(location.id ?? ""),
          title: String(
            location.title ??
              location.name ??
              location.location_name ??
              location.code ??
              "",
          ),
          warehouse_id: String(location.warehouse_id ?? warehouseId),
        }));

        // return data;
      } catch (error) {
        console.error(
          `Failed to load locations for warehouse ${warehouseId}:`,
          error,
        );

        return [];
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchMasterData = async (): Promise<void> => {
      setLoading(true);
      setErrorMsg(null);

      try {
        show("Loading data...");

        const warehouseResponse = await fetch("/api/inventory/warehouses");

        let warehouseOptions: WarehouseOption[] = [];

        if (warehouseResponse.ok) {
          const warehousePayload = await warehouseResponse.json();

          const warehouseData = Array.isArray(warehousePayload)
            ? warehousePayload
            : Array.isArray(warehousePayload?.data)
              ? warehousePayload.data
              : [];

          warehouseOptions = warehouseData.map(
            (warehouse: Record<string, unknown>) => ({
              id: String(warehouse.id ?? ""),
              name: String(
                warehouse.name ??
                  warehouse.title ??
                  warehouse.warehouse_name ??
                  "",
              ),
              code: String(warehouse.code ?? warehouse.warehouse_code ?? ""),
            }),
          );

          if (!cancelled) {
            setWarehouses(warehouseOptions);
          }
        }

        const warehouseMap = new Map<string, WarehouseOption>(
          warehouseOptions.map((warehouse) => [
            String(warehouse.id),
            warehouse,
          ]),
        );

        // if (cancelled) {
        //   return;
        // }

        // if (warehouseResponse.ok) {
        //   const payload = await warehouseResponse.json();

        //   const data = Array.isArray(payload) ? payload : (payload.data ?? []);

        //   setWarehouses(data);
        // }

        if (!journalId) {
          if (!cancelled) {
            setIsPosted(false);
            setIsEditing(true);
          }

          return;
        }

        const response = await fetch(`${apiBase}/${journalId}`);

        if (!response.ok) {
          let message = "Failed to load item journal.";

          try {
            const payload = await response.json();

            message = payload?.error || payload?.message || message;
          } catch {
            // Ignore invalid JSON response.
          }

          throw new Error(message);
        }

        const data = await response.json();

        // console.log("ITEM JOURNAL LOAD RESPONSE:", data);
        // console.log("ITEM JOURNAL LINES:", data.lines ?? data.data?.lines);

        if (cancelled) {
          return;
        }

        const journal = data.journal ?? data.data?.journal ?? data;

        const posted = Boolean(journal?.is_posted);

        setIsPosted(posted);

        setIsEditing(!posted && !readOnly);

        const entryDate = normalizeDate(journal?.entry_date) || today();

        setMetadata({
          entry_no: journal?.entry_no || "",
          entry_date: entryDate,
        });

        const apiLines = data.lines ?? data.data?.lines ?? [];

        if (!Array.isArray(apiLines) || apiLines.length === 0) {
          setLines([createInitialRow(entryDate)]);
          return;
        }

        // if (Array.isArray(apiLines) && apiLines.length > 0) {
        const normalizedLines: ItemJournalLineRow[] = apiLines.map(
          (rawLine: Record<string, unknown>) => {
            const getString = (key: string): string => {
              const value = rawLine[key];

              return value === null || value === undefined ? "" : String(value);
            };
            const quantity = Number(rawLine.quantity || 0);

            const cost = Number(
              rawLine.cost_per_unit ?? rawLine.unit_cost ?? 0,
            );

            const warehouseId = getString("warehouse_id");

            const warehouse = warehouseMap.get(warehouseId);

            const debit = Number(rawLine.debit ?? 0);

            const credit = Number(rawLine.credit ?? 0);

            const transactionType =
              getString("transaction_type") === "Positive Entry"
                ? "Positive Entry"
                : getString("transaction_type") === "Negative Entry"
                  ? "Negative Entry"
                  : debit > credit
                    ? "Positive Entry"
                    : "Negative Entry";

            const rawAllocations = rawLine.allocations;

            const rawInitialAllocations = rawLine.initialAllocations;

            const allocations: StockAllocationRecord[] = Array.isArray(
              rawAllocations,
            )
              ? (rawAllocations as StockAllocationRecord[])
              : Array.isArray(rawInitialAllocations)
                ? (rawInitialAllocations as StockAllocationRecord[])
                : [];

            const status = getStockStatus(quantity, allocations);

            const accountId =
              getString("balancing_account_id") || getString("account_id");

            const accountCode = getString("account_code");

            const accountName = getString("account_name");

            const balancingDisplayName =
              getString("balancing_display_name") ||
              (accountCode && accountName
                ? `${accountCode} - ${accountName}`
                : accountName || accountCode || "");

            const locationId = getString("location_id");

            return {
              _stableKey: createStableKey(),

              posting_date:
                normalizeDate(getString("posting_date")) || entryDate,

              transaction_type: transactionType,

              item_id: getString("item_id"),
              item_no: getString("item_no") || getString("item_code"),
              item_description:
                getString("item_description") || getString("description"),

              // warehouse_id: getString("warehouse_id"),
              // warehouse_code: getString("warehouse_code"),
              // warehouse_name: getString("warehouse_name"),

              warehouse_id: warehouseId,

              warehouse_code:
                getString("warehouse_code") || warehouse?.code || "",

              warehouse_name:
                getString("warehouse_name") || warehouse?.name || "",

              location_id: getString("location_id"),
              location_name: getString("location_name"),

              quantity,

              uom: getString("uom") || getString("uom_name") || "Pcs",

              cost_per_unit: cost,

              amount: calculateAmount(quantity, cost),

              balancing_account_id: accountId,

              balancing_display_name: balancingDisplayName,

              allocations,
              initialAllocations: allocations,
              stock_status: status,

              is_allocated:
                status === "allocated" || Boolean(rawLine.is_allocated),
            };
          },
        );

        const warehouseIds = Array.from(
          new Set(
            normalizedLines.map((line) => line.warehouse_id).filter(Boolean),
          ),
        );

        const locationResults = await Promise.all(
          warehouseIds.map(async (warehouseId) => {
            const locations = await fetchLocationsForWarehouse(warehouseId);

            return {
              warehouseId,
              locations,
            };
          }),
        );

        if (!cancelled) {
          const locationMap: Record<string, LocationOption[]> = {};

          for (const result of locationResults) {
            locationMap[result.warehouseId] = result.locations;
          }

          setLocationsByWarehouse(locationMap);
        }

        setLines(normalizedLines);
        // } else {
        //   setLines([createInitialRow(entryDate)]);
        // }
      } catch (error: unknown) {
        console.error("Failed loading Item Journal data:", error);

        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load item journal.";

          setErrorMsg(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          hide();
        }
      }
    };

    void fetchMasterData();

    return () => {
      cancelled = true;
      hide();
    };
  }, [journalId, apiBase, show, hide]);

  const handleLineChange = useCallback(
    (
      index: number,
      field: keyof ItemJournalLineRow,
      value: string | number,
    ) => {
      if (formDisabled) {
        return;
      }

      setLines((previous) =>
        previous.map((existingLine, lineIndex) => {
          if (lineIndex !== index) {
            return existingLine;
          }

          const updatedLine: ItemJournalLineRow = {
            ...existingLine,
            [field]: value,
          } as ItemJournalLineRow;

          if (field === "quantity" || field === "cost_per_unit") {
            const quantity =
              field === "quantity"
                ? Number(value || 0)
                : Number(updatedLine.quantity || 0);

            const cost =
              field === "cost_per_unit"
                ? Number(value || 0)
                : Number(updatedLine.cost_per_unit || 0);

            updatedLine.quantity = quantity;

            updatedLine.cost_per_unit = cost;

            updatedLine.amount = calculateAmount(quantity, cost);

            const allocationTotal = getAllocationTotal(updatedLine.allocations);

            if (allocationTotal > quantity) {
              updatedLine.allocations = [];

              updatedLine.initialAllocations = [];

              updatedLine.stock_status = "unallocated";

              updatedLine.is_allocated = false;
            } else {
              updatedLine.stock_status = getStockStatus(
                quantity,
                updatedLine.allocations,
              );

              updatedLine.is_allocated =
                updatedLine.stock_status === "allocated";
            }
          }

          return updatedLine;
        }),
      );
    },
    [formDisabled],
  );

  const addLineRow = useCallback(() => {
    if (formDisabled) {
      return;
    }

    setLines((previous) => [
      ...previous,
      createInitialRow(metadata.entry_date),
    ]);
  }, [formDisabled, metadata.entry_date]);

  const removeLineRow = useCallback(
    (index: number) => {
      if (formDisabled) {
        return;
      }

      setLines((previous) => {
        if (previous.length <= 1) {
          return [createInitialRow(metadata.entry_date)];
        }

        return previous.filter((_, lineIndex) => lineIndex !== index);
      });
    },
    [formDisabled, metadata.entry_date],
  );

  const buildItemLine = useCallback(
    async (item: ItemLookupRecord): Promise<ItemJournalLineRow> => {
      let defaultWarehouse: {
        id?: string;
        code?: string;
        name?: string;
      } | null = null;

      try {
        const response = await fetch(
          `/api/lookups/default-warehouse?item_id=${encodeURIComponent(
            item.id,
          )}`,
        );

        if (response.ok) {
          const payload = await response.json();

          defaultWarehouse = payload.data ?? payload;
        }
      } catch (error: unknown) {
        console.error("Failed to fetch default warehouse:", error);
      }

      const unitCost = Number(item.standard_cost || 0);

      return createInitialRow(metadata.entry_date, {
        item_id: String(item.id || ""),

        item_no: item.item_code || "",

        item_description: item.description || item.name || "",

        cost_per_unit: unitCost,

        uom: item.base_uom_name || "Pcs",

        warehouse_id: defaultWarehouse?.id || "",

        warehouse_code: defaultWarehouse?.code || "",

        warehouse_name: defaultWarehouse?.name || "",

        allocations: [],

        initialAllocations: [],

        stock_status: "unallocated",

        is_allocated: false,
      });
    },
    [metadata.entry_date],
  );

  const handleMultipleItemSelect = useCallback(
    async (items: ItemLookupRecord[]): Promise<void> => {
      if (!items.length) {
        setItemActiveModal(null);
        return;
      }

      try {
        show("Loading item information...");

        const newLines = await Promise.all(items.map(buildItemLine));

        if (itemActiveModal !== null) {
          const targetIndex = itemActiveModal.index;

          setLines((previous) =>
            previous.map((line, index) =>
              index === targetIndex ? newLines[0] : line,
            ),
          );
        } else {
          setLines((previous) => [...previous, ...newLines]);
        }

        const warehouseIds = Array.from(
          new Set(newLines.map((line) => line.warehouse_id).filter(Boolean)),
        );

        const locationResults = await Promise.all(
          warehouseIds.map(async (warehouseId) => ({
            warehouseId,
            locations: await fetchLocationsForWarehouse(warehouseId),
          })),
        );

        setLocationsByWarehouse((previous) => {
          const updated = { ...previous };

          for (const result of locationResults) {
            updated[result.warehouseId] = result.locations;
          }

          return updated;
        });
      } catch (error: unknown) {
        console.error("Failed to add selected items:", error);

        toast.error("Failed to load selected item.");
      } finally {
        hide();
        setItemActiveModal(null);
      }
    },
    [itemActiveModal, buildItemLine, fetchLocationsForWarehouse, show, hide],
  );

  const handleWarehouseSelect = useCallback(
    async (warehouse: WarehouseLookupRecord): Promise<void> => {
      if (warehouseIndex === null) {
        return;
      }

      const targetIndex = warehouseIndex;

      const warehouseId = String(warehouse.id || "");

      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          return {
            ...line,

            warehouse_id: warehouseId,
            warehouse_code: warehouse.code || "",
            warehouse_name: warehouse.name || "",

            location_id: "",
            location_name: "",

            allocations: [],
            initialAllocations: [],
            stock_status: "unallocated",
            is_allocated: false,
          };
        }),
      );

      if (warehouseId) {
        const warehouseLocations =
          await fetchLocationsForWarehouse(warehouseId);

        setLocationsByWarehouse((previous) => ({
          ...previous,
          [warehouseId]: warehouseLocations,
        }));
      }

      setWarehouseIndex(null);
    },
    [warehouseIndex, fetchLocationsForWarehouse],
  );

  const handleLocationSelect = useCallback(
    (targetIndex: number, location: LocationOption) => {
      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          return {
            ...line,
            location_id: String(location.id || ""),
            location_name: location.title || "",
          };
        }),
      );

      setLocationIndex(null);
    },
    [],
  );

  const handleModalSelection = useCallback(
    (selectedRecord: GLAccountLookupRecord) => {
      if (!activeModal) {
        return;
      }

      const targetIndex = activeModal.index;

      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          return {
            ...line,

            balancing_account_id: selectedRecord.id,

            balancing_display_name: selectedRecord.code
              ? `${selectedRecord.code} - ${selectedRecord.name}`
              : selectedRecord.name,
          };
        }),
      );

      setActiveModal(null);
    },
    [activeModal],
  );

  const handleOpenAllocation = useCallback(
    (line: ItemJournalLineRow) => {
      // if (formDisabled) {
      //   return;
      // }

      if (!line.item_id) {
        toast.error("Please select an item first.");
        return;
      }

      if (!line.warehouse_id) {
        toast.error("Please select a warehouse first.");
        return;
      }

      if (Number(line.quantity || 0) <= 0) {
        toast.error("Please enter a quantity first.");
        return;
      }

      setActiveAllocationLineId(line._stableKey);

      setIsAllocationModalOpen(true);
    },
    [],
    // [formDisabled],
  );

  const handleSaveAllocations = useCallback(
    (allocationsData: StockAllocationRecord[]) => {
      if (!activeAllocationLineId) {
        return;
      }

      setLines((previous) =>
        previous.map((line) => {
          if (line._stableKey !== activeAllocationLineId) {
            return line;
          }

          const quantity = Number(line.quantity || 0);

          const sanitizedAllocations = allocationsData
            .map((allocation) => ({
              ...allocation,
              location_id: allocation.location_id
                ? String(allocation.location_id)
                : line.location_id,

              quantity: Number(allocation.quantity || 0),
            }))
            .filter((allocation) => allocation.quantity > 0);

          const status = getStockStatus(quantity, sanitizedAllocations);

          return {
            ...line,

            allocations: sanitizedAllocations,

            initialAllocations: sanitizedAllocations,

            stock_status: status,

            is_allocated: status === "allocated",
          };
        }),
      );

      setIsAllocationModalOpen(false);

      setActiveAllocationLineId(null);
    },
    [activeAllocationLineId],
  );

  const validateBeforeSave = useCallback(
    (postToLedger: boolean): string | null => {
      if (!metadata.entry_date) {
        return "Journal date is required.";
      }

      if (!lines.length) {
        return "At least one journal line is required.";
      }

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];

        const lineNumber = index + 1;

        if (!line.item_id) {
          return `Line ${lineNumber}: Item is required.`;
        }

        if (!line.warehouse_id) {
          return `Line ${lineNumber}: Warehouse is required.`;
        }

        if (!line.location_id) {
          return `Line ${lineNumber}: Location is required.`;
        }

        if (Number(line.quantity || 0) <= 0) {
          return `Line ${lineNumber}: Quantity must be greater than zero.`;
        }

        if (Number(line.cost_per_unit || 0) < 0) {
          return `Line ${lineNumber}: Cost per unit cannot be negative.`;
        }

        if (!line.balancing_account_id) {
          return `Line ${lineNumber}: Balancing G/L account is required.`;
        }

        if (postToLedger) {
          const allocatedQuantity = getAllocationTotal(line.allocations);

          const journalQuantity = Number(line.quantity || 0);

          if (allocatedQuantity !== journalQuantity) {
            return `Line ${lineNumber}: Stock allocation must equal the journal quantity before posting.`;
          }

          if (allocatedQuantity !== Number(line.quantity || 0)) {
            return `Line ${lineNumber}: Stock allocation must equal the journal quantity before posting.`;
          }

          for (
            let allocationIndex = 0;
            allocationIndex < line.allocations.length;
            allocationIndex++
          ) {
            const allocation = line.allocations[allocationIndex];

            if (!allocation.location_id) {
              return `Line ${lineNumber}: Allocation ${allocationIndex + 1} is missing a location.`;
            }

            if (Number(allocation.quantity || 0) <= 0) {
              return `Line ${lineNumber}: Allocation ${allocationIndex + 1} must have a quantity greater than zero.`;
            }
          }
        }
      }

      return null;
    },
    [metadata.entry_date, lines],
  );

  // postToLedger: boolean
  const buildApiPayload = useCallback(
    () => ({
      entry_date: metadata.entry_date,

      // is_posted: postToLedger,
      is_posted: false,

      source: "ITEM",

      lines: lines.map((line) => ({
        posting_date: line.posting_date,

        transaction_type: line.transaction_type,

        item_id: line.item_id,
        item_no: line.item_no,
        item_description: line.item_description,

        warehouse_id: line.warehouse_id,
        warehouse_code: line.warehouse_code,
        warehouse_name: line.warehouse_name,

        location_id: line.location_id,
        location_name: line.location_name,

        quantity: Number(line.quantity || 0),

        uom: line.uom,

        cost_per_unit: Number(line.cost_per_unit || 0),

        amount: Number(line.amount || 0),

        balancing_account_id: line.balancing_account_id,
        balancing_display_name: line.balancing_display_name,

        allocations: line.allocations.map((allocation) => ({
          location_id: allocation.location_id || line.location_id,
          date_received: allocation.date_received,
          prod_date: allocation.prod_date,
          expiry_date: allocation.expiry_date,
          batch_no: allocation.batch_no,
          serial_no: allocation.serial_no,
          quantity: Number(allocation.quantity || 0),
        })),
      })),
    }),
    [metadata.entry_date, lines],
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (loading) {
      return false;
    }

    setErrorMsg(null);

    const validationError = validateBeforeSave(false);

    if (validationError) {
      setErrorMsg(validationError);

      toast.error(validationError);

      return false;
    }

    setLoading(true);

    try {
      show("Saving Draft...");

      const payload = buildApiPayload();

      const response = await fetch(
        journalId ? `${apiBase}/${journalId}` : apiBase,
        {
          method: journalId ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      let responsePayload: ApiResponse | null = null;

      try {
        responsePayload = (await response.json()) as ApiResponse;
      } catch {
        responsePayload = null;
      }

      if (!response.ok) {
        throw new Error(
          responsePayload?.message ||
            responsePayload?.error ||
            "Failed to save item journal.",
        );
      }

      toast.success("Item journal saved successfully.");

      router.push(redirectPath);

      return true;
    } catch (error: unknown) {
      console.error("Failed to save item journal:", error);

      const message =
        error instanceof Error ? error.message : "Failed to save item journal.";

      setErrorMsg(message);

      toast.error(message);

      return false;
    } finally {
      setLoading(false);
      hide();
    }
  }, [
    loading,
    validateBeforeSave,
    buildApiPayload,
    journalId,
    apiBase,
    router,
    redirectPath,
    show,
    hide,
  ]);

  const postJournal = useCallback(async (): Promise<boolean> => {
    if (loading) {
      return false;
    }

    setErrorMsg(null);

    const validationError = validateBeforeSave(true);

    if (validationError) {
      setErrorMsg(validationError);

      toast.error(validationError);

      return false;
    }

    setLoading(true);

    try {
      show("Saving Journal...");

      const payload = buildApiPayload();

      /**
       * -----------------------------------------------------
       * 1. Save/update the current draft first.
       * -----------------------------------------------------
       */
      const saveResponse = await fetch(
        journalId ? `${apiBase}/${journalId}` : apiBase,
        {
          method: journalId ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      let savePayload: ApiResponse | null = null;

      try {
        savePayload = (await saveResponse.json()) as ApiResponse;
      } catch {
        savePayload = null;
      }

      if (!saveResponse.ok) {
        throw new Error(
          savePayload?.message ||
            savePayload?.error ||
            "Failed to save item journal before posting.",
        );
      }

      /**
       * -----------------------------------------------------
       * 2. Determine the journal ID.
       *
       * For a new journal the POST response should
       * contain the created journal.
       * -----------------------------------------------------
       */
      const savedJournal =
        (savePayload as Record<string, unknown> | null)?.journal ??
        (savePayload as Record<string, unknown> | null)?.data ??
        savePayload;

      const savedJournalRecord = savedJournal as Record<string, unknown> | null;

      if (journalId) {
        setCurrentJournalId(journalId);
      }

      const id = journalId || String(savedJournalRecord?.id || "");

      if (!id) {
        throw new Error(
          "Item journal was saved but no journal ID was returned.",
        );
      }

      setCurrentJournalId(id);

      /**
       * -----------------------------------------------------
       * 3. Actual posting.
       *
       * This is intentionally NOT PUT /:id.
       * It uses the dedicated posting route.
       * -----------------------------------------------------
       */
      show("Posting Journal...");

      const postResponse = await fetch(`${apiBase}/${id}/post`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
      });

      let postPayload: ApiResponse | null = null;

      try {
        postPayload = (await postResponse.json()) as ApiResponse;
      } catch {
        postPayload = null;
      }

      if (!postResponse.ok) {
        throw new Error(
          postPayload?.message ||
            postPayload?.error ||
            "Failed to post item journal.",
        );
      }

      setIsPosted(true);
      setIsEditing(false);

      toast.success("Item journal posted successfully.");

      router.push(redirectPath);

      return true;
    } catch (error: unknown) {
      console.error("Failed to post item journal:", error);

      const message =
        error instanceof Error ? error.message : "Failed to post item journal.";

      setErrorMsg(message);

      toast.error(message);

      return false;
    } finally {
      setLoading(false);
      hide();
    }
  }, [
    loading,
    validateBeforeSave,
    buildApiPayload,
    journalId,
    apiBase,
    router,
    redirectPath,
    show,
    hide,
  ]);

  const handleSaveOrPost = useCallback(
    async (postToLedger = false): Promise<boolean> => {
      if (postToLedger) {
        return postJournal();
      }

      return saveDraft();
    },
    [postJournal, saveDraft],
  );

  return {
    loading,
    isPosted,
    errorMsg,
    isEditing,

    setIsEditing,
    setErrorMsg,

    metadata,
    lines,

    locationsByWarehouse,
    warehouses,

    formDisabled,

    activeAllocationLine,
    isAllocationModalOpen,
    itemActiveModal,
    activeModal,
    warehouseIndex,
    locationIndex,

    setItemActiveModal,
    setActiveModal,
    setWarehouseIndex,
    setLocationIndex,
    setIsAllocationModalOpen,
    setActiveAllocationLineId,

    handleLineChange,
    addLineRow,
    removeLineRow,
    handleMultipleItemSelect,
    handleWarehouseSelect,
    handleLocationSelect,
    handleModalSelection,
    handleOpenAllocation,
    handleSaveAllocations,
    handleSaveOrPost,
    saveDraft,
    postJournal,
  };
}

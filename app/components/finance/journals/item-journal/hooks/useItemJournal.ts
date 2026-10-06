// app/components/finance/journals/item-journal/hooks/useItemJournal.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLoader } from "@/app/context/LoaderContext";

import type {
  ItemJournalFormProps,
  ItemJournalAllocationRecord,
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

import type { GLAccountLookupRecord } from "@/app/components/shared/modals/GLAccountLookupModal";
import type { WarehouseLookupRecord } from "@/app/components/shared/modals/WarehouseLookupModal";
import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

// import type {
//   StockAllocationRecord,
//   StockSequenceRecord,
// } from "@/app/components/shared/modals/StockAllocationModal";

import type {
  StockSequenceRecord,
  AvailableStockRecord,
  StockAllocationRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

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

  const [existingSequences, setExistingSequences] = useState<
    StockSequenceRecord[]
  >([]);

  const [availableStock, setAvailableStock] = useState<AvailableStockRecord[]>(
    [],
  );

  const formDisabled = readOnly || isPosted || !isEditing || loading;

  /**
   * ---------------------------------------------------------
   * Active allocation line
   * ---------------------------------------------------------
   */
  const activeAllocationLine = useMemo(() => {
    if (!activeAllocationLineId) {
      return null;
    }

    return (
      lines.find((line) => line._stableKey === activeAllocationLineId) || null
    );
  }, [activeAllocationLineId, lines]);

  /**
   * ---------------------------------------------------------
   * Generic API response message
   * ---------------------------------------------------------
   */
  const getApiMessage = useCallback(
    async (response: Response, fallback: string): Promise<string> => {
      try {
        const payload: ApiResponse = await response.json();

        return payload?.message || payload?.error || fallback;
      } catch {
        return fallback;
      }
    },
    [],
  );

  /**
   * ---------------------------------------------------------
   * Fetch locations
   * ---------------------------------------------------------
   */
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
          throw new Error(
            await getApiMessage(response, "Failed to load locations."),
          );
        }

        const payload = await response.json();

        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

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
      } catch (error) {
        console.error(
          `Failed to load locations for warehouse ${warehouseId}:`,
          error,
        );

        return [];
      }
    },
    [getApiMessage],
  );

  /**
   * ---------------------------------------------------------
   * Fetch stock sequences
   * ---------------------------------------------------------
   */
  const fetchStockSequences = useCallback(
    async (
      itemId: string,
      warehouseId: string,
      locationId?: string,
    ): Promise<StockSequenceRecord[]> => {
      if (!itemId || !warehouseId) {
        return [];
      }

      const params = new URLSearchParams();

      params.set("item_id", itemId);
      params.set("warehouse_id", warehouseId);

      if (locationId) {
        params.set("location_id", locationId);
      }

      try {
        const response = await fetch(
          `/api/inventory/stock-sequences?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(
            await getApiMessage(response, "Failed to load stock sequences."),
          );
        }

        const payload = await response.json();

        const rawData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.sequences)
              ? payload.sequences
              : Array.isArray(payload?.data?.sequences)
                ? payload.data.sequences
                : [];

        if (!Array.isArray(rawData)) {
          return [];
        }

        const numberValue = (value: unknown): number => {
          const number = Number(value);

          return Number.isFinite(number) ? number : 0;
        };

        return rawData
          .map(
            (
              raw: Record<string, unknown> | null | undefined,
            ): StockSequenceRecord => {
              const row = raw || {};

              return {
                location_id: String(
                  row.location_id ?? row.locationId ?? locationId ?? "",
                ),

                location_name: String(
                  row.location_name ??
                    row.locationName ??
                    row.location_title ??
                    "",
                ),

                batch_no: String(
                  row.batch_no ?? row.batchNo ?? row.batch ?? "",
                ),

                sequence_no: String(
                  row.sequence_no ?? row.sequenceNo ?? row.sequence ?? "",
                ),

                serial_no: String(
                  row.serial_no ?? row.serialNo ?? row.serial ?? "",
                ),

                date_received: String(
                  row.date_received ?? row.dateReceived ?? "",
                ),

                prod_date: String(
                  row.prod_date ??
                    row.production_date ??
                    row.productionDate ??
                    "",
                ),

                expiry_date: String(
                  row.expiry_date ?? row.use_by_date ?? row.expiryDate ?? "",
                ),

                available_quantity: numberValue(
                  row.available_quantity ??
                    row.available_qty ??
                    row.availableQuantity ??
                    row.quantity ??
                    0,
                ),
              };
            },
          )
          .filter((sequence) => Boolean(sequence.sequence_no));
      } catch (error) {
        console.error("Failed to load stock sequences:", error);

        throw error;
      }
    },
    [getApiMessage],
  );

  const fetchAvailableStock = useCallback(
    async (
      itemId: string,
      warehouseId: string,
    ): Promise<AvailableStockRecord[]> => {
      if (!itemId || !warehouseId) {
        return [];
      }

      const params = new URLSearchParams({
        item_id: itemId,
        warehouse_id: warehouseId,
      });

      const response = await fetch(
        `/api/sales/sales-orders/available-batches?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          await getApiMessage(
            response,
            "Failed to load available source stock.",
          ),
        );
      }

      const payload = await response.json();

      const rawData: unknown[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

      // const rawData: unknown[] = Array.isArray(payload?.data)
      //   ? payload.data
      //   : [];

      return rawData
        .map((raw): AvailableStockRecord | null => {
          if (!raw || typeof raw !== "object") {
            return null;
          }

          const row = raw as Record<string, unknown>;

          const sourceAllocationId = String(row.source_allocation_id ?? "");

          if (!sourceAllocationId) {
            return null;
          }

          return {
            id: String(row.id ?? sourceAllocationId),

            source_allocation_id: sourceAllocationId,

            inbound_entry_id:
            row.inbound_entry_id === null ||
            row.inbound_entry_id === undefined
              ? null
              : String(row.inbound_entry_id),

            // inbound_entry_id:
            //   row.inbound_entry_id !== null &&
            //   row.inbound_entry_id !== undefined
            //     ? String(row.inbound_entry_id)
            //     : null,

            location_id: String(row.location_id ?? ""),
            location_name: String(row.location_name ?? ""),

            date_received: String(row.date_received ?? ""),
            prod_date: String(row.prod_date ?? ""),
            expiry_date: String(row.expiry_date ?? ""),

            batch_no: String(row.batch_no ?? ""),
            bin_code: String(row.bin_code ?? ""),
            serial_no: String(row.serial_no ?? ""),

            available_quantity: Number(
              row.available_quantity ?? row.available_qty ?? 0,
            ),

            unit_cost: Number(row.unit_cost ?? 0),
          };
        })
        .filter(
          (row): row is AvailableStockRecord =>
            row !== null && row.available_quantity > 0,
        );
    },
    [getApiMessage],
  );

  /**
   * ---------------------------------------------------------
   * Normalize stock allocation
   * ---------------------------------------------------------
   */
  const normalizeAllocation = useCallback(
    (
      allocation: Partial<ItemJournalAllocationRecord>,
      fallbackLocationId = "",
      fallbackLocationName = "",
    ): ItemJournalAllocationRecord => ({
      id: allocation.id ?? null,

      source_allocation_id: allocation.source_allocation_id ?? null,

      inbound_entry_id: allocation.inbound_entry_id ?? null,

      location_id: allocation.location_id
        ? String(allocation.location_id)
        : fallbackLocationId,

      location_name: allocation.location_name || fallbackLocationName || "",

      date_received: String(allocation.date_received ?? ""),

      prod_date: String(allocation.prod_date ?? ""),

      expiry_date: String(allocation.expiry_date ?? ""),

      batch_no: String(allocation.batch_no ?? ""),

      bin_code: String(allocation.bin_code ?? ""),

      sequence_no: String(allocation.sequence_no ?? ""),

      serial_no: String(allocation.serial_no ?? ""),

      quantity: Number(allocation.quantity ?? 0),

      available_quantity:
        allocation.available_quantity === undefined
          ? undefined
          : Number(allocation.available_quantity ?? 0),

      unit_cost:
        allocation.unit_cost === undefined
          ? undefined
          : Number(allocation.unit_cost ?? 0),
    }),
    [],
  );

  /**
   * ---------------------------------------------------------
   * Load warehouses + journal
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const fetchMasterData = async (): Promise<void> => {
      setLoading(true);
      setErrorMsg(null);

      try {
        show("Loading data...");

        /**
         * Load warehouses.
         */
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

        /**
         * Create warehouse lookup.
         */
        const warehouseMap = new Map<string, WarehouseOption>(
          warehouseOptions.map((warehouse) => [
            String(warehouse.id),
            warehouse,
          ]),
        );

        /**
         * New journal.
         */
        if (!journalId) {
          if (!cancelled) {
            const entryDate = today();

            setCurrentJournalId(null);
            setIsPosted(false);
            setIsEditing(!readOnly);

            setMetadata({
              entry_no: "",
              entry_date: entryDate,
            });

            setLines([createInitialRow(entryDate)]);
          }

          return;
        }

        /**
         * Existing journal.
         */
        const response = await fetch(`${apiBase}/${journalId}`);

        if (!response.ok) {
          throw new Error(
            await getApiMessage(response, "Failed to load item journal."),
          );
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const journal =
          data?.journal ?? data?.data?.journal ?? data?.data ?? data;

        const posted = Boolean(journal?.is_posted);

        setCurrentJournalId(String(journal?.id ?? journalId));

        setIsPosted(posted);

        setIsEditing(!posted && !readOnly);

        const entryDate = normalizeDate(journal?.entry_date) || today();

        setMetadata({
          entry_no: String(journal?.entry_no ?? ""),

          entry_date: entryDate,
        });

        const apiLines =
          data?.lines ?? data?.data?.lines ?? journal?.lines ?? [];

        if (!Array.isArray(apiLines) || apiLines.length === 0) {
          setLines([createInitialRow(entryDate)]);

          return;
        }

        const normalizedLines: ItemJournalLineRow[] = apiLines.map(
          (rawLine: Record<string, unknown>) => {
            const getString = (key: string): string => {
              const value = rawLine[key];

              return value === null || value === undefined ? "" : String(value);
            };

            const numberValue = (value: unknown): number => {
              const number = Number(value);

              return Number.isFinite(number) ? number : 0;
            };

            const quantity = numberValue(rawLine.quantity);

            const cost = numberValue(
              rawLine.cost_per_unit ?? rawLine.unit_cost,
            );

            const warehouseId = getString("warehouse_id");

            const warehouse = warehouseMap.get(warehouseId);

            const debit = numberValue(rawLine.debit);

            const credit = numberValue(rawLine.credit);

            const rawTransactionType = getString("transaction_type");

            const transactionType =
              rawTransactionType === "Positive Entry"
                ? "Positive Entry"
                : rawTransactionType === "Negative Entry"
                  ? "Negative Entry"
                  : debit > credit
                    ? "Positive Entry"
                    : "Negative Entry";

            const rawAllocations = rawLine.allocations;

            const rawInitialAllocations =
              rawLine.initialAllocations ?? rawLine.initial_allocations;

            const allocationSource = Array.isArray(rawAllocations)
              ? rawAllocations
              : Array.isArray(rawInitialAllocations)
                ? rawInitialAllocations
                : [];

            // const allocations: StockAllocationRecord[] = allocationSource.map(
            //   (allocation: StockAllocationRecord) =>
            //     normalizeAllocation(
            //       allocation,
            //       getString("location_id"),
            //       getString("location_name"),
            //     ),
            // );

            const accountId =
              getString("balancing_account_id") || getString("account_id");

            const accountCode = getString("account_code");

            const accountName = getString("account_name");

            const balancingDisplayName =
              getString("balancing_display_name") ||
              (accountCode && accountName
                ? `${accountCode} - ${accountName}`
                : accountName || accountCode || "");

            const serverAllocations = allocationSource.map((allocation) =>
              normalizeAllocation(
                allocation,
                getString("location_id"),
                getString("location_name"),
              ),
            );

            const allocations = serverAllocations.map((allocation) => ({
              ...allocation,
            }));

            const initialAllocations = serverAllocations.map((allocation) => ({
              ...allocation,
            }));
            // const status = getStockStatus(quantity, allocations);

            return {
              _stableKey: createStableKey(),

              posting_date:
                normalizeDate(getString("posting_date")) || entryDate,

              transaction_type: transactionType,

              item_id: getString("item_id"),

              item_no: getString("item_no") || getString("item_code"),

              item_description:
                getString("item_description") || getString("description"),

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

              initialAllocations,

              stock_status: getStockStatus(quantity, allocations),

              is_allocated:
                getStockStatus(quantity, allocations) === "allocated",

              // initialAllocations: allocations.map((allocation) => ({
              //   ...allocation,
              // })),

              // stock_status: status,

              // is_allocated:
              //   status === "allocated" || Boolean(rawLine.is_allocated),
            };
          },
        );

        /**
         * Load locations for warehouses
         * used by the existing journal.
         */
        const warehouseIds = Array.from(
          new Set(
            normalizedLines.map((line) => line.warehouse_id).filter(Boolean),
          ),
        );

        const locationResults = await Promise.all(
          warehouseIds.map(async (warehouseId) => ({
            warehouseId,
            locations: await fetchLocationsForWarehouse(warehouseId),
          })),
        );

        if (!cancelled) {
          const locationMap: Record<string, LocationOption[]> = {};

          for (const result of locationResults) {
            locationMap[result.warehouseId] = result.locations;
          }

          setLocationsByWarehouse(locationMap);

          setLines(normalizedLines);
        }
      } catch (error: unknown) {
        console.error("Failed loading Item Journal data:", error);

        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load item journal.";

          setErrorMsg(message);
          toast.error(message);
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
  }, [
    journalId,
    apiBase,
    readOnly,
    show,
    hide,
    fetchLocationsForWarehouse,
    getApiMessage,
  ]);

  /**
   * ---------------------------------------------------------
   * Metadata change
   * ---------------------------------------------------------
   */
  const handleMetadataChange = useCallback(
    (field: keyof JournalMetadata, value: string) => {
      if (formDisabled) {
        return;
      }

      setMetadata((previous) => ({
        ...previous,
        [field]: value,
      }));

      if (field === "entry_date" && value) {
        setLines((previous) =>
          previous.map((line) => ({
            ...line,
            posting_date: line.posting_date || value,
          })),
        );
      }
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Line change
   * ---------------------------------------------------------
   */
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

            updatedLine.quantity = Number.isFinite(quantity) ? quantity : 0;

            updatedLine.cost_per_unit = Number.isFinite(cost) ? cost : 0;

            updatedLine.amount = calculateAmount(
              updatedLine.quantity,
              updatedLine.cost_per_unit,
            );

            const allocationTotal = getAllocationTotal(updatedLine.allocations);

            if (allocationTotal > updatedLine.quantity) {
              updatedLine.allocations = [];

              // updatedLine.initialAllocations = [];

              updatedLine.stock_status = "unallocated";

              updatedLine.is_allocated = false;
            } else {
              updatedLine.stock_status = getStockStatus(
                updatedLine.quantity,
                updatedLine.allocations,
              );

              updatedLine.is_allocated =
                updatedLine.stock_status === "allocated";
            }
          }

          if (field === "item_id" && !String(value || "")) {
            updatedLine.allocations = [];

            // updatedLine.initialAllocations = [];

            updatedLine.stock_status = "unallocated";

            updatedLine.is_allocated = false;
          }

          return updatedLine;
        }),
      );
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Add line
   * ---------------------------------------------------------
   */
  const addLineRow = useCallback(() => {
    if (formDisabled) {
      return;
    }

    setLines((previous) => [
      ...previous,
      createInitialRow(metadata.entry_date),
    ]);
  }, [formDisabled, metadata.entry_date]);

  /**
   * ---------------------------------------------------------
   * Remove line
   * ---------------------------------------------------------
   */
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

      if (
        activeAllocationLineId &&
        lines[index]?._stableKey === activeAllocationLineId
      ) {
        setIsAllocationModalOpen(false);
        setActiveAllocationLineId(null);
        setExistingSequences([]);
      }
    },
    [formDisabled, metadata.entry_date, activeAllocationLineId, lines],
  );

  /**
   * ---------------------------------------------------------
   * Build item line
   * ---------------------------------------------------------
   */
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
            String(item.id),
          )}`,
        );

        if (response.ok) {
          const payload = await response.json();

          defaultWarehouse = payload?.data ?? payload;
        }
      } catch (error: unknown) {
        console.error("Failed to fetch default warehouse:", error);
      }

      const unitCost = Number(item.standard_cost || 0);

      return createInitialRow(metadata.entry_date, {
        item_id: String(item.id || ""),

        item_no: item.item_code || "",

        item_description: item.description || item.name || "",

        cost_per_unit: Number.isFinite(unitCost) ? unitCost : 0,

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

  /**
   * ---------------------------------------------------------
   * Open item modal
   * ---------------------------------------------------------
   */
  const openItemModal = useCallback(
    (index: number) => {
      if (formDisabled) {
        return;
      }

      setItemActiveModal({
        index,
        type: "item",
        target: "item",
      });
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Close item modal
   * ---------------------------------------------------------
   */
  const closeItemModal = useCallback(() => {
    setItemActiveModal(null);
  }, []);

  /**
   * ---------------------------------------------------------
   * Select item(s)
   * ---------------------------------------------------------
   */
  const handleMultipleItemSelect = useCallback(
    async (items: ItemLookupRecord[]): Promise<void> => {
      if (!items.length) {
        setItemActiveModal(null);
        return;
      }

      if (formDisabled) {
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
          const updated = {
            ...previous,
          };

          for (const result of locationResults) {
            updated[result.warehouseId] = result.locations;
          }

          return updated;
        });

        toast.success(
          items.length === 1
            ? "Item selected."
            : `${items.length} items selected.`,
        );
      } catch (error: unknown) {
        console.error("Failed to add selected items:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load selected item.",
        );
      } finally {
        hide();
        setItemActiveModal(null);
      }
    },
    [
      formDisabled,
      itemActiveModal,
      buildItemLine,
      fetchLocationsForWarehouse,
      show,
      hide,
    ],
  );

  /**
   * ---------------------------------------------------------
   * Open warehouse modal
   * ---------------------------------------------------------
   */
  const openWarehouseModal = useCallback(
    (index: number) => {
      if (formDisabled) {
        return;
      }

      setWarehouseIndex(index);
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Close warehouse modal
   * ---------------------------------------------------------
   */
  const closeWarehouseModal = useCallback(() => {
    setWarehouseIndex(null);
  }, []);

  /**
   * ---------------------------------------------------------
   * Select warehouse
   * ---------------------------------------------------------
   */
  const handleWarehouseSelect = useCallback(
    async (warehouse: WarehouseLookupRecord): Promise<void> => {
      if (warehouseIndex === null || formDisabled) {
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

      setExistingSequences([]);
      setWarehouseIndex(null);
    },
    [warehouseIndex, formDisabled, fetchLocationsForWarehouse],
  );

  /**
   * ---------------------------------------------------------
   * Open location modal
   * ---------------------------------------------------------
   */
  const openLocationModal = useCallback(
    async (index: number) => {
      if (formDisabled) {
        return;
      }

      const line = lines[index];

      if (!line) {
        return;
      }

      if (!line.warehouse_id) {
        toast.error("Please select a warehouse first.");

        return;
      }

      if (!locationsByWarehouse[line.warehouse_id]) {
        const locations = await fetchLocationsForWarehouse(line.warehouse_id);

        setLocationsByWarehouse((previous) => ({
          ...previous,
          [line.warehouse_id]: locations,
        }));
      }

      setLocationIndex(index);
    },
    [formDisabled, lines, locationsByWarehouse, fetchLocationsForWarehouse],
  );

  /**
   * ---------------------------------------------------------
   * Close location modal
   * ---------------------------------------------------------
   */
  const closeLocationModal = useCallback(() => {
    setLocationIndex(null);
  }, []);

  /**
   * ---------------------------------------------------------
   * Select location
   * ---------------------------------------------------------
   */
  const handleLocationSelect = useCallback(
    (targetIndex: number, location: LocationOption) => {
      if (formDisabled) {
        return;
      }

      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          const locationId = String(location.id || "");

          const locationName = location.title || "";

          /**
           * A location change invalidates
           * allocations created against
           * the previous location.
           */
          return {
            ...line,

            location_id: locationId,

            location_name: locationName,

            allocations: [],

            initialAllocations: [],

            stock_status: "unallocated",

            is_allocated: false,
          };
        }),
      );

      setExistingSequences([]);
      setLocationIndex(null);
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Open G/L modal
   * ---------------------------------------------------------
   */
  const openGLModal = useCallback(
    (index: number) => {
      if (formDisabled) {
        return;
      }

      setActiveModal({
        index,
        type: "balancing_account",
        target: "gl",
      });
    },
    [formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Close G/L modal
   * ---------------------------------------------------------
   */
  const closeGLModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  /**
   * ---------------------------------------------------------
   * G/L selection
   * ---------------------------------------------------------
   */
  const handleModalSelection = useCallback(
    (selectedRecord: GLAccountLookupRecord) => {
      if (!activeModal || formDisabled) {
        return;
      }

      const targetIndex = activeModal.index;

      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          const code = selectedRecord.code || "";

          const name = selectedRecord.name || "";

          return {
            ...line,

            balancing_account_id: String(selectedRecord.id || ""),

            balancing_display_name:
              code && name ? `${code} - ${name}` : name || code,
          };
        }),
      );

      setActiveModal(null);
    },
    [activeModal, formDisabled],
  );

  /**
   * ---------------------------------------------------------
   * Open stock allocation
   * ---------------------------------------------------------
   */
  const handleOpenAllocation = useCallback(
    async (line: ItemJournalLineRow) => {
      if (formDisabled) {
        return;
      }

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
        show(
          line.transaction_type === "Negative Entry"
            ? "Loading available stock..."
            : "Loading stock sequences...",
        );

        if (line.transaction_type === "Positive Entry") {
          const sequences = await fetchStockSequences(
            line.item_id,
            line.warehouse_id,
            line.location_id,
          );

          setExistingSequences(sequences);
          setAvailableStock([]);
        } else {
          const stock = await fetchAvailableStock(
            line.item_id,
            line.warehouse_id,
          );

          setAvailableStock(stock);
          setExistingSequences([]);
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

  /**
   * ---------------------------------------------------------
   * Close allocation modal
   * ---------------------------------------------------------
   */
  const handleCloseAllocation = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
  }, []);

  /**
   * ---------------------------------------------------------
   * Save allocation
   * ---------------------------------------------------------
   */
  const handleSaveAllocations = useCallback(
    (allocationsData: StockAllocationRecord[]) => {
      if (!activeAllocationLineId || formDisabled) {
        return;
      }

      setLines((previous) =>
        previous.map((line) => {
          if (line._stableKey !== activeAllocationLineId) {
            return line;
          }

          const quantity = Number(line.quantity || 0);

          const sanitizedAllocations = allocationsData
            .map((allocation) =>
              normalizeAllocation(
                allocation,
                line.location_id,
                line.location_name,
              ),
            )
            .filter((allocation) => allocation.quantity > 0);

          const allocatedQuantity = getAllocationTotal(sanitizedAllocations);

          if (allocatedQuantity > quantity + 0.000001) {
            toast.error(
              "Allocated quantity cannot exceed the journal quantity.",
            );

            return line;
          }

          /**
           * Prevent the same stock sequence
           * from being allocated more than once.
           */
          const sequenceKeys = new Set<string>();

          for (const allocation of sanitizedAllocations) {
            if (!allocation.sequence_no) {
              continue;
            }

            const key = [
              allocation.location_id,
              allocation.sequence_no,
              allocation.batch_no,
              allocation.serial_no,
            ].join("|");

            if (sequenceKeys.has(key)) {
              toast.error(
                "The same stock sequence cannot be allocated more than once.",
              );

              return line;
            }

            sequenceKeys.add(key);
          }

          const status = getStockStatus(quantity, sanitizedAllocations);

          return {
            ...line,

            allocations: sanitizedAllocations,

            // initialAllocations: sanitizedAllocations.map((allocation) => ({
            //   ...allocation,
            // })),

            initialAllocations:
              line.initialAllocations?.map((allocation) => ({
                ...allocation,
              })) ?? [],

            stock_status: status,

            is_allocated: status === "allocated",
          };
        }),
      );

      setIsAllocationModalOpen(false);

      setActiveAllocationLineId(null);

      setExistingSequences([]);
    },
    [activeAllocationLineId, formDisabled, normalizeAllocation],
  );

  /**
   * ---------------------------------------------------------
   * Validation
   * ---------------------------------------------------------
   */
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

        const quantity = Number(line.quantity || 0);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return `Line ${lineNumber}: Quantity must be greater than zero.`;
        }

        const cost = Number(line.cost_per_unit || 0);

        if (!Number.isFinite(cost) || cost < 0) {
          return `Line ${lineNumber}: Cost per unit cannot be negative.`;
        }

        if (!line.balancing_account_id) {
          return `Line ${lineNumber}: Balancing G/L account is required.`;
        }

        /**
         * Stock allocation is mandatory
         * when posting.
         */
        if (postToLedger) {
          const allocatedQuantity = getAllocationTotal(line.allocations);

          if (Math.abs(allocatedQuantity - quantity) > 0.000001) {
            return `Line ${lineNumber}: Stock allocation must equal the journal quantity before posting.`;
          }

          if (!line.allocations.length) {
            return `Line ${lineNumber}: Stock allocation is required before posting.`;
          }

          for (
            let allocationIndex = 0;
            allocationIndex < line.allocations.length;
            allocationIndex++
          ) {
            const allocation = line.allocations[allocationIndex];

            const allocationNumber = allocationIndex + 1;

            if (!allocation.location_id) {
              return `Line ${lineNumber}: Allocation ${allocationNumber} is missing a location.`;
            }

            if (Number(allocation.quantity || 0) <= 0) {
              return `Line ${lineNumber}: Allocation ${allocationNumber} quantity must be greater than zero.`;
            }

            // if (!allocation.sequence_no) {
            //   return `Line ${lineNumber}: Allocation ${allocationNumber} is missing a stock sequence.`;
            // }

            if (
              line.transaction_type === "Positive Entry" &&
              !allocation.sequence_no
            ) {
              throw new Error(
                `Line ${lineNumber}, allocation ${allocationNumber}: Stock sequence is required for a positive entry.`,
              );
            }

            if (
              allocation.available_quantity !== undefined &&
              Number(allocation.quantity) >
                Number(allocation.available_quantity) + 0.000001
            ) {
              return `Line ${lineNumber}: Allocation ${allocationNumber} exceeds available stock.`;
            }
          }
        }
      }

      return null;
    },
    [metadata.entry_date, lines],
  );

  /**
   * ---------------------------------------------------------
   * Build API payload
   * ---------------------------------------------------------
   */
  const buildPayload = useCallback(
    (postToLedger: boolean) => {
      return {
        entry_no: metadata.entry_no || undefined,

        entry_date: metadata.entry_date,

        is_posted: postToLedger,

        post_to_ledger: postToLedger,

        lines: lines.map((line) => ({
          posting_date: line.posting_date || metadata.entry_date,

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

          amount: calculateAmount(
            Number(line.quantity || 0),
            Number(line.cost_per_unit || 0),
          ),

          balancing_account_id: line.balancing_account_id,

          balancing_display_name: line.balancing_display_name,

          allocations: line.allocations.map((allocation) =>
            normalizeAllocation(
              allocation,
              line.location_id,
              line.location_name,
            ),
          ),

          /**
           * Keep this field for APIs that
           * distinguish the original allocation
           * state from the current state.
           */
          initialAllocations:
            line.initialAllocations?.map((allocation) =>
              normalizeAllocation(
                allocation,
                line.location_id,
                line.location_name,
              ),
            ) ?? [],
        })),
      };
    },
    [metadata, lines, normalizeAllocation],
  );

  /**
   * ---------------------------------------------------------
   * Save journal
   * ---------------------------------------------------------
   */
  const saveJournal = useCallback(
    async (postToLedger = false): Promise<boolean> => {
      if (readOnly) {
        return false;
      }

      if (isPosted) {
        toast.error("This journal has already been posted.");

        return false;
      }

      const validationError = validateBeforeSave(postToLedger);

      if (validationError) {
        setErrorMsg(validationError);
        toast.error(validationError);

        return false;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        show(
          postToLedger ? "Posting item journal..." : "Saving item journal...",
        );

        const payload = buildPayload(postToLedger);

        const hasExistingJournal = Boolean(currentJournalId);

        const url = hasExistingJournal
          ? `${apiBase}/${currentJournalId}`
          : apiBase;

        const method = hasExistingJournal ? "PATCH" : "POST";

        const response = await fetch(url, {
          method,

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            await getApiMessage(
              response,
              postToLedger
                ? "Failed to post item journal."
                : "Failed to save item journal.",
            ),
          );
        }

        const responseData = await response.json();

        const returnedJournal =
          responseData?.journal ??
          responseData?.data?.journal ??
          responseData?.data ??
          responseData;

        const returnedId =
          returnedJournal?.id ?? responseData?.id ?? currentJournalId;

        if (returnedId) {
          setCurrentJournalId(String(returnedId));
        }

        if (postToLedger) {
          setIsPosted(true);
          setIsEditing(false);

          setLines((previous) =>
            previous.map((line) => ({
              ...line,

              initialAllocations: line.allocations.map((allocation) => ({
                ...allocation,
              })),

              stock_status: getStockStatus(
                Number(line.quantity || 0),
                line.allocations,
              ),

              is_allocated:
                getStockStatus(Number(line.quantity || 0), line.allocations) ===
                "allocated",
            })),
          );

          toast.success("Item journal posted successfully.");
        } else {
          setIsEditing(true);

          toast.success("Item journal saved successfully.");
        }

        /**
         * If the backend generated an entry number,
         * use it.
         */
        const returnedEntryNo =
          returnedJournal?.entry_no ?? responseData?.entry_no;

        if (returnedEntryNo) {
          setMetadata((previous) => ({
            ...previous,
            entry_no: String(returnedEntryNo),
          }));
        }

        /**
         * If this was a newly-created journal,
         * update the browser URL without forcing
         * a full page reload.
         */
        if (!hasExistingJournal && returnedId) {
          const nextPath = redirectPath.replace(/\/$/, "");

          /**
           * Prefer the normal journal detail
           * URL when redirectPath already contains
           * the expected route.
           *
           * Otherwise navigate to redirectPath.
           */
          if (nextPath.includes(String(returnedId))) {
            router.replace(nextPath);
          }
        }

        return true;
      } catch (error: unknown) {
        console.error("Failed to save item journal:", error);

        const message =
          error instanceof Error
            ? error.message
            : postToLedger
              ? "Failed to post item journal."
              : "Failed to save item journal.";

        setErrorMsg(message);
        toast.error(message);

        return false;
      } finally {
        setLoading(false);
        hide();
      }
    },
    [
      readOnly,
      isPosted,
      validateBeforeSave,
      show,
      buildPayload,
      currentJournalId,
      apiBase,
      getApiMessage,
      redirectPath,
      router,
      hide,
    ],
  );

  /**
   * ---------------------------------------------------------
   * Save draft
   * ---------------------------------------------------------
   */
  const handleSave = useCallback(async (): Promise<boolean> => {
    return saveJournal(false);
  }, [saveJournal]);

  /**
   * ---------------------------------------------------------
   * Save + post
   * ---------------------------------------------------------
   */
  const handlePost = useCallback(async (): Promise<boolean> => {
    return saveJournal(true);
  }, [saveJournal]);

  /**
   * ---------------------------------------------------------
   * Explicit post handler
   *
   * Kept separately because some screens use
   * handlePostJournal naming.
   * ---------------------------------------------------------
   */
  const handlePostJournal = useCallback(async (): Promise<boolean> => {
    return saveJournal(true);
  }, [saveJournal]);

  /**
   * ---------------------------------------------------------
   * Cancel / go back
   * ---------------------------------------------------------
   */
  const handleCancel = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
    setActiveModal(null);
    setItemActiveModal(null);
    setWarehouseIndex(null);
    setLocationIndex(null);

    router.push(redirectPath);
  }, [router, redirectPath]);

  /**
   * ---------------------------------------------------------
   * Edit posted/draft journal
   * ---------------------------------------------------------
   */
  const handleEdit = useCallback(() => {
    if (readOnly || isPosted) {
      return;
    }

    setIsEditing(true);
  }, [readOnly, isPosted]);

  /**
   * ---------------------------------------------------------
   * Refresh current journal
   * ---------------------------------------------------------
   */
  const refreshJournal = useCallback(async (): Promise<void> => {
    if (!currentJournalId) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      show("Refreshing journal...");

      const response = await fetch(`${apiBase}/${currentJournalId}`);

      if (!response.ok) {
        throw new Error(
          await getApiMessage(response, "Failed to refresh item journal."),
        );
      }

      const data = await response.json();

      const journal =
        data?.journal ?? data?.data?.journal ?? data?.data ?? data;

      const posted = Boolean(journal?.is_posted);

      setIsPosted(posted);

      setIsEditing(!posted && !readOnly);

      const entryDate = normalizeDate(journal?.entry_date) || today();

      setMetadata({
        entry_no: String(journal?.entry_no ?? ""),
        entry_date: entryDate,
      });

      const apiLines = data?.lines ?? data?.data?.lines ?? journal?.lines ?? [];

      if (Array.isArray(apiLines) && apiLines.length > 0) {
        const normalized = apiLines.map((rawLine: Record<string, unknown>) => {
          const getString = (key: string): string => {
            const value = rawLine[key];

            return value === null || value === undefined ? "" : String(value);
          };

          const quantity = Number(rawLine.quantity || 0);

          const cost = Number(rawLine.cost_per_unit ?? rawLine.unit_cost ?? 0);

          const rawAllocations = rawLine.allocations;

          const allocationSource = Array.isArray(rawAllocations)
            ? rawAllocations
            : [];

          // const allocations = allocationSource.map(
          //   (allocation: StockAllocationRecord) =>
          //     normalizeAllocation(
          //       allocation,
          //       getString("location_id"),
          //       getString("location_name"),
          //     ),
          // );

          // const status = getStockStatus(quantity, allocations);

          const accountId =
            getString("balancing_account_id") || getString("account_id");

          const accountCode = getString("account_code");

          const accountName = getString("account_name");

          const serverAllocations = allocationSource.map((allocation) =>
            normalizeAllocation(
              allocation,
              getString("location_id"),
              getString("location_name"),
            ),
          );

          const allocations = serverAllocations.map((allocation) => ({
            ...allocation,
          }));

          const initialAllocations = serverAllocations.map((allocation) => ({
            ...allocation,
          }));

          return {
            _stableKey: createStableKey(),

            posting_date: normalizeDate(getString("posting_date")) || entryDate,

            transaction_type:
              getString("transaction_type") === "Negative Entry"
                ? "Negative Entry"
                : "Positive Entry",

            item_id: getString("item_id"),

            item_no: getString("item_no") || getString("item_code"),

            item_description:
              getString("item_description") || getString("description"),

            warehouse_id: getString("warehouse_id"),

            warehouse_code: getString("warehouse_code"),

            warehouse_name: getString("warehouse_name"),

            location_id: getString("location_id"),

            location_name: getString("location_name"),

            quantity,

            uom: getString("uom") || getString("uom_name") || "Pcs",

            cost_per_unit: cost,

            amount: calculateAmount(quantity, cost),

            balancing_account_id: accountId,

            balancing_display_name:
              getString("balancing_display_name") ||
              (accountCode && accountName
                ? `${accountCode} - ${accountName}`
                : accountName || accountCode || ""),

            allocations,

            initialAllocations,

            stock_status: getStockStatus(quantity, allocations),

            is_allocated: getStockStatus(quantity, allocations) === "allocated",

            // initialAllocations: allocations.map((allocation) => ({
            //   ...allocation,
            // })),

            // stock_status: status,

            // is_allocated: status === "allocated",
          } satisfies ItemJournalLineRow;
        });

        setLines(normalized);
      }
    } catch (error: unknown) {
      console.error("Failed to refresh item journal:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to refresh item journal.";

      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
      hide();
    }
  }, [
    currentJournalId,
    apiBase,
    readOnly,
    show,
    hide,
    getApiMessage,
    normalizeAllocation,
  ]);

  /**
   * ---------------------------------------------------------
   * Close all modals
   * ---------------------------------------------------------
   */
  const closeAllModals = useCallback(() => {
    setIsAllocationModalOpen(false);
    setActiveAllocationLineId(null);
    setExistingSequences([]);
    setActiveModal(null);
    setItemActiveModal(null);
    setWarehouseIndex(null);
    setLocationIndex(null);
  }, []);

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

  /**
   * ---------------------------------------------------------
   * Return hook API
   * ---------------------------------------------------------
   */
  return {
    /**
     * State
     */

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

    existingSequences,
    availableStock,
    currentJournalId,
    formDisabled,

    activeAllocationLine,
    isAllocationModalOpen,
    itemActiveModal,
    activeModal,
    warehouseIndex,
    locationIndex,

    activeAllocationLineId,

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

    /**
     * Metadata handlers
     */
    setMetadata,
    handleMetadataChange,

    /**
     * Item lookup
     */
    openItemModal,
    closeItemModal,

    /**
     * Warehouse lookup
     */
    openWarehouseModal,
    closeWarehouseModal,

    /**
     * Location lookup
     */
    openLocationModal,
    closeLocationModal,

    /**
     * G/L lookup
     */
    openGLModal,
    closeGLModal,

    /**
     * Stock allocation
     */
    handleCloseAllocation,

    /**
     * Persistence
     */
    validateBeforeSave,
    saveJournal,
    handleSave,
    handlePost,
    handlePostJournal,
    refreshJournal,

    /**
     * Navigation/editing
     */
    handleEdit,
    handleCancel,

    /**
     * Utility
     */
    closeAllModals,

    /**
     * Data loaders
     */
    fetchLocationsForWarehouse,
    fetchStockSequences,
  };
}

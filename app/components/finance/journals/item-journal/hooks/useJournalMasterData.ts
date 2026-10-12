// app/components/finance/journals/item-journal/hooks/useJournalMasterData.ts

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { normalizeDate, today, createStableKey, calculateAmount, getStockStatus } from "../utils";

import type { 
  ItemJournalLineRow, 
  JournalMetadata, 
  LocationOption, 
  WarehouseOption, 
  ItemJournalAllocationRecord 
} from "../types";

interface UseItemJournalMasterProps {
  journalId?: string;
  apiBase: string;
  readOnly: boolean;
  getApiMessage: (response: Response, fallback: string) => Promise<string>;
  normalizeAllocation: (allocation: Partial<ItemJournalAllocationRecord>, fallbackLocationId?: string, fallbackLocationName?: string) => ItemJournalAllocationRecord;
  createInitialRow: (entryDate?: string, overrides?: Partial<ItemJournalLineRow>) => ItemJournalLineRow;
}

export function useItemJournalMaster({
  journalId,
  apiBase,
  readOnly,
  getApiMessage,
  normalizeAllocation,
  createInitialRow,
}: UseItemJournalMasterProps) {
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(!journalId);
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(journalId || null);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locationsByWarehouse, setLocationsByWarehouse] = useState<Record<string, LocationOption[]>>({});
  const [metadata, setMetadata] = useState<JournalMetadata>({
    entry_no: "",
    entry_date: today(),
  });

  const fetchLocationsForWarehouse = useCallback(
    async (warehouseId: string): Promise<LocationOption[]> => {
      if (!warehouseId) return [];
      try {
        const response = await fetch(`/api/lookups/locations?warehouse_id=${encodeURIComponent(warehouseId)}`);
        if (!response.ok) {
          throw new Error(await getApiMessage(response, "Failed to load locations."));
        }
        const payload = await response.json();
        const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

        return data.map((location: Record<string, unknown>) => ({
          id: String(location.id ?? ""),
          title: String(location.title ?? location.name ?? location.location_name ?? location.code ?? ""),
          warehouse_id: String(location.warehouse_id ?? warehouseId),
        }));
      } catch (error) {
        console.error(`Failed to load locations for warehouse ${warehouseId}:`, error);
        return [];
      }
    },
    [getApiMessage]
  );

  return {
    loading,
    setLoading,
    isPosted,
    setIsPosted,
    errorMsg,
    setErrorMsg,
    isEditing,
    setIsEditing,
    currentJournalId,
    setCurrentJournalId,
    warehouses,
    setWarehouses,
    locationsByWarehouse,
    setLocationsByWarehouse,
    metadata,
    setMetadata,
    fetchLocationsForWarehouse,
  };
}

/* "use client";

import { useCallback, useState } from "react";

import type {
  LocationOption,
  WarehouseOption,
  ItemJournalAllocationRecord,
  ApiResponse,
} from "../types";

import type {
  StockSequenceRecord,
  AvailableStockRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

type MasterDataProps = {
  getApiMessage: (response: Response, fallback: string) => Promise<string>;
};

export function useJournalMasterData({ getApiMessage }: MasterDataProps) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locationsByWarehouse, setLocationsByWarehouse] = useState<
    Record<string, LocationOption[]>
  >({});
  const [existingSequences, setExistingSequences] = useState<
    StockSequenceRecord[]
  >([]);
  const [availableStock, setAvailableStock] = useState<AvailableStockRecord[]>(
    [],
  );

  const fetchWarehouses = useCallback(async (): Promise<WarehouseOption[]> => {
    const response = await fetch("/api/inventory/warehouses");

    if (!response.ok) {
      throw new Error(
        await getApiMessage(response, "Failed to load warehouses."),
      );
    }

    const payload = await response.json();
    const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    const result: WarehouseOption[] = data.map(
      (warehouse: Record<string, unknown>) => ({
        id: String(warehouse.id ?? ""),
        name: String(
          warehouse.name ?? warehouse.title ?? warehouse.warehouse_name ?? "",
        ),
        code: String(warehouse.code ?? warehouse.warehouse_code ?? ""),
      }),
    );

    setWarehouses(result);
    return result;
  }, [getApiMessage]);

  const fetchLocationsForWarehouse = useCallback(
    async (warehouseId: string): Promise<LocationOption[]> => {
      if (!warehouseId) return [];

      const response = await fetch(
        `/api/lookups/locations?warehouse_id=${encodeURIComponent(warehouseId)}`,
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

      const locations: LocationOption[] = data.map(
        (location: Record<string, unknown>) => ({
          id: String(location.id ?? ""),
          title: String(
            location.title ??
              location.name ??
              location.location_name ??
              location.code ??
              "",
          ),
          warehouse_id: String(location.warehouse_id ?? warehouseId),
        }),
      );

      setLocationsByWarehouse((previous) => ({
        ...previous,
        [warehouseId]: locations,
      }));

      return locations;
    },
    [getApiMessage],
  );

  const fetchStockSequences = useCallback(
    async (
      itemId: string,
      warehouseId: string,
      locationId?: string,
    ): Promise<StockSequenceRecord[]> => {
      if (!itemId || !warehouseId) return [];

      const params = new URLSearchParams({
        item_id: itemId,
        warehouse_id: warehouseId,
      });

      if (locationId) params.set("location_id", locationId);

      const response = await fetch(
        `/api/inventory/stock-sequences?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          await getApiMessage(response, "Failed to load stock sequences."),
        );
      }

      const payload = await response.json();
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.sequences)
            ? payload.sequences
            : Array.isArray(payload?.data?.sequences)
              ? payload.data.sequences
              : [];

      const numberValue = (value: unknown) => {
        const result = Number(value);
        return Number.isFinite(result) ? result : 0;
      };

      return data
        .map((raw: Record<string, unknown>) => ({
          location_id: String(
            raw.location_id ?? raw.locationId ?? locationId ?? "",
          ),
          location_name: String(
            raw.location_name ?? raw.locationName ?? raw.location_title ?? "",
          ),
          batch_no: String(raw.batch_no ?? raw.batchNo ?? raw.batch ?? ""),
          sequence_no: String(
            raw.sequence_no ?? raw.sequenceNo ?? raw.sequence ?? "",
          ),
          serial_no: String(raw.serial_no ?? raw.serialNo ?? raw.serial ?? ""),
          date_received: String(raw.date_received ?? raw.dateReceived ?? ""),
          prod_date: String(
            raw.prod_date ?? raw.production_date ?? raw.productionDate ?? "",
          ),
          expiry_date: String(
            raw.expiry_date ?? raw.use_by_date ?? raw.expiryDate ?? "",
          ),
          available_quantity: numberValue(
            raw.available_quantity ??
              raw.available_qty ??
              raw.availableQuantity ??
              raw.quantity ??
              0,
          ),
        }))
        .filter((row: StockSequenceRecord) => Boolean(row.sequence_no));
    },
    [getApiMessage],
  );

  const fetchAvailableStock = useCallback(
    async (
      itemId: string,
      warehouseId: string,
    ): Promise<AvailableStockRecord[]> => {
      if (!itemId || !warehouseId) return [];

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
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      return data
        .map((raw: Record<string, unknown>) => {
          const sourceId = String(raw.source_allocation_id ?? "");

          if (!sourceId) return null;

          return {
            id: String(raw.id ?? sourceId),
            source_allocation_id: sourceId,
            inbound_entry_id:
              raw.inbound_entry_id == null
                ? null
                : String(raw.inbound_entry_id),
            location_id: String(raw.location_id ?? ""),
            location_name: String(raw.location_name ?? ""),
            date_received: String(raw.date_received ?? ""),
            prod_date: String(raw.prod_date ?? ""),
            expiry_date: String(raw.expiry_date ?? ""),
            batch_no: String(raw.batch_no ?? ""),
            bin_code: String(raw.bin_code ?? ""),
            serial_no: String(raw.serial_no ?? ""),
            available_quantity: Number(
              raw.available_quantity ?? raw.available_qty ?? 0,
            ),
            unit_cost: Number(raw.unit_cost ?? 0),
          };
        })
        .filter(
          (row: AvailableStockRecord | null): row is AvailableStockRecord =>
            row !== null && row.available_quantity > 0,
        );
    },
    [getApiMessage],
  );

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
      location_name: allocation.location_name || fallbackLocationName,
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

  return {
    warehouses,
    setWarehouses,
    locationsByWarehouse,
    setLocationsByWarehouse,
    existingSequences,
    setExistingSequences,
    availableStock,
    setAvailableStock,
    fetchWarehouses,
    fetchLocationsForWarehouse,
    fetchStockSequences,
    fetchAvailableStock,
    normalizeAllocation,
  };
} */

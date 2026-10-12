// app/components/inventory/stock-transfer/transfer-stock/hooks/useTransferStock.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

import type {
  StockAllocationRecord,
  StockSequenceRecord,
  AvailableStockRecord,
} from "@/app/components/shared/modals/StockAllocationModal";

import type {
  TransferApiResponse,
  TransferDocumentResponse,
  TransferItemModalState,
  TransferMetadata,
  TransferStockFormProps,
  TransferStockLine,
  WarehouseOption,
  LocationOption,
  TransferValidationErrors,
} from "../types";

import {
  createInitialLine,
  createStableKey,
  getAllocationTotal,
  normalizeDate,
  normalizeNumber,
  normalizeTransferLine,
  today,
} from "../utils";

export function useTransferStock({
  transferStockId,
  mode = "create",
  onSuccess,
}: TransferStockFormProps) {
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(
    mode !== "view" && !transferStockId,
  );

  const [currentTransferId, setCurrentTransferId] = useState<string | null>(
    transferStockId ?? null,
  );

  const [validationErrors, setValidationErrors] =
    useState<TransferValidationErrors>({});

  const getLineErrorKey = (stableKey: string, field: string): string =>
    `line:${stableKey}:${field}`;

  const clearValidationError = (key: string) => {
    setValidationErrors((previous) => {
      if (!previous[key]) return previous;

      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const clearLineValidationErrors = (stableKey: string) => {
    setValidationErrors((previous) => {
      const prefix = `line:${stableKey}:`;

      return Object.fromEntries(
        Object.entries(previous).filter(([key]) => !key.startsWith(prefix)),
      );
    });
  };

  const [metadata, setMetadata] = useState<TransferMetadata>({
    transfer_no: "",
    transfer_date: today(),

    warehouse_from_id: "",
    warehouse_to_id: "",

    in_transit_code: "",
    po_no: "",
    shipping_agent: "",
    shipping_charge: 0,
  });

  const [lines, setLines] = useState<TransferStockLine[]>(() => [
    createInitialLine(),
  ]);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [fromLocations, setFromLocations] = useState<LocationOption[]>([]);
  const [toLocations, setToLocations] = useState<LocationOption[]>([]);

  const [itemActiveModal, setItemActiveModal] =
    useState<TransferItemModalState | null>(null);

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

  const formDisabled = mode === "view" || isPosted || !isEditing || loading;

  const activeAllocationLine = useMemo(() => {
    if (!activeAllocationLineId) {
      return null;
    }

    return (
      lines.find((line) => line._stableKey === activeAllocationLineId) ?? null
    );
  }, [activeAllocationLineId, lines]);

  const getApiError = async (response: Response): Promise<string> => {
    try {
      const result = (await response.json()) as TransferApiResponse;

      return result.error || "Transfer operation failed.";
    } catch {
      return "Transfer operation failed.";
    }
  };

  const loadWarehouses = useCallback(async () => {
    try {
      const response = await fetch("/api/lookups/warehouses");

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const result = (await response.json()) as {
        data?: WarehouseOption[];
      };

      setWarehouses(result.data ?? []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load warehouses.";

      setErrorMsg(message);
      toast.error(message);
    }
  }, []);

  const loadLocations = useCallback(
    async (warehouseId: string): Promise<LocationOption[]> => {
      if (!warehouseId) {
        return [];
      }

      const response = await fetch(
        `/api/lookups/locations?warehouse_id=${encodeURIComponent(
          warehouseId,
        )}`,
      );

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const result = (await response.json()) as {
        data?: LocationOption[];
      };

      return result.data ?? [];
    },
    [],
  );

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (!currentTransferId) {
      return;
    }

    let cancelled = false;

    const loadTransfer = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const response = await fetch(
          `/api/inventory/transfer-stock/${currentTransferId}`,
        );

        if (!response.ok) {
          throw new Error(await getApiError(response));
        }

        const result = (await response.json()) as TransferApiResponse & {
          data?: TransferDocumentResponse;
        };

        if (!result.data) {
          throw new Error("Transfer document data was not returned.");
        }

        if (cancelled) {
          return;
        }

        const transfer = result.data.transfer;

        setMetadata({
          transfer_no: String(transfer.transfer_no ?? ""),
          transfer_date: normalizeDate(transfer.transfer_date) || today(),
          warehouse_from_id: String(transfer.warehouse_from_id ?? ""),
          warehouse_to_id: String(transfer.warehouse_to_id ?? ""),
          in_transit_code: String(transfer.in_transit_code ?? ""),
          po_no: String(transfer.po_no ?? ""),
          shipping_agent: String(transfer.shipping_agent ?? ""),
          shipping_charge: normalizeNumber(transfer.shipping_charge),
        });

        setIsPosted(Boolean(transfer.is_posted));

        const normalizedLines = result.data.lines.map(normalizeTransferLine);

        setLines(
          normalizedLines.length ? normalizedLines : [createInitialLine()],
        );

        if (transfer.warehouse_from_id) {
          const locations = await loadLocations(transfer.warehouse_from_id);

          if (!cancelled) {
            setFromLocations(locations);
          }
        }

        if (transfer.warehouse_to_id) {
          const locations = await loadLocations(transfer.warehouse_to_id);

          if (!cancelled) {
            setToLocations(locations);
          }
        }

        if (!cancelled && !transfer.is_posted) {
          setIsEditing(mode !== "view");
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load transfer document.";

        setErrorMsg(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTransfer();

    return () => {
      cancelled = true;
    };
  }, [currentTransferId, loadLocations, mode]);

  const handleHeaderChange = useCallback(
    <K extends keyof TransferMetadata>(
      field: K,
      value: TransferMetadata[K],
    ) => {
      if (formDisabled) {
        return;
      }

      setMetadata((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    [formDisabled],
  );

  const handleFromWarehouseChange = useCallback(
    async (warehouseId: string) => {
      if (formDisabled) {
        return;
      }

      setMetadata((previous) => ({
        ...previous,
        warehouse_from_id: warehouseId,
      }));

      setFromLocations([]);

      setLines((previous) =>
        previous.map((line) => ({
          ...line,
          from_location_id: "",
          from_location_name: "",
          allocations: [],
          initialAllocations: [],
        })),
      );

      if (!warehouseId) {
        return;
      }

      try {
        const locations = await loadLocations(warehouseId);

        setFromLocations(locations);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load source locations.";

        setErrorMsg(message);
        toast.error(message);
      }
    },
    [formDisabled, loadLocations],
  );

  const handleToWarehouseChange = useCallback(
    async (warehouseId: string) => {
      if (formDisabled) {
        return;
      }

      setMetadata((previous) => ({
        ...previous,
        warehouse_to_id: warehouseId,
      }));

      setToLocations([]);

      setLines((previous) =>
        previous.map((line) => ({
          ...line,
          to_location_id: "",
          to_location_name: "",
        })),
      );

      if (!warehouseId) {
        return;
      }

      try {
        const locations = await loadLocations(warehouseId);

        setToLocations(locations);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load destination locations.";

        setErrorMsg(message);
        toast.error(message);
      }
    },
    [formDisabled, loadLocations],
  );

  const handleTransitMethodChange = useCallback(
    (transitCode: string) => {
      if (formDisabled) return;

      setMetadata((previous) => ({
        ...previous,
        in_transit_code: transitCode,
      }));

      clearValidationError("metadata.in_transit_code");
    },
    [formDisabled],
  );

  const handleItemSelect = useCallback(
    (item: ItemLookupRecord) => {
      if (formDisabled || itemActiveModal === null) {
        return;
      }

      const targetIndex = itemActiveModal.index;

      setLines((previous) =>
        previous.map((line, index) => {
          if (index !== targetIndex) {
            return line;
          }

          return {
            ...line,

            item_id: String(item.id ?? ""),
            item_code: item.item_code || "",
            item_description: item.name || item.description || "",

            uom: item.base_uom_name || "Pcs",

            allocations: [],
            initialAllocations: [],
          };
        }),
      );

      setItemActiveModal(null);
    },
    [formDisabled, itemActiveModal],
  );

  const handleLineChange = useCallback(
    (index: number, field: keyof TransferStockLine, value: string | number) => {
      if (formDisabled) return;

      const line = lines[index];
      if (!line) return;

      const errorKey = getLineErrorKey(line._stableKey, String(field));
      clearValidationError(errorKey);

      setLines((previous) =>
        previous.map((current, lineIndex) => {
          if (lineIndex !== index) return current;

          const updated = {
            ...current,
            [field]: value,
          } as TransferStockLine;

          if (field === "qty") {
            updated.qty = Number(value);

            // updatedLine.qty = quantity;

            // const allocated = getAllocationTotal(updatedLine.allocations);

            // if (allocated > quantity) {
            //   updatedLine.allocations = [];
            //   updatedLine.initialAllocations = [];
            // }
          }

          // if (field === "item_id" && !String(value)) {
          //   updatedLine.allocations = [];
          //   updatedLine.initialAllocations = [];
          // }

          // return updatedLine;

          if (field === "item_id" && !String(value)) {
            updated.allocations = [];
            updated.initialAllocations = [];
          }

          return updated;
        }),
      );
    },
    [formDisabled, lines],
  );

  const handleFromLocationChange = useCallback(
    (index: number, locationId: string) => {
      if (formDisabled) {
        return;
      }

      const line = lines[index];

      if (line) {
        clearValidationError(
          getLineErrorKey(line._stableKey, "from_location_id"),
        );
      }

      const location = fromLocations.find((item) => item.id === locationId);

      setLines((previous) =>
        previous.map((line, lineIndex) =>
          lineIndex === index
            ? {
                ...line,
                from_location_id: locationId,
                from_location_name: location?.title || location?.name || "",
                allocations: [],
                initialAllocations: [],
              }
            : line,
        ),
      );

      setExistingSequences([]);
      setAvailableStock([]);
    },
    [formDisabled, fromLocations],
  );

  const handleToLocationChange = useCallback(
    (index: number, locationId: string) => {
      if (formDisabled) {
        return;
      }

      const location = toLocations.find((item) => item.id === locationId);

      setLines((previous) =>
        previous.map((line, lineIndex) =>
          lineIndex === index
            ? {
                ...line,
                to_location_id: locationId,
                to_location_name: location?.title || location?.name || "",
              }
            : line,
        ),
      );
    },
    [formDisabled, toLocations],
  );

  const addLine = useCallback(() => {
    if (formDisabled) {
      return;
    }

    setLines((previous) => [
      ...previous,
      {
        ...createInitialLine(),
        _stableKey: createStableKey(),
      },
    ]);
  }, [formDisabled]);

  const removeLine = useCallback(
    (index: number) => {
      if (formDisabled) {
        return;
      }

      setLines((previous) => {
        if (previous.length <= 1) {
          return [createInitialLine()];
        }

        return previous.filter((_, lineIndex) => lineIndex !== index);
      });

      setActiveAllocationLineId(null);
      setIsAllocationModalOpen(false);
    },
    [formDisabled],
  );

  const handleOpenAllocation = useCallback(
    async (line: TransferStockLine) => {
      if (!line.item_id) {
        toast.error("Please select an item first.");
        return;
      }

      if (!metadata.warehouse_from_id) {
        toast.error("Please select the source warehouse first.");
        return;
      }

      if (!line.from_location_id) {
        toast.error("Please select the source location first.");
        return;
      }

      if (normalizeNumber(line.qty) <= 0) {
        toast.error("Please enter a transfer quantity first.");
        return;
      }

      setActiveAllocationLineId(line._stableKey);
      setIsAllocationModalOpen(true);

      /*
       * Existing StockAllocationModal fetches/uses stock data
       * based on item + warehouse. We still expose these state
       * arrays because the modal also supports externally loaded
       * sequences/available stock.
       */

      setExistingSequences([]);
      setAvailableStock([]);
    },
    [metadata.warehouse_from_id],
  );

  const handleSaveAllocations = useCallback(
    (allocations: StockAllocationRecord[]) => {
      if (!activeAllocationLineId) {
        return;
      }

      setLines((previous) =>
        previous.map((line) =>
          line._stableKey === activeAllocationLineId
            ? {
                ...line,
                allocations,
                initialAllocations: allocations.map((allocation) => ({
                  ...allocation,
                })),
              }
            : line,
        ),
      );

      setIsAllocationModalOpen(false);
      setActiveAllocationLineId(null);
    },
    [activeAllocationLineId],
  );

  const validateForm = useCallback(
    (
      forPosting: boolean,
    ): {
      errors: TransferValidationErrors;
      firstError: string | null;
    } => {
      const errors: TransferValidationErrors = {};

      const addError = (key: string, message: string) => {
        errors[key] = message;
      };

      const validDate = (() => {
        const value = metadata.transfer_date;

        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false;
        }

        const date = new Date(`${value}T00:00:00.000Z`);

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      })();

      if (!validDate) {
        addError("metadata.transfer_date", "Enter a valid transfer date.");
      }

      if (!metadata.warehouse_from_id) {
        addError("metadata.warehouse_from_id", "Source warehouse is required.");
      }

      if (!metadata.warehouse_to_id) {
        addError(
          "metadata.warehouse_to_id",
          "Destination warehouse is required.",
        );
      }

      if (
        metadata.warehouse_from_id &&
        metadata.warehouse_to_id &&
        metadata.warehouse_from_id === metadata.warehouse_to_id
      ) {
        addError(
          "metadata.warehouse_to_id",
          "Source and destination warehouses must differ.",
        );
      }

      const shippingCharge = Number(metadata.shipping_charge);

      if (!Number.isFinite(shippingCharge) || shippingCharge < 0) {
        addError(
          "metadata.shipping_charge",
          "Shipping cost must be a valid non-negative number.",
        );
      }

      if (lines.length === 0) {
        addError("lines", "At least one transfer line is required.");
      }

      lines.forEach((line, index) => {
        const prefix = `line:${line._stableKey}:`;
        const number = index + 1;

        if (!line.item_id) {
          addError(`${prefix}item_id`, `Line ${number}: Item is required.`);
        }

        const qty = Number(line.qty);

        if (!Number.isFinite(qty) || qty <= 0) {
          addError(
            `${prefix}qty`,
            `Line ${number}: Quantity must be greater than zero.`,
          );
        }

        if (!line.from_location_id) {
          addError(
            `${prefix}from_location_id`,
            `Line ${number}: Source location is required.`,
          );
        } else {
          const location = fromLocations.find(
            (item) => item.id === line.from_location_id,
          );

          if (
            !location ||
            location.warehouse_id !== metadata.warehouse_from_id
          ) {
            addError(
              `${prefix}from_location_id`,
              `Line ${number}: Select a valid source location.`,
            );
          }
        }

        if (!line.to_location_id) {
          addError(
            `${prefix}to_location_id`,
            `Line ${number}: Destination location is required.`,
          );
        } else {
          const location = toLocations.find(
            (item) => item.id === line.to_location_id,
          );

          if (!location || location.warehouse_id !== metadata.warehouse_to_id) {
            addError(
              `${prefix}to_location_id`,
              `Line ${number}: Select a valid destination location.`,
            );
          }
        }

        if (
          line.from_location_id &&
          line.to_location_id &&
          metadata.warehouse_from_id === metadata.warehouse_to_id &&
          line.from_location_id === line.to_location_id
        ) {
          addError(
            `${prefix}to_location_id`,
            `Line ${number}: Source and destination locations must differ.`,
          );
        }

        if (forPosting && qty > 0 && Number.isFinite(qty)) {
          const allocated = getAllocationTotal(line.allocations);

          if (line.allocations.length === 0) {
            addError(
              `${prefix}allocations`,
              `Line ${number}: Stock allocation is required before posting.`,
            );
          } else if (Math.abs(allocated - qty) > 0.000001) {
            addError(
              `${prefix}allocations`,
              `Line ${number}: Allocated quantity (${allocated}) must equal transfer quantity (${qty}).`,
            );
          }

          if (
            line.allocations.some(
              (allocation) =>
                !Number.isFinite(Number(allocation.quantity)) ||
                Number(allocation.quantity) <= 0,
            )
          ) {
            addError(
              `${prefix}allocations`,
              `Line ${number}: Every allocation must have a positive quantity.`,
            );
          }

          if (
            line.allocations.some(
              (allocation) => allocation.location_id !== line.from_location_id,
            )
          ) {
            addError(
              `${prefix}allocations`,
              `Line ${number}: Allocations must belong to the selected source location.`,
            );
          }
        }
      });

      return {
        errors,
        firstError: Object.values(errors)[0] ?? null,
      };
    },
    [fromLocations, lines, metadata, toLocations],
  );

  const buildPayload = useCallback(() => {
    return {
      transferNo: metadata.transfer_no || undefined,
      transferDate: metadata.transfer_date,

      warehouseFromId: metadata.warehouse_from_id,
      warehouseToId: metadata.warehouse_to_id,

      inTransitCode: metadata.in_transit_code,
      poNo: metadata.po_no,
      shippingAgent: metadata.shipping_agent,
      shippingCharge: normalizeNumber(metadata.shipping_charge),

      lines: lines.map((line) => ({
        itemId: line.item_id,
        itemCode: line.item_code,
        qty: normalizeNumber(line.qty),
        uom: line.uom,
        fromLocationId: line.from_location_id || null,
        toLocationId: line.to_location_id || null,
        allocations: line.allocations.map((allocation) => ({
          ...allocation,
          quantity: normalizeNumber(allocation.quantity),
        })),
      })),
    };
  }, [lines, metadata]);

  const persistDraft = useCallback(
    async (silent = false): Promise<string | null> => {
      const validation = validateForm(false);

      setValidationErrors(validation.errors);

      if (validation.firstError) {
        setErrorMsg(validation.firstError);
        toast.error(validation.firstError);
        return null;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const targetUrl = currentTransferId
          ? `/api/inventory/transfer-stock/${currentTransferId}`
          : "/api/inventory/transfer-stock";

        const response = await fetch(targetUrl, {
          method: currentTransferId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });

        if (!response.ok) {
          throw new Error(await getApiError(response));
        }

        const result = (await response.json()) as TransferApiResponse & {
          data?: { id: string; transfer_no: string };
        };

        const id = result.data?.id;

        if (!id) {
          throw new Error("No transfer document ID was returned.");
        }

        setCurrentTransferId(id);

        setMetadata((previous) => ({
          ...previous,
          transfer_no: result.data?.transfer_no || previous.transfer_no,
        }));

        setValidationErrors({});
        setIsEditing(true);

        if (!silent) {
          toast.success(
            currentTransferId
              ? "Transfer Stock updated successfully."
              : "Transfer Stock saved successfully.",
          );

          onSuccess?.();
        }

        return id;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save transfer Stock.";

        setErrorMsg(message);
        toast.error(message);

        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildPayload, currentTransferId, onSuccess, validateForm],
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    return (await persistDraft()) !== null;
  }, [persistDraft]);

  const postTransfer = useCallback(async (): Promise<boolean> => {
    const validation = validateForm(true);

    setValidationErrors(validation.errors);

    if (validation.firstError) {
      setErrorMsg(validation.firstError);
      toast.error(validation.firstError);
      return false;
    }

    // Always persist current edits first, including for existing drafts.
    // Use the ID returned directly from the API, not captured React state.

    const activeId = await persistDraft(true);

    if (!activeId) {
      return false;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(
        `/api/inventory/transfer-stock/${activeId}/post`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const result = (await response.json()) as TransferApiResponse;

      setIsPosted(true);
      setIsEditing(false);
      setValidationErrors({});

      toast.success(result.message || "Stock Transfer posted successfully.");

      onSuccess?.();

      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to post stock transfer.";

      setErrorMsg(message);
      toast.error(message);

      return false;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, persistDraft, validateForm]);

  return {
    loading,
    isPosted,
    errorMsg,

    isEditing,
    setIsEditing,
    validationErrors,

    currentTransferId,

    metadata,
    lines,

    warehouses,
    fromLocations,
    toLocations,

    formDisabled,

    activeAllocationLine,

    itemActiveModal,
    setItemActiveModal,

    isAllocationModalOpen,
    setIsAllocationModalOpen,

    setActiveAllocationLineId,

    existingSequences,
    availableStock,

    handleHeaderChange,

    handleFromWarehouseChange,
    handleToWarehouseChange,

    handleTransitMethodChange,

    handleLineChange,

    handleFromLocationChange,
    handleToLocationChange,

    handleItemSelect,

    addLine,
    removeLine,

    handleOpenAllocation,
    handleSaveAllocations,

    saveDraft,
    persistDraft,
    postTransfer,
  };
}

// const saveDraft = useCallback(async (): Promise<boolean> => {
//   const validationError = validateForm(false);

//   if (validationError) {
//     setErrorMsg(validationError);
//     toast.error(validationError);
//     return false;
//   }

//   setLoading(true);
//   setErrorMsg(null);

//   try {
//     const targetUrl = currentTransferId
//       ? `/api/inventory/transfer-stock/${currentTransferId}`
//       : "/api/inventory/transfer-stock";

//     const method = currentTransferId ? "PUT" : "POST";

//     const response = await fetch(targetUrl, {
//       method,
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(buildPayload()),
//     });

//     if (!response.ok) {
//       throw new Error(await getApiError(response));
//     }

//     const result = (await response.json()) as TransferApiResponse & {
//       data?: {
//         id: string;
//         transfer_no: string;
//       };
//     };

//     if (!result.data?.id) {
//       throw new Error("Transfer was saved but no document ID was returned.");
//     }

//     setCurrentTransferId(result.data.id);

//     setMetadata((previous) => ({
//       ...previous,
//       transfer_no: result.data?.transfer_no || previous.transfer_no,
//     }));

//     setIsEditing(true);

//     toast.success(
//       currentTransferId
//         ? "Transfer draft updated successfully."
//         : "Transfer draft saved successfully.",
//     );

//     onSuccess?.();

//     return true;
//   } catch (error: unknown) {
//     const message =
//       error instanceof Error
//         ? error.message
//         : "Failed to save transfer draft.";

//     setErrorMsg(message);
//     toast.error(message);

//     return false;
//   } finally {
//     setLoading(false);
//   }
// }, [buildPayload, currentTransferId, onSuccess, validateForm]);

// const postTransfer = useCallback(async (): Promise<boolean> => {
//   const validationError = validateForm(true);

//   if (validationError) {
//     setErrorMsg(validationError);
//     toast.error(validationError);
//     return false;
//   }

//   if (!currentTransferId) {
//     const saved = await saveDraft();

//     if (!saved) {
//       return false;
//     }
//   }

//   const activeId = currentTransferId;

//   if (!activeId) {
//     toast.error("Transfer document ID was not available after saving.");
//     return false;
//   }

//   setLoading(true);
//   setErrorMsg(null);

//   try {
//     const response = await fetch(
//       `/api/inventory/transfer-stock/${activeId}/post`,
//       {
//         method: "POST",
//       },
//     );

//     if (!response.ok) {
//       throw new Error(await getApiError(response));
//     }

//     const result = (await response.json()) as TransferApiResponse;

//     setIsPosted(true);
//     setIsEditing(false);

//     toast.success(result.message || "Stock Transfer posted successfully.");

//     onSuccess?.();

//     return true;
//   } catch (error: unknown) {
//     const message =
//       error instanceof Error
//         ? error.message
//         : "Failed to post stock transfer.";

//     setErrorMsg(message);
//     toast.error(message);

//     return false;
//   } finally {
//     setLoading(false);
//   }
// }, [currentTransferId, onSuccess, saveDraft, validateForm]);

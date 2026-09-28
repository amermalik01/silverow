// app/components/finance/journals/ItemJournalForm.tsx

"use client";

import React from "react";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

import type { ItemJournalFormProps } from "./item-journal/types";

import { useItemJournal } from "./item-journal/hooks/useItemJournal";

import ItemJournalHeader from "./item-journal/components/ItemJournalHeader";
import ItemJournalToolbar from "./item-journal/components/ItemJournalToolbar";
import ItemJournalTable from "./item-journal/components/ItemJournalTable";
import ItemJournalFooter from "./item-journal/components/ItemJournalFooter";
import ItemJournalModals from "./item-journal/components/ItemJournalModals";

export default function ItemJournalForm(props: ItemJournalFormProps) {
  const { journalId, redirectPath, readOnly = false } = props;

  const journal = useItemJournal(props);

  const {
    loading,
    isPosted,
    errorMsg,
    isEditing,

    setIsEditing,

    metadata,
    lines,
    locations,

    formDisabled,

    activeAllocationLine,

    isAllocationModalOpen,

    itemActiveModal,
    activeModal,

    warehouseIndex,

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
  } = journal;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: "Item Journals",
            href: redirectPath,
          },
          {
            label: metadata.entry_no || "New Journal",
          },
        ]}
      />

      <ItemJournalHeader
        isPosted={isPosted}
        journalId={journalId}
        readOnly={readOnly}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
      />

      <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-800 rounded font-medium text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <ItemJournalToolbar
          entryNo={metadata.entry_no}
          formDisabled={formDisabled}
          onAddLine={addLineRow}
        />

        <ItemJournalTable
          lines={lines}
          locations={locations}
          formDisabled={formDisabled}
          onLineChange={handleLineChange}
          onOpenItem={(index) =>
            setItemActiveModal({
              index,
              type: "item",
              target: "item",
            })
          }
          onOpenWarehouse={(index) => setWarehouseIndex(index)}
          // onLocationChange={(index, location) => {
          //   setLocationIndex(index);
          //   handleLocationSelect(location);
          // }}
          onLocationChange={(index, location) => {
            handleLocationSelect(index, location);
          }}
          onLocationFocus={(index) => setLocationIndex(index)}
          onOpenGL={(index) =>
            setActiveModal({
              index,
              type: "balancing_account",
              target: "gl",
            })
          }
          onOpenAllocation={handleOpenAllocation}
          onRemove={removeLineRow}
        />

        <ItemJournalFooter
          formDisabled={formDisabled}
          loading={loading}
          onPost={() => void handleSaveOrPost(true)}
          onSave={() => void handleSaveOrPost(false)}
          onCancel={() => window.location.assign(redirectPath)}
        />
      </div>

      <ItemJournalModals
        itemModalOpen={itemActiveModal !== null}
        glModalOpen={activeModal !== null}
        warehouseModalOpen={warehouseIndex !== null}
        allocationModalOpen={isAllocationModalOpen}
        activeAllocationLine={activeAllocationLine}
        formDisabled={formDisabled}
        onCloseItem={() => setItemActiveModal(null)}
        onItemSelect={(item) => void handleMultipleItemSelect([item])}
        onCloseGL={() => setActiveModal(null)}
        onGLSelect={handleModalSelection}
        onCloseWarehouse={() => setWarehouseIndex(null)}
        onWarehouseSelect={handleWarehouseSelect}
        onCloseAllocation={() => {
          setIsAllocationModalOpen(false);

          setActiveAllocationLineId(null);
        }}
        onSaveAllocation={handleSaveAllocations}
      />
    </div>
  );
}

/* "use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";

import ItemLookupModal, {
  ItemLookupRecord,
} from "../../shared/modals/ItemLookupModal";

import StockAllocationModal, {
  StockAllocationRecord,
} from "../../shared/modals/StockAllocationModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "../../shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "../../shared/modals/WarehouseLookupModal";


export type ItemJournalTransactionType = "Positive Entry" | "Negative Entry";

export type StockStatus = "allocated" | "partial" | "unallocated";

type ApiResponse = {
  message?: string;
  error?: string;
  data?: unknown;
};

export type ItemJournalLineRow = {
  _stableKey: string;

  posting_date: string;
  transaction_type: ItemJournalTransactionType;

  item_id: string;
  item_no: string;
  item_description: string;

  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;

  location_id: string;
  location_name: string;

  quantity: number;
  uom: string;

  cost_per_unit: number;
  amount: number;

  balancing_account_id: string;
  balancing_display_name: string;

  allocations: StockAllocationRecord[];
  initialAllocations?: StockAllocationRecord[];

  stock_status: StockStatus;
  is_allocated: boolean;
};

type WarehouseOption = {
  id: string;
  name: string;
};

type LocationOption = {
  id: string;
  name: string;
  warehouse_id: string;
};

type Props = {
  slug?: string;
  journalId?: string;
  apiBase: string;
  redirectPath: string;
  readOnly?: boolean;
};


const today = () => {
  return new Date().toISOString().split("T")[0];
};

const createStableKey = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeDate = (value?: string | null) => {
  if (!value) return "";

  return String(value).split("T")[0];
};

const calculateAmount = (quantity: number, cost: number) => {
  return Number((Number(quantity || 0) * Number(cost || 0)).toFixed(2));
};

const getAllocationTotal = (
  allocations: StockAllocationRecord[] = [],
): number => {
  return allocations.reduce(
    (sum, allocation) => sum + Number(allocation.quantity || 0),
    0,
  );
};

const getStockStatus = (
  quantity: number,
  allocations: StockAllocationRecord[] = [],
): StockStatus => {
  const lineQuantity = Number(quantity || 0);
  const allocatedQuantity = getAllocationTotal(allocations);

  if (lineQuantity <= 0 || allocatedQuantity <= 0) {
    return "unallocated";
  }

  if (allocatedQuantity >= lineQuantity) {
    return "allocated";
  }

  return "partial";
};

export default function ItemJournalForm({
  slug,
  journalId,
  apiBase,
  redirectPath,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const { show, hide } = useLoader();

  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(!journalId);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  const [activeAllocationLineId, setActiveAllocationLineId] = useState<
    string | null
  >(null);

  const [activeModal, setActiveModal] = useState<{
    index: number;
    type: "balancing_account";
    target: "gl";
  } | null>(null);

  const [itemActiveModal, setItemActiveModal] = useState<{
    index: number;
    type: "item";
    target: "item";
  } | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [locationIndex, setLocationIndex] = useState<number | null>(null);

  const [metadata, setMetadata] = useState({
    entry_no: "",
    entry_date: today(),
  });

  const createInitialRow = useCallback(
    (overrides: Partial<ItemJournalLineRow> = {}): ItemJournalLineRow => {
      const quantity = Number(overrides.quantity || 0);
      const cost = Number(overrides.cost_per_unit || 0);

      return {
        _stableKey: createStableKey(),

        posting_date: metadata.entry_date || today(),

        transaction_type: "Negative Entry",

        item_id: "",
        item_no: "",
        item_description: "",

        warehouse_id: "",
        warehouse_code: "",
        warehouse_name: "",

        location_id: "",
        location_name: "",

        quantity: 0,
        uom: "Pcs",

        cost_per_unit: 0,
        amount: 0,

        balancing_account_id: "",
        balancing_display_name: "",

        allocations: [],
        initialAllocations: [],

        stock_status: "unallocated",
        is_allocated: false,

        ...overrides,

        quantity,
        cost_per_unit: cost,
        amount: calculateAmount(quantity, cost),
      };
    },
    [metadata.entry_date],
  );

  const [lines, setLines] = useState<ItemJournalLineRow[]>(() => [
    createInitialRow(),
  ]);

  const formDisabled = readOnly || isPosted || !isEditing || loading;

  const activeAllocationLine = useMemo(() => {
    if (!activeAllocationLineId) return null;

    return (
      lines.find((line) => line._stableKey === activeAllocationLineId) || null
    );
  }, [activeAllocationLineId, lines]);

  useEffect(() => {
    let cancelled = false;

    const fetchMasterData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        show("Loading data...");

        const requests = [
          fetch("/api/inventory/warehouses"),
          fetch("/api/inventory/locations"),
        ] as const;

        const [warehouseResponse, locationResponse] =
          await Promise.all(requests);

        if (!cancelled) {
          if (warehouseResponse.ok) {
            const warehousePayload = await warehouseResponse.json();

            const warehouseData = Array.isArray(warehousePayload)
              ? warehousePayload
              : (warehousePayload.data ?? []);

            setWarehouses(warehouseData);
          }

          if (locationResponse.ok) {
            const locationPayload = await locationResponse.json();

            const locationData = Array.isArray(locationPayload)
              ? locationPayload
              : (locationPayload.data ?? []);

            setLocations(locationData);
          }
        }

        if (journalId) {
          const response = await fetch(`${apiBase}/${journalId}`);

          if (!response.ok) {
            throw new Error("Failed to load item journal.");
          }

          const data = await response.json();

          if (cancelled) return;

          const journal = data.journal ?? data.data?.journal ?? data;

          setIsPosted(Boolean(journal?.is_posted));

          setMetadata({
            entry_no: journal?.entry_no || "",
            entry_date: normalizeDate(journal?.entry_date) || today(),
          });

          const apiLines = data.lines ?? data.data?.lines ?? [];

          if (Array.isArray(apiLines) && apiLines.length > 0) {
            const normalizedLines: ItemJournalLineRow[] = apiLines.map(
              (rawLine: Partial<ItemJournalLineRow> & Record<string, any>) => {
                const quantity = Number(rawLine.quantity || 0);
                const cost = Number(rawLine.cost_per_unit || 0);

                const allocations: StockAllocationRecord[] = Array.isArray(
                  rawLine.allocations,
                )
                  ? rawLine.allocations
                  : Array.isArray(rawLine.initialAllocations)
                    ? rawLine.initialAllocations
                    : [];

                const status = getStockStatus(quantity, allocations);

                return {
                  _stableKey: createStableKey(),

                  posting_date:
                    normalizeDate(rawLine.posting_date) ||
                    normalizeDate(journal?.entry_date) ||
                    today(),

                  transaction_type:
                    rawLine.transaction_type === "Positive Entry"
                      ? "Positive Entry"
                      : "Negative Entry",

                  item_id: String(rawLine.item_id || ""),
                  item_no: String(rawLine.item_no || rawLine.item_code || ""),
                  item_description: String(
                    rawLine.item_description || rawLine.item_name || "",
                  ),

                  warehouse_id: String(rawLine.warehouse_id || ""),
                  warehouse_code: String(rawLine.warehouse_code || ""),
                  warehouse_name: String(rawLine.warehouse_name || ""),

                  location_id: String(rawLine.location_id || ""),
                  location_name: String(rawLine.location_name || ""),

                  quantity,
                  uom: String(rawLine.uom || rawLine.uom_name || "Pcs"),

                  cost_per_unit: cost,
                  amount: calculateAmount(quantity, cost),

                  balancing_account_id: String(
                    rawLine.balancing_account_id || "",
                  ),
                  balancing_display_name: String(
                    rawLine.balancing_display_name || "",
                  ),

                  allocations,
                  initialAllocations: allocations,

                  stock_status: status,
                  is_allocated:
                    status === "allocated" || Boolean(rawLine.is_allocated),
                };
              },
            );

            setLines(normalizedLines);
          } else {
            setLines([createInitialRow()]);
          }
        }
      } catch (error) {
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

    fetchMasterData();

    return () => {
      cancelled = true;
      hide();
    };
  }, [journalId, apiBase, show, hide, createInitialRow]);

  const loadLocations = async (warehouseId: string) => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/lookups/locations?warehouse_id=${encodeURIComponent(
          warehouseId,
        )}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load warehouse locations.");
      }

      const payload = await response.json();

      const data: LocationOption[] = Array.isArray(payload)
        ? payload
        : (payload.data ?? []);

      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("Failed to load warehouse locations.");
    }
  };

  const handleLineChange = (
    index: number,
    field: keyof ItemJournalLineRow,
    value: string | number,
  ) => {
    if (formDisabled) return;

    setLines((previous) =>
      previous.map((existingLine, lineIndex) => {
        if (lineIndex !== index) return existingLine;

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

            updatedLine.is_allocated = updatedLine.stock_status === "allocated";
          }
        }

        return updatedLine;
      }),
    );
  };

  const addLineRow = () => {
    if (formDisabled) return;

    setLines((previous) => [...previous, createInitialRow()]);
  };

  const removeLineRow = (index: number) => {
    if (formDisabled) return;

    setLines((previous) => {
      if (previous.length <= 1) {
        return [createInitialRow()];
      }

      return previous.filter((_, lineIndex) => lineIndex !== index);
    });
  };

  const buildItemLine = async (
    item: ItemLookupRecord,
  ): Promise<ItemJournalLineRow> => {
    let defaultWarehouse: {
      id?: string;
      code?: string;
      name?: string;
    } | null = null;

    try {
      const response = await fetch(
        `/api/lookups/default-warehouse?item_id=${encodeURIComponent(item.id)}`,
      );

      if (response.ok) {
        const payload = await response.json();
        defaultWarehouse = payload.data ?? payload;
      }
    } catch (error) {
      console.error("Failed to fetch default warehouse:", error);
    }

    const unitCost = Number(item.standard_cost || 0);

    return createInitialRow({
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
  };

  const handleMultipleItemSelect = async (items: ItemLookupRecord[]) => {
    if (!items.length) {
      setItemActiveModal(null);
      return;
    }

    try {
      show("Loading item information...");

      const newLines = await Promise.all(
        items.map((item) => buildItemLine(item)),
      );

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

      const selectedWarehouseId = newLines[0]?.warehouse_id || "";

      if (selectedWarehouseId) {
        await loadLocations(selectedWarehouseId);
      }
    } catch (error) {
      console.error("Failed to add selected items:", error);

      toast.error("Failed to load selected item.");
    } finally {
      hide();
      setItemActiveModal(null);
    }
  };

  const handleWarehouseSelect = async (warehouse: WarehouseLookupRecord) => {
    if (warehouseIndex === null) return;

    const targetIndex = warehouseIndex;

    setLines((previous) =>
      previous.map((line, index) => {
        if (index !== targetIndex) return line;

        return {
          ...line,

          warehouse_id: String(warehouse.id || ""),
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

    await loadLocations(String(warehouse.id || ""));

    setWarehouseIndex(null);
  };

  const handleLocationSelect = (location: LocationOption) => {
    if (locationIndex === null) return;

    const targetIndex = locationIndex;

    setLines((previous) =>
      previous.map((line, index) => {
        if (index !== targetIndex) return line;

        return {
          ...line,

          location_id: String(location.id || ""),
          location_name: location.name || "",
        };
      }),
    );

    setLocationIndex(null);
  };

  const handleModalSelection = (selectedRecord: GLAccountLookupRecord) => {
    if (!activeModal) return;

    const targetIndex = activeModal.index;

    setLines((previous) =>
      previous.map((line, index) => {
        if (index !== targetIndex) return line;

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
  };

  const handleOpenAllocation = (line: ItemJournalLineRow) => {
    if (formDisabled) return;

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
  };

  const handleSaveAllocations = (allocationsData: StockAllocationRecord[]) => {
    if (!activeAllocationLineId) return;

    setLines((previous) =>
      previous.map((line) => {
        if (line._stableKey !== activeAllocationLineId) {
          return line;
        }

        const quantity = Number(line.quantity || 0);

        const sanitizedAllocations = allocationsData
          .map((allocation) => ({
            ...allocation,
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
  };

  const validateBeforeSave = (postToLedger: boolean): string | null => {
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

        if (allocatedQuantity !== Number(line.quantity || 0)) {
          return `Line ${lineNumber}: Stock allocation must equal the journal quantity before posting.`;
        }
      }
    }

    return null;
  };

  const buildApiPayload = (postToLedger: boolean) => {
    return {
      entry_date: metadata.entry_date,

      is_posted: postToLedger,

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
          date_received: allocation.date_received,

          prod_date: allocation.prod_date,

          expiry_date: allocation.expiry_date,

          batch_no: allocation.batch_no,

          serial_no: allocation.serial_no,

          quantity: Number(allocation.quantity || 0),
        })),
      })),
    };
  };

  const handleSaveOrPost = async (
    postToLedger: boolean = false,
  ): Promise<boolean> => {
    if (loading) return false;

    setErrorMsg(null);

    const validationError = validateBeforeSave(postToLedger);

    if (validationError) {
      setErrorMsg(validationError);
      toast.error(validationError);
      return false;
    }

    setLoading(true);

    try {
      show(postToLedger ? "Posting Journal..." : "Saving Draft...");

      const payload = buildApiPayload(postToLedger);

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
            "Failed to submit item journal.",
        );
      }

      toast.success(
        postToLedger
          ? "Item journal posted successfully."
          : "Item journal saved successfully.",
      );

      router.push(redirectPath);

      return true;
    } catch (error: unknown) {
      console.error("Failed to save item journal:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit item journal.";

      setErrorMsg(message);
      toast.error(message);

      return false;
    } finally {
      setLoading(false);
      hide();
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: "Item Journals",
            href: redirectPath,
          },
          {
            label: metadata.entry_no || "New Journal",
          },
        ]}
      />

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Item Journal</h2>

          {isPosted && (
            <span className="inline-flex mt-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
              Posted
            </span>
          )}
        </div>

        {journalId && !readOnly && !isPosted && !isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-800 rounded font-medium text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-between items-center bg-zinc-50 dark:bg-slate-800 p-3 rounded border border-zinc-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              Journal No.
            </span>

            <input
              type="text"
              readOnly
              className="border bg-zinc-100 dark:bg-slate-700 p-1 px-2 rounded w-36 font-bold outline-none text-zinc-700 dark:text-zinc-100 text-sm"
              value={metadata.entry_no || "Draft"}
            />
          </div>

          {!formDisabled && (
            <Button
              type="button"
              onClick={addLineRow}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              + Add Line
            </Button>
          )}
        </div>

        <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1550px]">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[190px]" />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
            </colgroup>

            <thead>
              <tr className="bg-zinc-50 dark:bg-slate-800 border-b border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-zinc-300 font-semibold">
                <th className="p-2">Posting Date</th>

                <th className="p-2">Transaction Type</th>

                <th className="p-2">Item No.</th>

                <th className="p-2">Item Description</th>

                <th className="p-2">Warehouse</th>

                <th className="p-2">Location</th>

                <th className="p-2">Qty.</th>

                <th className="p-2">U.O.M</th>

                <th className="p-2">Cost Per Unit</th>

                <th className="p-2">Amount</th>

                <th className="p-2">Balancing G/L</th>

                <th className="p-2 text-center">Stock</th>

                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
              {lines.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center p-8 text-gray-500">
                    No lines added
                  </td>
                </tr>
              )}

              {lines.map((line, index) => {
                const displayQty = Number(line.quantity || 0);

                const displayUnitCost = Number(line.cost_per_unit || 0);

                const displayAmount = Number(line.amount || 0);

                const allocatedQty = getAllocationTotal(line.allocations);

                const allocationStatus = getStockStatus(
                  displayQty,
                  line.allocations,
                );

                const lineLocations = locations.filter(
                  (location) =>
                    !line.warehouse_id ||
                    location.warehouse_id === line.warehouse_id,
                );

                return (
                  <tr
                    key={line._stableKey}
                    className="hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
    
                    <td className="p-2 align-top">
                      <DatePicker
                        disabled={formDisabled}
                        value={
                          line.posting_date
                            ? new Date(line.posting_date)
                            : undefined
                        }
                        onChange={(date) =>
                          handleLineChange(
                            index,
                            "posting_date",
                            date ? date.toISOString().split("T")[0] : "",
                          )
                        }
                      />
                    </td>


                    <td className="p-2 align-top">
                      <select
                        disabled={formDisabled}
                        value={line.transaction_type}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "transaction_type",
                            event.target.value as ItemJournalTransactionType,
                          )
                        }
                        className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs outline-none bg-white dark:bg-slate-800"
                      >
                        <option value="Positive Entry">Positive Entry</option>

                        <option value="Negative Entry">Negative Entry</option>
                      </select>
                    </td>

    
                    <td className="p-2 align-top">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          placeholder="Select Item..."
                          value={line.item_no}
                          className="w-full border p-1 rounded bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-zinc-200 font-mono text-[11px] outline-none truncate"
                        />

                        <Button
                          type="button"
                          disabled={formDisabled}
                          onClick={() =>
                            setItemActiveModal({
                              index,
                              type: "item",
                              target: "item",
                            })
                          }
                          className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-4 h-4"
                          />
                        </Button>
                      </div>
                    </td>

                    <td className="p-2 align-top">
                      <input
                        type="text"
                        value={line.item_description}
                        disabled={formDisabled}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "item_description",
                            event.target.value,
                          )
                        }
                        className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs outline-none bg-white dark:bg-slate-800"
                      />
                    </td>

                    <td className="p-2 align-top">
                      <button
                        type="button"
                        disabled={formDisabled}
                        title={
                          line.warehouse_name
                            ? `${line.warehouse_code || ""} - ${line.warehouse_name}`
                            : "Select warehouse"
                        }
                        onClick={() => setWarehouseIndex(index)}
                        className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-[11px] bg-white dark:bg-slate-800 flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {!line.warehouse_id ? (
                          <span className="text-red-500">
                            Warehouse required
                          </span>
                        ) : (
                          <span className="truncate text-left">
                            {line.warehouse_code
                              ? `${line.warehouse_code} - `
                              : ""}
                            {line.warehouse_name}
                          </span>
                        )}

                        <Icon
                          icon="tabler:search"
                          className="w-4 h-4 shrink-0"
                        />
                      </button>
                    </td>

     
                    <td className="p-2 align-top">
                      <select
                        disabled={formDisabled || !line.warehouse_id}
                        value={line.location_id}
                        onChange={(event) => {
                          const selected = lineLocations.find(
                            (location) => location.id === event.target.value,
                          );

                          if (selected) {
                            handleLocationSelect(selected);
                          }
                        }}
                        onFocus={() => {
                          setLocationIndex(index);
                        }}
                        className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1.5 text-xs outline-none bg-white dark:bg-slate-800 disabled:opacity-60"
                      >
                        <option value="">
                          {line.warehouse_id
                            ? "Select Location"
                            : "Select Warehouse"}
                        </option>

                        {lineLocations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </td>


                    <td className="p-2 align-top">
                      <NumericTextInput
                        value={displayQty}
                        allowDecimals={false}
                        disabled={formDisabled}
                        onChange={(value) =>
                          handleLineChange(index, "quantity", String(value))
                        }
                        className="w-full border p-1 rounded text-right font-mono bg-white dark:bg-slate-800"
                      />
                    </td>

   
                    <td className="p-2 align-top">
                      <input
                        type="text"
                        value={line.uom}
                        disabled={formDisabled}
                        onChange={(event) =>
                          handleLineChange(index, "uom", event.target.value)
                        }
                        className="w-full border border-zinc-300 dark:border-slate-700 rounded p-1 text-xs text-center bg-white dark:bg-slate-800"
                      />
                    </td>

      
                    <td className="p-2 align-top">
                      <NumericTextInput
                        value={displayUnitCost}
                        allowDecimals
                        decimalScale={2}
                        disabled={formDisabled}
                        onChange={(value) =>
                          handleLineChange(
                            index,
                            "cost_per_unit",
                            String(value),
                          )
                        }
                        className="w-full border p-1 rounded text-right font-mono bg-white dark:bg-slate-800"
                      />
                    </td>

   
                    <td className="p-2 align-top">
                      <NumericTextInput
                        value={displayAmount}
                        allowDecimals
                        decimalScale={2}
                        disabled
                        onChange={() => {}}
                        className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-right text-[11px] disabled:opacity-60"
                      />
                    </td>


                    <td className="p-2 align-top">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          readOnly
                          placeholder="Select G/L..."
                          value={line.balancing_display_name || ""}
                          className="w-full border p-1 rounded bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-zinc-200 font-mono text-[11px] outline-none truncate"
                        />

                        <Button
                          type="button"
                          disabled={formDisabled}
                          onClick={() =>
                            setActiveModal({
                              index,
                              type: "balancing_account",
                              target: "gl",
                            })
                          }
                          className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-4 h-4"
                          />
                        </Button>
                      </div>
                    </td>

 
                    <td className="p-2 text-center align-top">
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => handleOpenAllocation(line)}
                        className={`inline-flex items-center justify-center p-1.5 rounded transition-colors ${
                          allocationStatus === "allocated"
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : allocationStatus === "partial"
                              ? "text-amber-500 hover:bg-amber-50"
                              : "text-red-500 hover:bg-red-50"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title={
                          allocationStatus === "allocated"
                            ? `Allocated (${allocatedQty}/${displayQty})`
                            : allocationStatus === "partial"
                              ? `Partially allocated (${allocatedQty}/${displayQty})`
                              : "Not allocated"
                        }
                      >
                        <Icon icon="tabler:box-seam" className="w-5 h-5" />
                      </button>

                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {allocatedQty}/{displayQty}
                      </div>
                    </td>

    
                    <td className="p-2 text-center align-top">
                      <button
                        type="button"
                        disabled={formDisabled || lines.length <= 1}
                        onClick={() => removeLineRow(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove line"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        <div className="flex flex-col lg:flex-row justify-between gap-4 pt-2">

          <div className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span>Unallocated</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Partial</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Allocated</span>
            </div>
          </div>


          <div className="flex items-center gap-2">
            {!formDisabled && (
              <>
                <Button
                  type="button"
                  onClick={() => handleSaveOrPost(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Post Journal"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveOrPost(false)}
                  disabled={loading}
                >
                  Save
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(redirectPath)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>


      {itemActiveModal?.target === "item" && (
        <ItemLookupModal
          open={true}
          onClose={() => setItemActiveModal(null)}
          onSelect={(item) => handleMultipleItemSelect([item])}
        />
      )}



      {activeModal?.target === "gl" && (
        <GLAccountLookupModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSelect={(record: GLAccountLookupRecord) =>
            handleModalSelection(record)
          }
        />
      )}


      <WarehouseLookupModal
        open={warehouseIndex !== null}
        onClose={() => setWarehouseIndex(null)}
        onSelect={handleWarehouseSelect}
      />



      {isAllocationModalOpen && activeAllocationLine && (
        <StockAllocationModal
          key={activeAllocationLine._stableKey}
          open={isAllocationModalOpen}
          isReadonly={formDisabled}
          onClose={() => {
            setIsAllocationModalOpen(false);
            setActiveAllocationLineId(null);
          }}
          targetQuantity={Number(activeAllocationLine.quantity || 0)}
          itemId={activeAllocationLine.item_id || ""}
          itemCode={activeAllocationLine.item_no || ""}
          itemName={activeAllocationLine.item_description || ""}
          warehouseId={activeAllocationLine.warehouse_id || ""}
          warehouseName={activeAllocationLine.warehouse_name || ""}
          locationId={activeAllocationLine.location_id || ""}
          locationName={activeAllocationLine.location_name || ""}
          uomName={activeAllocationLine.uom || ""}
          initialAllocations={(
            activeAllocationLine.allocations ||
            activeAllocationLine.initialAllocations ||
            []
          ).map((allocation) => ({
            location_id: allocation.location_id || "",
            location_name: allocation.location_name || "",
            date_received: String(allocation.date_received || ""),
            prod_date: String(allocation.prod_date || ""),
            expiry_date: String(allocation.expiry_date || ""),
            batch_no: String(allocation.batch_no || ""),
            serial_no: String(allocation.serial_no || ""),
            quantity: Number(allocation.quantity || 0),
          }))}
          onSave={handleSaveAllocations}
        />
      )}
    </div>
  );
} */

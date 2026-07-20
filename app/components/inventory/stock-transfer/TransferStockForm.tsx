// app/components/inventory/stock-transfer/TransferStockForm.tsx

"use client";

import React, { useState, useEffect } from "react";

import ItemLookupModal, {
  ItemLookupRecord,
} from "../../shared/modals/ItemLookupModal";
import StockAllocationModal from "./StockAllocationModal";

export interface AllocationPayload {
  production_date: string;
  use_by_date: string;
  date_received: string;
  storage_location: string;
  cons_no: string;
  ref_no: string;
  serial_no: string;
  total_qty: number;
  sold_qty: number;
  returned_qty: number;
  allocated_qty: number;
  available_qty: number;
  current_allocation: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Location {
  id: string;
  warehouse_id: string;
  name: string;
}

interface TransferLine {
  local_key: string;
  id?: string;
  item_id: string;
  item_code: string;
  item_description: string;
  qty: number;
  uom: string;
  from_location_id: string;
  to_location_id: string;
  allocations: AllocationPayload[];
}

interface DBTransferLine {
  id: string;
  item_id: string;
  item_code: string;
  qty: number | string;
  uom?: string;
  from_location_id?: string;
  to_location_id?: string;
  allocations?: AllocationPayload[];
}

interface TransferStockFormProps {
  transferStockId?: string;
  mode?: "create" | "edit" | "view";
  onSuccess?: () => void;
}

export default function TransferStockForm({
  transferStockId,
  mode = "create",
  onSuccess,
}: TransferStockFormProps) {
  // Loading & State context flags
  const [isLoading, setIsLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dbRecordId, setDbRecordId] = useState<string | null>(
    transferStockId || null,
  );

  // Document Headers State
  const [transferNo, setTransferNo] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [warehouseFrom, setWarehouseFrom] = useState("");
  const [warehouseTo, setWarehouseTo] = useState("");

  const [inTransitCode, setInTransitCode] = useState("");
  const [poNo, setPoNo] = useState("");
  const [shippingAgent, setShippingAgent] = useState("");
  const [shippingCharge, setShippingCharge] = useState(0);

  // Lines Grid State
  const [lines, setLines] = useState<TransferLine[]>([]);

  // Core Lookup States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromLocations, setFromLocations] = useState<Location[]>([]);
  const [toLocations, setToLocations] = useState<Location[]>([]);

  // Paginated Selection Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeItemRowKey, setActiveItemRowKey] = useState<string | null>(null);

  // Modal Allocation State
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationRowKey, setActiveAllocationRowKey] = useState<
    string | null
  >(null);

  const activeAllocationLine = lines.find(
    (l) => l.local_key === activeAllocationRowKey,
  );

  // -------------------------------------------------------------
  // API READ INTEGRATION (GET RECORD)
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadTransferRecord() {
      if (!dbRecordId) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(
          `/api/inventory/transfer-stock/${dbRecordId}`,
          {
            method: "GET",
          },
        );
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Failed to load transfer document.");

        const { transfer, lines: fetchedLines } = result.data;

        // Map headers
        setTransferNo(transfer.transfer_no);
        setTransferDate(
          new Date(transfer.transfer_date).toISOString().split("T")[0],
        );
        setWarehouseFrom(transfer.warehouse_from_id);
        setWarehouseTo(transfer.warehouse_to_id);
        setInTransitCode(transfer.in_transit_code);
        setPoNo(transfer.po_no || "");
        setShippingAgent(transfer.shipping_agent || "");
        setShippingCharge(Number(transfer.shipping_charge || 0));
        setIsPosted(!!transfer.is_posted);

        // Map lines grid
        const mappedLines = fetchedLines.map((ln: DBTransferLine) => ({
          local_key: `line-${ln.id}`,
          id: ln.id,
          item_id: ln.item_id,
          item_code: ln.item_code,
          item_description: ln.item_code, // Backup if description not separate
          qty: Number(ln.qty),
          uom: ln.uom || "Pcs",
          from_location_id: ln.from_location_id || "",
          to_location_id: ln.to_location_id || "",
          allocations: ln.allocations || [],
        }));
        setLines(mappedLines);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          // Fallback handle for obscure unexpected errors
          setErrorMessage("An unexpected operation failure occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTransferRecord();
  }, [dbRecordId]);

  // -------------------------------------------------------------
  // API WRITE INTEGRATION (SAVE UNPOSTED DRAFT)
  // -------------------------------------------------------------
  const handleSaveDraft = async () => {
    if (!warehouseFrom || !warehouseTo || !lines.length) {
      alert(
        "Please ensure Origin, Destination warehouses, and at least one line item are filled.",
      );
      return;
    }

    if (warehouseFrom === warehouseTo) {
      alert("Validation Error: Origin and Destination warehouses cannot be identical.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const payload = {
      transferNo: transferNo || undefined, // empty string lets the system query sequences
      transferDate,
      warehouseFromId: warehouseFrom,
      warehouseToId: warehouseTo,
      inTransitCode,
      poNo,
      shippingAgent,
      shippingCharge,
      lines: lines.map((l) => ({
        itemId: l.item_id || "00000000-0000-0000-0000-000000000000", // Fallback GUID or empty lookup
        itemCode: l.item_code,
        qty: Number(l.qty),
        uom: l.uom,
        fromLocationId: l.from_location_id || null,
        toLocationId: l.to_location_id || null,
      })),
    };

    try {
      const targetUrl = dbRecordId
        ? `/api/inventory/transfer-stock/${dbRecordId}`
        : "/api/inventory/transfer-stock";

      const targetMethod = dbRecordId ? "PUT" : "POST";

      const response = await fetch(targetUrl, {
        method: targetMethod,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok)
        throw new Error(result.error || "Failed to initialize draft document.");

      setDbRecordId(result.data.id);
      setTransferNo(result.data.transfer_no);
      alert(
        dbRecordId
          ? "Draft modifications updated successfully."
          : "Draft saved successfully.",
      );
      if (onSuccess) onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMessage("An unexpected operation failure occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // API POST INTEGRATION (POST TRANSACTION ENGINE)
  // -------------------------------------------------------------
  const handlePostTransfer = async () => {
    const activeId = dbRecordId;

    // Guardrail: If record hasn't been saved to DB yet, initialize draft layer first
    if (!activeId) {
      if (
        !confirm(
          "Document must be saved as draft before final processing. Proceed?",
        )
      )
        return;
      await handleSaveDraft();
      return;
    }

    if (isPosted) {
      alert("This document is already finalized and posted.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/inventory/transfer-stock/${activeId}/post`,
        {
          method: "POST",
        },
      );
      const result = await response.json();

      if (!response.ok)
        throw new Error(
          result.error || "Posting transactional calculation failed.",
        );

      setIsPosted(true);
      alert(
        result.message ||
          "Stock Transfer posted and inventory quantities updated successfully.",
      );
      if (onSuccess) onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMessage("An unexpected operation failure occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLine = () => {
    const newLine: TransferLine = {
      local_key: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      item_id: "",
      item_code: "",
      item_description: "",
      qty: 0,
      uom: "Pcs",
      from_location_id: "",
      to_location_id: "",
      allocations: [],
    };
    setLines([...lines, newLine]);
  };

  /* const updateLineField = (
    localKey: string,
    field: keyof TransferLine,
    value: any,
  ) => {
    setLines((prev) =>
      prev.map((l) =>
        l.local_key === localKey ? { ...l, [field]: value } : l,
      ),
    );
  }; */

  const removeLineItemRow = (localKey: string) => {
    setLines((prev) => prev.filter((l) => l.local_key !== localKey));
  };

  const updateLineField = <K extends keyof TransferLine>(
    key: string,
    field: K,
    value: TransferLine[K],
  ) => {
    setLines((prev) =>
      prev.map((line) =>
        line.local_key === key ? { ...line, [field]: value } : line,
      ),
    );
  };

  const handleSaveAllocations = (allocationsPayload: AllocationPayload[]) => {
    setLines((prev) =>
      prev.map((line) =>
        line.local_key === activeAllocationRowKey
          ? { ...line, allocations: allocationsPayload }
          : line,
      ),
    );
    setIsAllocationModalOpen(false);
    setActiveAllocationRowKey(null);
  };

  useEffect(() => {
    const loadCoreLookups = async () => {
      try {
        setIsLoading(true);
        const whRes = await fetch("/api/lookups/warehouses");
        const whData = await whRes.json();
        setWarehouses(whData.data || []);
      } catch (err) {
        console.error("Failed to populate master warehouse list", err);
        setErrorMessage("Master lookup synchronization failure.");
      } finally {
        setIsLoading(false);
      }
    };
    loadCoreLookups();
  }, []);

  useEffect(() => {
    if (!warehouseFrom) {
      setFromLocations([]);
      return;
    }
    const fetchFromLocations = async () => {
      try {
        const res = await fetch(
          `/api/lookups/locations?warehouse_id=${warehouseFrom}`,
        );
        const result = await res.json();
        setFromLocations(result.data || []);
      } catch (err) {
        console.error("Error updating origin sub-locations", err);
      }
    };
    fetchFromLocations();
  }, [warehouseFrom]);

  useEffect(() => {
    if (!warehouseTo) {
      setToLocations([]);
      return;
    }
    const fetchToLocations = async () => {
      try {
        const res = await fetch(
          `/api/lookups/locations?warehouse_id=${warehouseTo}`,
        );
        const result = await res.json();
        setToLocations(result.data || []);
      } catch (err) {
        console.error("Error updating destination sub-locations", err);
      }
    };
    fetchToLocations();
  }, [warehouseTo]);

  const handleModalItemSelect = (selectedItem: ItemLookupRecord) => {
    if (!activeItemRowKey) return;

    setLines((prev) =>
      prev.map((line) => {
        if (line.local_key !== activeItemRowKey) return line;
        return {
          ...line,
          item_id: selectedItem.id,
          item_code: selectedItem.item_code,
          item_description: selectedItem.name,
            uom: selectedItem.base_uom_id || "Pcs",
        };
      }),
    );

    setIsItemModalOpen(false);
    setActiveItemRowKey(null);
  };

  const isFormDisabled = mode === "view" || isPosted || isLoading;

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span>Inventory</span> <span>/</span> <span>Transfer Stock</span>
        </div>
        {isPosted && (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Status: Posted & Executed
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-xs">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Header Cards Panel */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Transfer Number
          </label>
          <input
            type="text"
            placeholder="Auto Sequence Generated"
            value={transferNo}
            disabled
            className="w-full text-xs border p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Transfer Posting Date
          </label>
          <input
            type="date"
            value={transferDate}
            disabled={isPosted || isFormDisabled || isLoading}
            onChange={(e) => setTransferDate(e.target.value)}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Transit Method Code
          </label>
          <input
            type="text"
            value={inTransitCode}
            disabled={isPosted || isFormDisabled || isLoading}
            onChange={(e) => setInTransitCode(e.target.value)}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Origin Warehouse (From)
          </label>
          <select
            value={warehouseFrom}
            disabled={isPosted || isFormDisabled || isLoading}
            onChange={(e) => {
              setWarehouseFrom(e.target.value);
              // Clear previous line details to preserve location constraints
              setLines([]);
            }}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          >
            <option value="">-- Select Source Whse --</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Destination Warehouse (To)
          </label>
          <select
            value={warehouseTo}
            disabled={isPosted || isFormDisabled || isLoading}
            onChange={(e) => {
              setWarehouseTo(e.target.value);
              setLines([]);
            }}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          >
            <option value="">-- Select Dest Whse --</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            P.O No.
          </label>
          <input
            type="text"
            value={poNo}
            onChange={(e) => setPoNo(e.target.value)}
            disabled={isPosted || isFormDisabled || isLoading}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Shipping Agent Name
          </label>
          <input
            type="text"
            value={shippingAgent}
            onChange={(e) => setShippingAgent(e.target.value)}
            disabled={isPosted || isFormDisabled || isLoading}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Freight / Shipping Cost
          </label>
          <input
            type="number"
            value={shippingCharge}
            onChange={(e) => setShippingCharge(Number(e.target.value))}
            disabled={isPosted || isFormDisabled || isLoading}
            className="w-full text-xs border p-2 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono"
          />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800 my-4" />

      {/* Grid Lines Table */}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Material Allocation Lines
          </h3>
          <button
            type="button"
            disabled={isPosted || !warehouseFrom || !warehouseTo}
            onClick={handleAddLine}
            className="px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            + Add Material Line
          </button>
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 font-medium">
                <th className="p-3 w-56">Item Code Lookup</th>
                <th className="p-3">Item Description</th>
                <th className="p-3 w-44">From Bin Location</th>
                <th className="p-3 w-44">To Bin Location</th>
                <th className="p-3 w-24">Qty</th>
                <th className="p-3 w-20">UoM</th>
                <th className="p-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-zinc-400 italic bg-zinc-50/50 dark:bg-zinc-900/20"
                  >
                    {!warehouseFrom || !warehouseTo
                      ? "Select base Origin and Destination warehouses above to start balancing movements."
                      : "No distribution lines items configured yet."}
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr
                    key={line.local_key}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
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
                          className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-2.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 transition"
                        >
                          Find
                        </button>
                      </div>
                    </td>

                    <td className="p-2 text-zinc-500 truncate max-w-[150px]">
                      {line.item_description || (
                        <span className="text-zinc-300 italic">
                          No asset linked
                        </span>
                      )}
                    </td>

                    <td className="p-2">
                      <select
                        value={line.from_location_id}
                        disabled={isPosted}
                        onChange={(e) =>
                          updateLineField(
                            line.local_key,
                            "from_location_id",
                            e.target.value,
                          )
                        }
                        className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      >
                        <option value="">-- Select Bin --</option>
                        {fromLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2">
                      <select
                        value={line.to_location_id}
                        disabled={isPosted}
                        onChange={(e) =>
                          updateLineField(
                            line.local_key,
                            "to_location_id",
                            e.target.value,
                          )
                        }
                        className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      >
                        <option value="">-- Select Bin --</option>
                        {toLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        disabled={isPosted}
                        onChange={(e) =>
                          updateLineField(
                            line.local_key,
                            "qty",
                            Number(e.target.value),
                          )
                        }
                        className="w-full border p-2 rounded-lg font-mono bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        value={line.uom}
                        disabled={isPosted}
                        onChange={(e) =>
                          updateLineField(line.local_key, "uom", e.target.value)
                        }
                        className="w-full border p-2 rounded-lg text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      />
                    </td>

                    <td className="p-2 text-center space-x-2">
                      <button
                        onClick={() => {
                          setActiveAllocationRowKey(line.local_key);
                          setIsAllocationModalOpen(true);
                        }}
                        className="p-1 text-orange-500 hover:bg-orange-50 rounded disabled:opacity-50"
                        title="Allocate Stock Layer"
                      >
                        📦
                      </button>
                      <button
                        type="button"
                        disabled={isPosted}
                        onClick={() => removeLineItemRow(line.local_key)}
                        className="text-red-500 hover:text-red-700 font-medium text-xs disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions Form */}
      <div className="flex justify-end space-x-3 mt-6">
        {mode !== "create" && (
          <button
            disabled={isLoading}
            className="border px-4 py-2 rounded text-xs font-medium bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Print/View Transfer
          </button>
        )}

        {!isPosted && mode !== "view" && (
          <>
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="border px-4 py-2 rounded text-xs font-medium bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handlePostTransfer}
              disabled={isLoading}
              className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Post Transfer"}
            </button>
          </>
        )}
      </div>

      {/* ITEM POPUP SEARCH MODAL */}
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

      {/* Row Controlled Allocation Modal Instance */}
      {isAllocationModalOpen &&
        activeAllocationRowKey &&
        activeAllocationLine && (
          <StockAllocationModal
            key={`transfer-alloc-${activeAllocationRowKey}`}
            isOpen={isAllocationModalOpen}
            onClose={() => {
              setIsAllocationModalOpen(false);
              setActiveAllocationRowKey(null);
            }}
            targetQuantity={activeAllocationLine.qty}
            itemCode={activeAllocationLine.item_code}
            itemName={activeAllocationLine.item_description}
            warehouseName={warehouseFrom}
            initialAllocations={activeAllocationLine.allocations || []}
            onSave={handleSaveAllocations}
          />
        )}
    </div>
  );
}
{
  /* <div className="bg-white p-6 rounded shadow-sm border border-gray-200 mb-6 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Transfer Stock No.
            </label>
            <input
              type="text"
              value={transferNo || "AUTO-GENERATED"}
              disabled
              className="w-2/3 border p-2 bg-gray-100 rounded text-xs font-mono text-gray-600"
            />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Warehouse From *
            </label>
            <select
              value={warehouseFrom}
              onChange={(e) => setWarehouseFrom(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            >
              <option value="">Select Origin...</option>
              <option value="WHS-MAIN-UUID">Main Central Warehouse</option>
              <option value="WHS-SUB-UUID">Secondary Outlet Warehouse</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Warehouse To *
            </label>
            <select
              value={warehouseTo}
              onChange={(e) => setWarehouseTo(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            >
              <option value="">Select Destination...</option>
              <option value="WHS-MAIN-UUID">Main Central Warehouse</option>
              <option value="WHS-SUB-UUID">Secondary Outlet Warehouse</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              In-transit Code *
            </label>
            <select
              value={inTransitCode}
              onChange={(e) => setInTransitCode(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            >
              <option value="Road">Road Logistics</option>
              <option value="Air">Air Freight</option>
              <option value="Sea">Sea Cargo</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Transfer Stock Date
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              P.O No.
            </label>
            <input
              type="text"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Shipping Agent Name
            </label>
            <input
              type="text"
              value={shippingAgent}
              onChange={(e) => setShippingAgent(e.target.value)}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-xs font-medium text-gray-700">
              Shipping Charge
            </label>
            <input
              type="number"
              value={shippingCharge}
              onChange={(e) => setShippingCharge(Number(e.target.value))}
              disabled={isFormDisabled}
              className="w-2/3 border p-2 rounded text-xs disabled:bg-gray-50"
            />
          </div>
        </div>
      </div> 
      
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
              <th className="p-3">Item No.</th>
              <th className="p-3">Description</th>
              <th className="p-3 w-24">Qty.</th>
              <th className="p-3 w-20">U.O.M</th>
              <th className="p-3">From Location</th>
              <th className="p-3">To Location</th>
              <th className="p-3 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.local_key}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="p-2">
                  <input
                    type="text"
                    value={line.item_code}
                    onChange={(e) =>
                      handleLineChange(
                        line.local_key,
                        "item_code",
                        e.target.value,
                      )
                    }
                    disabled={isFormDisabled}
                    className="w-full border p-1 rounded disabled:bg-gray-50"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={line.item_description}
                    disabled
                    className="w-full border p-1 bg-gray-50 rounded text-gray-500"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) =>
                      handleLineChange(
                        line.local_key,
                        "qty",
                        Number(e.target.value),
                      )
                    }
                    disabled={isFormDisabled}
                    className="w-full border p-1 rounded disabled:bg-gray-50"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={line.uom}
                    disabled
                    className="w-full border p-1 bg-gray-50 rounded text-gray-500"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={line.from_location_id}
                    onChange={(e) =>
                      handleLineChange(
                        line.local_key,
                        "from_location_id",
                        e.target.value,
                      )
                    }
                    disabled={isFormDisabled}
                    className="w-full border p-1 rounded disabled:bg-gray-50"
                  >
                    <option value="">Select Loc...</option>
                    <option value="LOC-BIN-A">Bin Row A</option>
                  </select>
                </td>
                <td className="p-2">
                  <select
                    value={line.to_location_id}
                    onChange={(e) =>
                      handleLineChange(
                        line.local_key,
                        "to_location_id",
                        e.target.value,
                      )
                    }
                    disabled={isFormDisabled}
                    className="w-full border p-1 rounded disabled:bg-gray-50"
                  >
                    <option value="">Select Loc...</option>
                    <option value="LOC-BIN-B">Bin Row B</option>
                  </select>
                </td>
                <td className="p-2 text-center flex justify-center space-x-2 pt-3">
                  <button
                    onClick={() => {
                      setActiveAllocationRowKey(line.local_key);
                      setIsAllocationModalOpen(true);
                    }}
                    className="p-1 text-orange-500 hover:bg-orange-50 rounded disabled:opacity-50"
                    title="Allocate Stock Layer"
                  >
                    📦
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isFormDisabled && (
          <button
            onClick={handleAddLine}
            className="mt-4 flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <span className="mr-1 text-lg">+</span> Add Line Item
          </button>
        )}
      </div>

      
      */
}

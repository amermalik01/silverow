// app/components/shared/modals/StockAllocationModal.tsx

"use client";

import { useState } from "react";

export type StockAllocationRecord = {
  date_received: string;
  prod_date: string;
  expiry_date: string;
  batch_no: string;
  serial_no: string;
  quantity: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (allocations: StockAllocationRecord[]) => void;
  targetQuantity: number;
  itemId?: string;
  itemCode: string;
  itemName: string;
  warehouseId?: string;
  warehouseName: string;
  locationId?: string;
  locationName: string;
  uomName?: string;
  initialAllocations?: StockAllocationRecord[];
};

export default function StockAllocationModal({
  open,
  onClose,
  onSave,
  targetQuantity,
  itemId,
  itemCode,
  itemName,
  warehouseId,
  warehouseName,
  locationId,
  locationName,
  uomName,
  initialAllocations = [],
}: Props) {
  // 🌟 Initialize state directly from props layer
  const [allocations, setAllocations] =
    useState<StockAllocationRecord[]>(initialAllocations);

  // Track ad-hoc text inputs on the entry bar line independently
  const [newRowInput, setNewRowInput] = useState({
    date_received: new Date().toISOString().split("T")[0],
    prod_date: "",
    expiry_date: "",
    batch_no: "",
    serial_no: "",
    quantity: "", // Tracked as a string to handle fluent typing natively
  });

  // 📈 Derive calculations dynamically during the render cycle (No useEffect needed)
  const totalAllocated = allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  // Determine the smart default for when the user hasn't explicitly typed an ad-hoc value
  const derivedDefaultQty = Math.max(0, qtyToAllocate);
  const currentInputQty =
    newRowInput.quantity === ""
      ? derivedDefaultQty
      : parseFloat(newRowInput.quantity) || 0;

  // Dynamically blend input changes with derived context quantity for the visual input display value
  // const visualRowQuantity = Math.max(0, qtyToAllocate);

  const handleAddRow = () => {
    // 🛑 Rule 1: Prevent negative stock allocations or 0 entries
    // 🛑 Rule 2: Prevent adding lines if the target stock allocation is already completed (qtyToAllocate <= 0)
    if (currentInputQty <= 0 || qtyToAllocate <= 0) return;

    // 🛑 Rule 3: Cap the entry to prevent accidental over-allocation beyond target limits
    const allowedQty = Math.min(currentInputQty, qtyToAllocate);

    const rowToAdd: StockAllocationRecord = {
      ...newRowInput,
      quantity: allowedQty,
    };

    const updatedAllocations = [...allocations, rowToAdd];
    setAllocations(updatedAllocations);

    // Clear inputs cleanly and reset quantity field for the next remaining balance chunk
    const nextTotalAllocated = updatedAllocations.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const nextRemaining = Math.max(0, targetQuantity - nextTotalAllocated);

    setNewRowInput({
      date_received: new Date().toISOString().split("T")[0],
      prod_date: "",
      expiry_date: "",
      batch_no: "",
      serial_no: "",
      quantity: nextRemaining > 0 ? nextRemaining.toString() : "",
    });
  };

  const handleRemoveRow = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleCommitSave = () => {
    onSave(allocations);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl w-full max-w-7xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* HEADER */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Stock Allocation - Purchase Intake Pipeline ({itemCode})
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition-colors"
          >
            &times;
          </button>
        </div>

        {/* DETAILS PANEL */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-sm">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode} - {itemName}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Location
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {locationName || "-"}
            </div>
          </div>
          <div className="grid grid-cols-3 col-span-2 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                Target Qty.
              </div>
              <div className="text-lg font-bold">
                {targetQuantity}{" "}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyToAllocate !== 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div className="text-xs text-red-500 dark:text-red-400 uppercase font-medium">
                Qty. To Allocate
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {qtyToAllocate}{" "}
                <span className="text-xs text-red-400 dark:text-red-500/70 font-normal">
                  {uomName}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-green-600 dark:text-green-400 uppercase font-medium">
                Allocated Total
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {totalAllocated}{" "}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INPUT GRID BARS */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                {/* <tr className="bg-gray-100 uppercase font-semibold text-gray-600 border-b"> */}
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>
                <th className="p-3">Batch / Lot No.</th>
                <th className="p-3">Serial No.</th>
                <th className="p-3 w-28 text-right">Qty. ({uomName})</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* CURRENT RECORDS STACK */}
              {allocations.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{item.date_received}</td>
                  <td className="p-3">{item.prod_date || "-"}</td>
                  <td className="p-3">{item.expiry_date || "-"}</td>
                  <td className="p-3 font-mono">{item.batch_no || "-"}</td>
                  <td className="p-3 font-mono">{item.serial_no || "-"}</td>
                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {item.quantity}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors"
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}

              {/* NEW AD-HOC ENTRY COMPONENT LINE */}
              <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                <td className="p-2">
                  <input
                    type="date"
                    value={newRowInput.date_received}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        date_received: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={newRowInput.prod_date}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        prod_date: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={newRowInput.expiry_date}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        expiry_date: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Lot / Batch No"
                    value={newRowInput.batch_no}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        batch_no: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Serial Tracking"
                    value={newRowInput.serial_no}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        serial_no: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    disabled={qtyToAllocate <= 0}
                    placeholder={
                      derivedDefaultQty > 0 ? derivedDefaultQty.toString() : "0"
                    }
                    // value={newRowInput.quantity}
                    value={qtyToAllocate <= 0 ? "0" : newRowInput.quantity}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        quantity: e.target.value, // Keep it fluid as a string so backspacing/typing partial numbers works perfectly
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={currentInputQty <= 0 || qtyToAllocate <= 0}
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-xs font-bold text-lg disabled:opacity-30 transition-opacity"
                    
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCommitSave}
            disabled={qtyToAllocate !== 0}
            className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white px-5 py-2 rounded text-sm disabled:opacity-40 font-medium transition-opacity"
            
          >
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useState, useEffect } from "react";

export type StockAllocationRecord = {
  date_received: string;
  prod_date: string;
  expiry_date: string;
  batch_no: string;
  serial_no: string;
  quantity: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (allocations: StockAllocationRecord[]) => void;
  targetQuantity: number;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  locationName: string;
  initialAllocations?: StockAllocationRecord[];
};

export default function StockAllocationModal({
  open,
  onClose,
  onSave,
  targetQuantity,
  itemCode,
  itemName,
  warehouseName,
  locationName,
  initialAllocations = [],
}: Props) {
  // 🌟 Initialize state directly from props instead of syncing inside useEffect
  const [allocations, setAllocations] =
    useState<StockAllocationRecord[]>(initialAllocations);

  const totalAllocated = allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  const [newRow, setNewRow] = useState<StockAllocationRecord>({
    date_received: new Date().toISOString().split("T")[0],
    prod_date: "",
    expiry_date: "",
    batch_no: "",
    serial_no: "",
    quantity: Math.max(0, qtyToAllocate),
  });

  const handleAddRow = () => {
    if (newRow.quantity <= 0) return;

    const updatedAllocations = [...allocations, { ...newRow }];
    setAllocations(updatedAllocations);

    const nextTotalAllocated = updatedAllocations.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const nextRemaining = Math.max(0, targetQuantity - nextTotalAllocated);

    setNewRow({
      date_received: new Date().toISOString().split("T")[0],
      prod_date: "",
      expiry_date: "",
      batch_no: "",
      serial_no: "",
      quantity: nextRemaining,
    });
  };

  const handleRemoveRow = (index: number) => {
    const updated = allocations.filter((_, i) => i !== index);
    setAllocations(updated);

    const nextTotalAllocated = updated.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    setNewRow((prev) => ({
      ...prev,
      quantity: Math.max(0, targetQuantity - nextTotalAllocated),
    }));
  };

  const handleCommitSave = () => {
    onSave(allocations);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white text-black rounded-xl shadow-xl w-full max-w-7xl overflow-hidden border">
  
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-800">
            Stock Allocation - Item Journal ({itemCode})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

    
        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-gray-50 border-b text-sm">
          <div>
            <div className="text-gray-500 font-medium">Item</div>
            <div className="font-semibold text-gray-900">
              {itemCode} - {itemName}
            </div>
          </div>
          <div>
            <div className="text-gray-500 font-medium">Warehouse</div>
            <div className="font-semibold text-gray-900">{warehouseName}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium">Location</div>
            <div className="font-semibold text-gray-900">
              {locationName || "-"}
            </div>
          </div>
          <div className="grid grid-cols-3 col-span-2 gap-2 text-center">
            <div className="border bg-white rounded p-2">
              <div className="text-xs text-gray-500 uppercase">Order Qty.</div>
              <div className="text-lg font-bold">
                {targetQuantity}{" "}
                <span className="text-xs text-gray-400">{uomName}</span>
              </div>
            </div>
            <div
              className={`border rounded p-2 bg-white ${qtyToAllocate !== 0 ? "border-red-300 bg-red-50/20" : "border-green-300"}`}
            >
              <div className="text-xs text-red-500 uppercase font-medium">
                Qty. To Allocate
              </div>
              <div className="text-lg font-bold text-red-600">
                {qtyToAllocate}{" "}
                <span className="text-xs text-red-400">{uomName}</span>
              </div>
            </div>
            <div className="border bg-white rounded p-2">
              <div className="text-xs text-green-600 uppercase font-medium">
                Allocated Stock
              </div>
              <div className="text-lg font-bold text-green-600">
                {totalAllocated}{" "}
                <span className="text-xs text-gray-400">{uomName}</span>
              </div>
            </div>
          </div>
        </div>

   
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 uppercase font-semibold text-gray-600 border-b">
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>
                <th className="p-3">Ref. No.</th>
                <th className="p-3">Frame / Serial No.</th>
                <th className="p-3 w-28 text-right">Qty. ({uomName})</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
            
              {allocations.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50/50">
                  <td className="p-3">{item.date_received}</td>
                  <td className="p-3">{item.prod_date || "-"}</td>
                  <td className="p-3">{item.expiry_date || "-"}</td>
                  <td className="p-3 font-mono">{item.batch_no || "-"}</td>
                  <td className="p-3 font-mono">{item.serial_no || "-"}</td>
                  <td className="p-3 text-right font-semibold">
                    {item.quantity}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}

         
              <tr className="bg-gray-50/60">
                <td className="p-2">
                  <input
                    type="date"
                    value={newRow.date_received}
                    onChange={(e) =>
                      setNewRow({ ...newRow, date_received: e.target.value })
                    }
                    className="border rounded p-1.5 w-full bg-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={newRow.prod_date}
                    onChange={(e) =>
                      setNewRow({ ...newRow, prod_date: e.target.value })
                    }
                    className="border rounded p-1.5 w-full bg-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={newRow.expiry_date}
                    onChange={(e) =>
                      setNewRow({ ...newRow, expiry_date: e.target.value })
                    }
                    className="border rounded p-1.5 w-full bg-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Ref/Lot No"
                    value={newRow.batch_no}
                    onChange={(e) =>
                      setNewRow({ ...newRow, batch_no: e.target.value })
                    }
                    className="border rounded p-1.5 w-full bg-white font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Frame/Serial"
                    value={newRow.serial_no}
                    onChange={(e) =>
                      setNewRow({ ...newRow, serial_no: e.target.value })
                    }
                    className="border rounded p-1.5 w-full bg-white font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={newRow.quantity || ""}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border rounded p-1.5 w-full text-right bg-white font-semibold"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="bg-green-700 hover:bg-green-800 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-xs font-bold text-lg"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

   
        <div className="bg-gray-50 p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-100 bg-white"
          >
            Close
          </button>
          <button
            onClick={handleCommitSave}
            disabled={qtyToAllocate !== 0}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded text-sm disabled:opacity-40 font-medium transition-opacity"
          >
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  );
} */

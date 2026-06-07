// app/components/inventory/stock-transfer/StockAllocationModal.tsx

import React, { useState, useEffect } from "react";
import { AllocationPayload } from "./TransferStockForm";

interface StockBatchRow {
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
  current_allocation: number; // User input input field
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetQuantity: number;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  initialAllocations: AllocationPayload[]; // Fixed: Explicit type instead of any[]
  onSave: (allocations: AllocationPayload[]) => void; // Fixed: Explicit type instead of any[]
}

// Move the static array configuration completely outside the component or right above state definition
const INITIAL_MOCK_BATCHES: StockBatchRow[] = [
  {
    production_date: "13/10/2022",
    use_by_date: "13/10/2023",
    date_received: "09/06/2022",
    storage_location: "Bikes",
    cons_no: "",
    ref_no: "CAAU6592879",
    serial_no: "RD801010",
    total_qty: 1,
    sold_qty: 1,
    returned_qty: 0,
    allocated_qty: 0,
    available_qty: 0,
    current_allocation: 0,
  },
];

const StockAllocationModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  targetQuantity,
  itemCode,
  itemName,
  warehouseName,
  initialAllocations,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [batches, setBatches] = useState<StockBatchRow[]>(INITIAL_MOCK_BATCHES);

  // Simulation tracking lookups
  /* useEffect(() => {
    // This data would be fetched from database where item_id = current row and warehouse_id = warehouseFrom
    const mockFetchedBatches: StockBatchRow[] = [
      {
        production_date: "13/10/2022",
        use_by_date: "13/10/2023",
        date_received: "09/06/2022",
        storage_location: "Bikes",
        cons_no: "",
        ref_no: "CAAU6592879",
        serial_no: "RD801010",
        total_qty: 1,
        sold_qty: 1,
        returned_qty: 0,
        allocated_qty: 0,
        available_qty: 0,
        current_allocation: 0,
      },
    ];
    
    setTimeout(() => {
        setBatches(mockFetchedBatches);
    }, 0);
  }, [itemCode]); */

  const totalAllocated = batches.reduce(
    (sum, b) => sum + b.current_allocation,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  const handleAllocationInputChange = (index: number, value: number) => {
    setBatches((prev) =>
      prev.map((batch, idx) => {
        if (idx !== index) return batch;
        // Guardrails to make sure allocations don't exceed batch capacities
        const sanitizedValue = Math.min(value, batch.available_qty);
        return { ...batch, current_allocation: sanitizedValue };
      }),
    );
  };

  const handleConfirmSave = () => {
    const activePayload = batches.filter((b) => b.current_allocation > 0);
    onSave(activePayload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header banner context */}
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-700 text-base">
            Stock Allocation - {itemCode} ({itemName})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        {/* Info Metric Badges Panel */}
        <div className="p-4 grid grid-cols-5 gap-4 border-b bg-gray-50 text-sm">
          <div>
            <p className="text-xs text-gray-500">Item</p>
            <p className="font-medium text-gray-800">
              {itemCode} - {itemName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Warehouse</p>
            <p className="font-medium text-gray-800">{warehouseName}</p>
          </div>
          <div className="bg-white p-2 border rounded text-center">
            <span className="block text-xs text-gray-500">Order Qty.</span>
            <span className="text-lg font-bold text-gray-800">
              {targetQuantity} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
          <div
            className={`p-2 border rounded text-center bg-white ${qtyToAllocate !== 0 ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}
          >
            <span className="block text-xs text-red-500">Qty. To Allocate</span>
            <span className="text-lg font-bold text-red-600">
              {qtyToAllocate} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
          <div className="bg-white p-2 border rounded text-center border-emerald-500">
            <span className="block text-xs text-emerald-600">
              Allocated Stock
            </span>
            <span className="text-lg font-bold text-emerald-600">
              {totalAllocated} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
        </div>

        {/* Filter Utilities Bar */}
        <div className="p-3 border-b flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-1.5 rounded text-sm w-64"
          />
          <button className="border px-3 py-1.5 rounded text-sm bg-white hover:bg-gray-50 text-gray-600">
            Clear Filter
          </button>
        </div>

        {/* Batches Sub-ledger Listing */}
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-emerald-800 text-white font-medium uppercase tracking-wider">
                <th className="p-2">Production Date</th>
                <th className="p-2">Use By Date</th>
                <th className="p-2">Date Received</th>
                <th className="p-2">Storage Loc.</th>
                <th className="p-2">Cons. No.</th>
                <th className="p-2">Ref. No.</th>
                <th className="p-2">Serial No.</th>
                <th className="p-2">Total Qty.</th>
                <th className="p-2">Sold Qty.</th>
                <th className="p-2">Returned Qty.</th>
                <th className="p-2">Allocated Qty.</th>
                <th className="p-2">Available Qty.</th>
                <th className="p-2 w-24 text-center">Current Alloc.</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, idx) => (
                <tr
                  key={batch.serial_no || idx}
                  className="border-b hover:bg-gray-50 text-gray-700"
                >
                  <td className="p-2">{batch.production_date}</td>
                  <td className="p-2">{batch.use_by_date}</td>
                  <td className="p-2">{batch.date_received}</td>
                  <td className="p-2">{batch.storage_location}</td>
                  <td className="p-2">{batch.cons_no || "-"}</td>
                  <td className="p-2">{batch.ref_no}</td>
                  <td className="p-2 font-mono font-medium">
                    {batch.serial_no}
                  </td>
                  <td className="p-2">{batch.total_qty}</td>
                  <td className="p-2">{batch.sold_qty}</td>
                  <td className="p-2">{batch.returned_qty}</td>
                  <td className="p-2">{batch.allocated_qty}</td>
                  <td className="p-2 font-bold">{batch.available_qty}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={batch.current_allocation || ""}
                      onChange={(e) =>
                        handleAllocationInputChange(idx, Number(e.target.value))
                      }
                      className="w-16 text-center border border-emerald-400 rounded p-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50/50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Confirmation Footer */}
        <div className="bg-gray-50 p-3 border-t flex justify-end space-x-2">
          <button
            onClick={handleConfirmSave}
            className="bg-emerald-600 text-white text-sm px-4 py-1.5 rounded font-medium shadow hover:bg-emerald-700"
          >
            Save Allocations
          </button>
          <button
            onClick={onClose}
            className="border bg-white text-sm px-4 py-1.5 rounded font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockAllocationModal;

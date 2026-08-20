// app/components/purchases/purchase-orders/PurchaseStockAllocationModal.tsx

// NA app/components/inventory/stock-transfer/StockAllocationModal.tsx

import React, { useState, useEffect } from "react";
import { StockAllocationRecord } from "@/app/components/shared/modals/StockAllocationModal";
import { Button } from "@/components/ui/button";

interface StockBatchRow {
  prod_date: string;       // Aligned to StockAllocationRecord schema
  expiry_date: string;     // Aligned to StockAllocationRecord schema
  date_received: string;
  storage_location: string;
  batch_no: string;        // Aligned to StockAllocationRecord schema
  serial_no: string;
  total_qty: number;
  sold_qty: number;
  returned_qty: number;
  allocated_qty: number;
  available_qty: number;
  current_allocation: number;
}

interface ModalProps {
  open: boolean; // Changed from isOpen to match usage
  onClose: () => void;
  targetQuantity: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  initialAllocations: StockAllocationRecord[];
  onSave: (allocations: StockAllocationRecord[]) => void;
}

const PurchaseStockAllocationModal: React.FC<ModalProps> = ({
  open,
  onClose,
  targetQuantity,
  itemId,
  itemCode,
  itemName,
  warehouseId,
  warehouseName,
  locationId,
  locationName,
  initialAllocations,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [batches, setBatches] = useState<StockBatchRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch batches dynamically based on specific context filters
  useEffect(() => {
    if (!open || !itemId || !warehouseId || !locationId) return;

    const fetchLiveBatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/inventory/batches?item_id=${itemId}&warehouse_id=${warehouseId}&location_id=${locationId}`,
        );
        if (res.ok) {
          const payload = await res.json();
          const dbBatches: StockBatchRow[] = payload.data || [];

          // Map initial allocations back to their active fields
          const mergedBatches = dbBatches.map((batch) => {
            const existingAlloc = initialAllocations.find(
              (a) => a.serial_no === batch.serial_no,
            );
            return {
              ...batch,
              current_allocation: existingAlloc ? existingAlloc.quantity : 0,
            };
          });

          setBatches(mergedBatches);
        }
      } catch (err) {
        console.error("Failed loading inventory batches context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveBatches();
  }, [open, itemId, warehouseId, locationId, initialAllocations]);

  const totalAllocated = batches.reduce(
    (sum, b) => sum + b.current_allocation,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  const handleAllocationInputChange = (index: number, value: number) => {
    setBatches((prev) =>
      prev.map((batch, idx) => {
        if (idx !== index) return batch;
        // Restrict bounds between zero and absolute real availability
        const maxAllowed =
          batch.available_qty +
          (initialAllocations.find((a) => a.serial_no === batch.serial_no)
            ?.quantity || 0);
        const sanitizedValue = Math.max(0, Math.min(value, maxAllowed));
        return { ...batch, current_allocation: sanitizedValue };
      }),
    );
  };

  const handleConfirmSave = () => {
    const activePayload: StockAllocationRecord[] = batches
      .filter((b) => b.current_allocation > 0)
      .map((b) => ({
        prod_date: b.prod_date,
        expiry_date: b.expiry_date,
        date_received: b.date_received,
        batch_no: b.batch_no,
        serial_no: b.serial_no,
        quantity: b.current_allocation,
      }));
    onSave(activePayload);
  };

//   const handleConfirmSave = () => {
//     const activePayload: StockAllocationRecord[] = batches
//       .filter((b) => b.current_allocation > 0)
//       .map((b) => ({
//         production_date: b.production_date,
//         use_by_date: b.use_by_date,
//         date_received: b.date_received,
//         storage_location: b.storage_location,
//         cons_no: b.cons_no,
//         ref_no: b.ref_no,
//         serial_no: b.serial_no,
//         quantity: b.current_allocation,
//       }));
//     onSave(activePayload);
//   };

//   const filteredBatches = batches.filter(
//     (b) =>
//       b.serial_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       b.ref_no.toLowerCase().includes(searchQuery.toLowerCase()),
//   );

  const filteredBatches = batches.filter(
    (b) =>
      b.serial_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.batch_no.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-7xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gray-100 dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-base">
            Stock Allocation - {itemCode} ({itemName})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
          >
            &times;
          </button>
        </div>

        {/* Metric Badges Panel */}
        <div className="p-4 grid grid-cols-5 gap-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-xs">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Item</p>
            <p className="font-medium">
              {itemCode} - {itemName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Target Location
            </p>
            <p className="font-medium">
              {warehouseName} ({locationName})
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 border dark:border-slate-700 rounded text-center">
            <span className="block text-xs text-gray-500">Order Qty.</span>
            <span className="text-lg font-bold">
              {targetQuantity} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
          <div
            className={`p-2 border rounded text-center ${qtyToAllocate !== 0 ? "border-red-300 bg-red-50 dark:bg-red-900/20" : "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"}`}
          >
            <span className="block text-xs text-red-500">Qty. To Allocate</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              {qtyToAllocate} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 border rounded text-center border-emerald-500">
            <span className="block text-xs text-emerald-600 dark:text-emerald-400">
              Allocated Stock
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {totalAllocated} <span className="text-xs font-normal">Pcs</span>
            </span>
          </div>
        </div>

        {/* Filter Utilities */}
        <div className="p-3 border-b dark:border-slate-700 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search Serial/Ref No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 rounded text-xs w-64"
          />
          <Button
            onClick={() => setSearchQuery("")}
            className="border dark:border-slate-700 px-3 py-1.5 rounded text-xs bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Clear Filter
          </Button>
        </div>

        {/* Listing */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="text-center p-8 text-gray-500">
              Loading live batch balances...
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-emerald-800 text-white font-medium capitalize tracking-wider">
                  <th className="p-2">Production Date</th>
                  <th className="p-2">Use By Date</th>
                  <th className="p-2">Date Received</th>
                  <th className="p-2">Storage Loc.</th>
                  <th className="p-2">Ref. No.</th>
                  <th className="p-2">Serial No.</th>
                  <th className="p-2">Available Qty.</th>
                  <th className="p-2 w-24 text-center">Current Alloc.</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-4 text-gray-500">
                      No batch registers matching filters found.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch, idx) => (
                    <tr
                      key={batch.serial_no || idx}
                      className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="p-2">{batch.prod_date}</td>
                      <td className="p-2">{batch.expiry_date}</td>
                      <td className="p-2">{batch.date_received}</td>
                      <td className="p-2">{batch.storage_location}</td>
                      <td className="p-2">{batch.batch_no}</td>
                      <td className="p-2 font-mono font-medium">
                        {batch.serial_no}
                      </td>
                      <td className="p-2 font-bold">{batch.available_qty}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={batch.current_allocation || ""}
                          onChange={(e) =>
                            handleAllocationInputChange(
                              idx,
                              Number(e.target.value),
                            )
                          }
                          className="w-16 text-center border border-emerald-400 rounded p-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-800 p-3 border-t dark:border-slate-700 flex justify-end space-x-2">
          <Button
            onClick={handleConfirmSave}
            variant="save"
          >
            Save Allocations
          </Button>
          <Button
            onClick={onClose}
            variant="cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseStockAllocationModal;

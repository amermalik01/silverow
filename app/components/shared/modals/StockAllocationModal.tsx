// app/components/shared/modals/StockAllocationModal.tsx

"use client";

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

  // Load existing records if modifying

//   useEffect(() => {
//     if (open) {
//       setAllocations(initialAllocations);
//       setNewRow({
//         date_received: new Date().toISOString().split("T")[0],
//         prod_date: "",
//         expiry_date: "",
//         batch_no: "",
//         serial_no: "",
//         quantity: Math.max(
//           0,
//           targetQuantity -
//             initialAllocations.reduce((s, a) => s + a.quantity, 0),
//         ),
//       });
//     }
//   }, [open]);

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
        {/* HEADER */}
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

        {/* DETAILS PANEL */}
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
                <span className="text-xs text-gray-400">Pcs</span>
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
                <span className="text-xs text-red-400">Pcs</span>
              </div>
            </div>
            <div className="border bg-white rounded p-2">
              <div className="text-xs text-green-600 uppercase font-medium">
                Allocated Stock
              </div>
              <div className="text-lg font-bold text-green-600">
                {totalAllocated}{" "}
                <span className="text-xs text-gray-400">Pcs</span>
              </div>
            </div>
          </div>
        </div>

        {/* INPUT GRID BARS */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 uppercase font-semibold text-gray-600 border-b">
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>
                <th className="p-3">Ref. No.</th>
                <th className="p-3">Frame / Serial No.</th>
                <th className="p-3 w-28 text-right">Qty. (Pcs)</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* CURRENT RECORDS STACK */}
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

              {/* NEW AD-HOC ENTRY COMPONENT LINE */}
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

        {/* FOOTER ACTIONS */}
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
}

/* useEffect(() => {
    if (open) {
      setAllocations(initialAllocations.length > 0 ? initialAllocations : []);
      setNewRow((prev) => ({
        ...prev,
        quantity: Math.max(
          0,
          targetQuantity -
            initialAllocations.reduce((s, a) => s + a.quantity, 0),
        ),
      }));
    }
  }, [open, initialAllocations, targetQuantity]); */

/* const handleAddRow = () => {
    if (newRow.quantity <= 0) return;
    setAllocations([...allocations, { ...newRow }]);

    // Auto-calculate remaining quantity for next entry line
    const nextRemaining = Math.max(0, qtyToAllocate - newRow.quantity);
    setNewRow({
      date_received: new Date().toISOString().split("T")[0],
      prod_date: "",
      expiry_date: "",
      batch_no: "",
      serial_no: "",
      quantity: nextRemaining,
    });
  }; */

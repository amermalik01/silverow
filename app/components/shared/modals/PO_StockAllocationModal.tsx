// app/components/shared/modals/PO_StockAllocationModal.tsx

"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

export type PO_StockAllocationRecord = {
  location_id: string;
  location_name: string;

  date_received: string;
  prod_date: string;
  expiry_date: string;
  batch_no: string;
  serial_no: string;
  quantity: number;
};

type WarehouseLocation = {
  id: string;
  title: string;
  code: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (allocations: PO_StockAllocationRecord[]) => void;
  targetQuantity: number;
  itemId?: string;
  itemCode: string;
  itemName: string;
  warehouseId?: string;
  warehouseName: string;
  // locationId?: string;
  // locationName: string;
  uomName?: string;
  initialAllocations?: PO_StockAllocationRecord[];
};

export default function PO_StockAllocationModal({
  open,
  onClose,
  onSave,
  targetQuantity,
  itemId,
  itemCode,
  itemName,
  warehouseId,
  warehouseName,
  // locationId,
  // locationName,
  uomName,
  initialAllocations = [],
}: Props) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);

  const [allocations, setAllocations] =
    useState<PO_StockAllocationRecord[]>(initialAllocations);

  const [newRowInput, setNewRowInput] = useState({
    location_id: "",
    location_name: "",

    date_received: new Date().toISOString().split("T")[0],
    prod_date: "",
    expiry_date: "",
    batch_no: "",
    serial_no: "",
    quantity: "",
  });

  const totalAllocated = allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const qtyToAllocate = targetQuantity - totalAllocated;

  const derivedDefaultQty = Math.max(0, qtyToAllocate);
  const currentInputQty =
    newRowInput.quantity === ""
      ? derivedDefaultQty
      : parseFloat(newRowInput.quantity) || 0;

  useEffect(() => {
    if (!warehouseId) return;

    const loadLocations = async () => {
      try {
        const res = await fetch(
          `/api/lookups/locations?warehouse_id=${warehouseId}`,
        );

        if (!res.ok) return;

        const payload = await res.json();

        const data = payload.data ?? [];

        setLocations(data);

        setNewRowInput((prev) => ({
          ...prev,
          location_id: data[0]?.id ?? "",
          location_name: data[0]?.title ?? "",
        }));
      } catch (err) {
        console.error(err);
      }
    };

    loadLocations();
  }, [warehouseId]);

  const handleAddRow = () => {
    // if (currentInputQty <= 0 || qtyToAllocate <= 0) return;

    if (!newRowInput.location_id || currentInputQty <= 0 || qtyToAllocate <= 0)
      return;

    const allowedQty = Math.min(currentInputQty, qtyToAllocate);

    const rowToAdd: PO_StockAllocationRecord = {
      ...newRowInput,
      quantity: allowedQty,
    };

    const updatedAllocations = [...allocations, rowToAdd];
    setAllocations(updatedAllocations);

    const nextTotalAllocated = updatedAllocations.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const nextRemaining = Math.max(0, targetQuantity - nextTotalAllocated);

    setNewRowInput({
      location_id: newRowInput.location_id,
      location_name: newRowInput.location_name,

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

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
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
          {/* <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Location
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {locationName || "-"}
            </div>
          </div> */}
          <div className="grid grid-cols-3 col-span-3 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
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
              <div className="text-xs text-red-500 dark:text-red-400 capitalize font-medium">
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
              <div className="text-xs text-green-600 dark:text-green-400 capitalize font-medium">
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
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>
                <th className="p-3 w-52">Storage Location</th>
                <th className="p-3">Batch / Lot No.</th>
                <th className="p-3">Serial No.</th>
                <th className="p-3 w-28 text-right">Qty. ({uomName})</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{item.date_received}</td>
                  <td className="p-3">{item.prod_date || "-"}</td>
                  <td className="p-3">{item.expiry_date || "-"}</td>
                  <td className="p-3">{item.location_name}</td>
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

              <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.date_received
                        ? new Date(newRowInput.date_received)
                        : undefined
                    }
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      setNewRowInput({
                        ...newRowInput,
                        date_received: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                  />
                  {/* <input
                    type="date"
                    value={newRowInput.date_received}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        date_received: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  /> */}
                </td>
                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    maxDate={
                      newRowInput.date_received
                        ? new Date(newRowInput.date_received)
                        : undefined
                    }
                    onChange={(date) =>
                      setNewRowInput({
                        ...newRowInput,
                        prod_date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                  />
                  {/* <input
                    type="date"
                    value={newRowInput.prod_date}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        prod_date: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  /> */}
                </td>
                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.expiry_date
                        ? new Date(newRowInput.expiry_date)
                        : undefined
                    }
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      setNewRowInput({
                        ...newRowInput,
                        expiry_date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                  />
                  {/* <input
                    type="date"
                    value={newRowInput.expiry_date}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        expiry_date: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 scheme-light dark:scheme-dark focus:outline-hidden focus:ring-1 focus:ring-green-600"
                  /> */}
                </td>
                <td className="p-2">
                  <select
                    value={newRowInput.location_id}
                    onChange={(e) => {
                      const selected = locations.find(
                        (x) => x.id === e.target.value,
                      );

                      setNewRowInput({
                        ...newRowInput,
                        location_id: selected?.id || "",
                        location_name: selected?.title || "",
                      });
                    }}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900"
                  >
                    <option value="">Select Location</option>

                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code ? `${loc.code} - ${loc.title}` : loc.title}
                      </option>
                    ))}
                  </select>
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
                  {/* <input
                    type="number"
                    step="any"
                    min="0"
                    disabled={qtyToAllocate <= 0}
                    placeholder={
                      derivedDefaultQty > 0 ? derivedDefaultQty.toString() : "0"
                    }
                    value={qtyToAllocate <= 0 ? "0" : newRowInput.quantity}
                    onChange={(e) =>
                      setNewRowInput({
                        ...newRowInput,
                        quantity: e.target.value,
                      })
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                  /> */}

                  <NumericTextInput
                    value={
                      qtyToAllocate <= 0 ? 0 : Number(newRowInput.quantity)
                    }
                    allowDecimals={false}
                    min="0"
                    disabled={qtyToAllocate <= 0}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                    onChange={(val) =>
                      setNewRowInput({
                        ...newRowInput,
                        quantity: String(val),
                      })
                    }
                    placeholder={
                      derivedDefaultQty > 0 ? derivedDefaultQty.toString() : "0"
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={
                      !newRowInput.location_id ||
                      currentInputQty <= 0 ||
                      qtyToAllocate <= 0
                    }
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-xs font-bold text-lg disabled:opacity-30 transition-opacity"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={qtyToAllocate !== 0}
            variant="save"
            // className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white px-5 py-2 rounded text-xs disabled:opacity-40 font-medium transition-opacity"
          >
            Save Allocation
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

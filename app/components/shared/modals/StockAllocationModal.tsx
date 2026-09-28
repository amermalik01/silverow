// app/components/shared/modals/StockAllocationModal.tsx

"use client";

import { useMemo, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

export type StockAllocationRecord = {
  location_id: string;
  location_name: string;
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
  isReadonly?: boolean;
};

const today = () => {
  return new Date().toISOString().split("T")[0];
};

const normalizeAllocation = (
  allocation: Partial<StockAllocationRecord>,
): StockAllocationRecord => ({
  location_id: allocation.location_id || "",
  location_name: allocation.location_name || "",
  date_received: allocation.date_received || "",
  prod_date: allocation.prod_date || "",
  expiry_date: allocation.expiry_date || "",
  batch_no: allocation.batch_no || "",
  serial_no: allocation.serial_no || "",
  quantity: Number(allocation.quantity || 0),
});

const getTotalAllocated = (allocations: StockAllocationRecord[]) => {
  return allocations.reduce(
    (sum, allocation) => sum + Number(allocation.quantity || 0),
    0,
  );
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

  isReadonly = false,
}: Props) {
  const [allocations, setAllocations] = useState<StockAllocationRecord[]>(() =>
    initialAllocations.map(normalizeAllocation),
  );

  const [newRowInput, setNewRowInput] = useState({
    date_received: today(),
    prod_date: "",
    expiry_date: "",
    batch_no: "",
    serial_no: "",
    quantity: "",
  });

  const totalAllocated = useMemo(
    () => getTotalAllocated(allocations),
    [allocations],
  );

  const safeTargetQuantity = Math.max(0, Number(targetQuantity || 0));

  const qtyToAllocate = Math.max(0, safeTargetQuantity - totalAllocated);

  const currentInputQty =
    newRowInput.quantity === ""
      ? qtyToAllocate
      : Number(newRowInput.quantity || 0);

  const canSave = Math.abs(totalAllocated - safeTargetQuantity) < 0.000001;

  const updateNewRowInput = (
    field: keyof typeof newRowInput,
    value: string,
  ) => {
    if (isReadonly) return;

    setNewRowInput((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateNewAllocation = () => {
    if (currentInputQty <= 0) {
      return "Quantity must be greater than zero.";
    }

    if (currentInputQty > qtyToAllocate) {
      return `Quantity cannot exceed the remaining allocation of ${qtyToAllocate}.`;
    }

    if (
      newRowInput.prod_date &&
      newRowInput.date_received &&
      newRowInput.prod_date > newRowInput.date_received
    ) {
      return "Production date cannot be after the date received.";
    }

    if (
      newRowInput.expiry_date &&
      newRowInput.prod_date &&
      newRowInput.expiry_date < newRowInput.prod_date
    ) {
      return "Expiry date cannot be before the production date.";
    }

    return null;
  };

  const handleAddRow = () => {
    if (isReadonly) return;

    const validationError = validateNewAllocation();

    if (validationError) {
      return;
    }

    const allowedQty = Math.min(currentInputQty, qtyToAllocate);

    const rowToAdd: StockAllocationRecord = {
      location_id: locationId || "",
      location_name: locationName || "",
      date_received: newRowInput.date_received,
      prod_date: newRowInput.prod_date,
      expiry_date: newRowInput.expiry_date,
      batch_no: newRowInput.batch_no.trim(),
      serial_no: newRowInput.serial_no.trim(),
      quantity: Number(allowedQty),
    };

    setAllocations((previous) => [...previous, rowToAdd]);

    const nextRemaining = Math.max(0, qtyToAllocate - allowedQty);

    setNewRowInput({
      date_received: today(),
      prod_date: "",
      expiry_date: "",
      batch_no: "",
      serial_no: "",
      quantity: nextRemaining > 0 ? String(nextRemaining) : "",
    });
  };

  const handleRemoveRow = (index: number) => {
    if (isReadonly) return;

    setAllocations((previous) =>
      previous.filter((_, allocationIndex) => allocationIndex !== index),
    );
  };

  const handleCommitSave = () => {
    if (isReadonly) return;

    if (!canSave) {
      return;
    }

    onSave(allocations.map(normalizeAllocation));
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-warehouse" className="text-xl" />

            <h2 className="text-lg font-semibold tracking-wide text-white">
              Stock Allocation
              {" - "}
              {itemCode}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Item
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {itemCode || "-"}
              {itemName ? ` - ${itemName}` : ""}
            </div>
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Warehouse
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {warehouseName || "-"}
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

          <div className="grid grid-cols-2 lg:grid-cols-3 col-span-2 gap-2 text-center">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target Qty.
              </div>

              <div className="text-lg font-bold">
                {safeTargetQuantity}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>

            <div
              className={`border rounded p-2 bg-white dark:bg-slate-900 ${
                qtyToAllocate > 0
                  ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                  : "border-green-300 dark:border-green-900"
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  qtyToAllocate > 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                Qty. To Allocate
              </div>

              <div
                className={`text-lg font-bold ${
                  qtyToAllocate > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {qtyToAllocate}

                <span className="text-xs font-normal ml-1">{uomName}</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-2">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Allocated Total
              </div>

              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {totalAllocated}

                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                  {uomName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 w-40">Date Received</th>
                <th className="p-3 w-40">Prod. Date</th>
                <th className="p-3 w-40">Use By Date</th>

                <th className="p-3">Batch No.</th>

                <th className="p-3">Serial No.</th>

                <th className="p-3 w-28 text-right">
                  Qty.
                  {uomName ? ` (${uomName})` : ""}
                </th>

                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allocations.map((allocation, index) => (
                <tr
                  key={`allocation-${index}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">{allocation.date_received || "-"}</td>

                  <td className="p-3">{allocation.prod_date || "-"}</td>

                  <td className="p-3">{allocation.expiry_date || "-"}</td>

                  <td className="p-3 font-mono">
                    {allocation.batch_no || "-"}
                  </td>

                  <td className="p-3 font-mono">
                    {allocation.serial_no || "-"}
                  </td>

                  <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {allocation.quantity}
                  </td>

                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove allocation"
                    >
                      {/* <Icon icon="tabler:trash" className="w-4 h-4 mx-auto" /> */}
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
                    disabled={isReadonly}
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "date_received",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    disabled={isReadonly}
                    maxDate={
                      newRowInput.date_received
                        ? new Date(newRowInput.date_received)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "prod_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <DatePicker
                    value={
                      newRowInput.expiry_date
                        ? new Date(newRowInput.expiry_date)
                        : undefined
                    }
                    disabled={isReadonly}
                    minDate={
                      newRowInput.prod_date
                        ? new Date(newRowInput.prod_date)
                        : undefined
                    }
                    onChange={(date) =>
                      updateNewRowInput(
                        "expiry_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                  />
                </td>

                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Batch No."
                    value={newRowInput.batch_no}
                    disabled={isReadonly}
                    onChange={(event) =>
                      updateNewRowInput("batch_no", event.target.value)
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </td>

                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Serial No."
                    value={newRowInput.serial_no}
                    disabled={isReadonly}
                    onChange={(event) =>
                      updateNewRowInput("serial_no", event.target.value)
                    }
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </td>

                <td className="p-2">
                  <NumericTextInput
                    value={qtyToAllocate <= 0 ? 0 : currentInputQty}
                    allowDecimals={false}
                    min="0"
                    disabled={qtyToAllocate <= 0 || isReadonly}
                    className="border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full text-right bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                    onChange={(value) =>
                      updateNewRowInput("quantity", String(value))
                    }
                    placeholder={
                      qtyToAllocate > 0 ? String(qtyToAllocate) : "0"
                    }
                  />
                </td>

                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={
                      currentInputQty <= 0 || qtyToAllocate <= 0 || isReadonly
                    }
                    className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full w-7 h-7 inline-flex items-center justify-center shadow-sm font-bold text-lg disabled:opacity-30 transition-opacity"
                    title="Add allocation"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!canSave && !isReadonly && (
          <div className="px-5 pb-3">
            <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              Allocate the remaining <strong>{qtyToAllocate}</strong>{" "}
              {uomName || "units"} before saving the allocation.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleCommitSave}
            disabled={!canSave || isReadonly}
            variant="save"
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

// app/components/purchases/purchase-orders/ShipmentPickingPanel.tsx

"use client";

import { useState } from "react";

import { ShipmentLine } from "@/types/shipment";

type AllocationLine = {
  inbound_entry_id: string;
  quantity: number;
  unit_cost: number;
  batch_no?: string | null;
  bin_code?: string | null;
  expiry_date?: string | null;
};

type Props = {
  shipmentId: string;
  companyId: string;
  lines: ShipmentLine[];
  setLines: (lines: ShipmentLine[]) => void;
};

export default function ShipmentPickingPanel({
  shipmentId,
  companyId,
  lines,
  setLines,
}: Props) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const [allocations, setAllocations] = useState<
    Record<number, AllocationLine[]>
  >({});

  const allocate = async (index: number, method: "FIFO" | "FEFO") => {
    const line = lines[index];

    try {
      setLoadingIndex(index);

      const res = await fetch("/api/shipment/picking/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          itemId: line.item_id,
          warehouseId: line.warehouse_id,
          quantity: line.quantity,
          method,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAllocations({
        ...allocations,
        [index]: data.allocations,
      });

      const updated = [...lines];

      updated[index] = {
        ...updated[index],
        picked_quantity: line.quantity,
        is_picked: true,
      };

      setLines(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setLoadingIndex(null);
    }
  };

  const confirmPick = async (index: number) => {
    const line = lines[index];

    const res = await fetch("/api/shipment/picking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipmentId,
        lineId: line.id,
        allocations: allocations[index] || [],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    const updated = [...lines];

    updated[index].is_picked = true;

    setLines(updated);
  };

  /* const allocateStock = async (index: number) => {
    const line = lines[index];

    try {
      setLoadingIndex(index);

      const res = await fetch("/api/shipment/picking/allocate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          itemId: line.item_id,
          warehouseId: line.warehouse_id,
          quantity: line.quantity,
          method: "FEFO", // or FIFO
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAllocations({
        ...allocations,
        [index]: data.allocations,
      });

      const updated = [...lines];

      updated[index].allocated = true;

      updated[index].picked_quantity = line.quantity;

      onUpdateLines(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setLoadingIndex(null);
    }
  }; */

  return (
    <div className="border rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">
        Shipment Picking (FIFO / FEFO Engine)
      </h2>

      <table className="w-full border text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Item</th>
            <th className="p-2">Warehouse</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Status</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id || index} className="border-t">
              <td className="p-2">
                {line.item_code} - {line.item_name}
              </td>

              <td className="p-2">{line.warehouse_id}</td>

              <td className="p-2 text-right">{line.quantity}</td>

              <td className="p-2">
                {line.is_picked ? (
                  <span className="text-green-600 text-xs">Picked</span>
                ) : (
                  <span className="text-yellow-600 text-xs">Pending</span>
                )}

                {line.picked_quantity &&
                  line.picked_quantity < line.quantity && (
                    <div className="text-red-500 text-xs">Partial Picked</div>
                  )}
              </td>

              <td className="p-2 space-x-2">
                <button
                  disabled={loadingIndex === index}
                  onClick={() => allocate(index, "FEFO")}
                  className="bg-blue-600 text-white px-2 py-1 rounded"
                >
                  FEFO Pick
                </button>

                <button
                  disabled={loadingIndex === index}
                  onClick={() => allocate(index, "FIFO")}
                  className="bg-gray-600 text-white px-2 py-1 rounded"
                >
                  FIFO Pick
                </button>

                <button
                  disabled={!line.is_picked}
                  onClick={() => confirmPick(index)}
                  className="bg-green-600 text-white px-2 py-1 rounded"
                >
                  Confirm
                </button>
              </td>

              {/* <td className="p-2">
                {line.allocated ? (
                  <span className="text-green-600 text-xs">Allocated</span>
                ) : (
                  <span className="text-yellow-600 text-xs">Pending</span>
                )}

                {line.quantity > (line.picked_quantity || 0) && (
                  <div className="text-red-600 text-xs">Not fully picked</div>
                )}
              </td>
              <td className="p-2">
                <button
                  disabled={loadingIndex === index}
                  onClick={() => allocateStock(index)}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  {loadingIndex === index
                    ? "Allocating..."
                    : "Auto Pick (FEFO)"}
                </button>
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ALLOCATION DETAILS */}
      <div className="mt-4 space-y-2">
        {Object.entries(allocations).map(([index, allocs]) => (
          <div key={index} className="border p-3 rounded">
            <h4 className="font-semibold">Line #{index} Allocation</h4>

            <table className="w-full text-xs mt-2">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Bin</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                </tr>
              </thead>

              <tbody>
                {allocs.map((a, i) => (
                  <tr key={i}>
                    <td>{a.batch_no || "-"}</td>
                    <td>{a.bin_code || "-"}</td>
                    <td>{a.quantity}</td>
                    <td>
                      {a.expiry_date
                        ? new Date(a.expiry_date).toDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
/* <div className="space-y-3">
        {Object.entries(allocations).map(([index, allocs]) => (
          <div key={index} className="border p-3 rounded">
            <h4 className="font-semibold">
              Line #{index} Allocation Breakdown
            </h4>

            <table className="w-full text-xs mt-2">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Bin</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                </tr>
              </thead>

              <tbody>
                {allocs.map((a, i) => (
                  <tr key={i}>
                    <td>{a.batch_no || "-"}</td>
                    <td>{a.bin_code || "-"}</td>
                    <td>{a.quantity}</td>
                    <td>
                      {a.expiry_date
                        ? new Date(a.expiry_date).toDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
} */

// type Props = {
//   shipmentId: string;
//   companyId: string;
//   lines: ShipmentLine[];
//   onUpdateLines: (lines: ShipmentLine[]) => void;
// };

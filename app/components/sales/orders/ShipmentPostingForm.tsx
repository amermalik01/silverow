// /app/components/sales/orders/ShipmentPostingForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  orderId: string;
};

interface ApiSalesOrderLine {
  id: string;
  item_id: string | null;
  item_name: string | null;
  warehouse_id: string | null;
  quantity: string | number;
  quantity_shipped: string | number;
}

interface ShipmentLine {
  id: string;
  item_id: string;
  item_name: string;
  warehouse_id: string | null; // Editable via UI dropdown if null
  quantity: number;
  shipped_quantity: number;
  quantity_to_ship: number;
}

interface WarehouseLookup {
  id: string;
  code: string;
  name: string;
}

export default function ShipmentPostingForm({ slug, orderId }: Props) {
  const router = useRouter();
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState<ShipmentLine[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLookup[]>([]);

  useEffect(() => {
    // Fetch both active order configurations and available warehouses simultaneously
    Promise.all([
      fetch(`/api/sales/sales-orders/${orderId}`).then((r) => r.json()),
      fetch(`/api/inventory/warehouses`)
        .then((r) => r.json())
        .catch(() => ({ warehouses: [] })),
    ])
      .then(([orderData, whData]) => {
        setWarehouses(whData.warehouses || whData || []);

        const mappedLines: ShipmentLine[] = (orderData.lines || [])
          .filter((line: ApiSalesOrderLine) => line.item_id !== null)
          .map((line: ApiSalesOrderLine) => {
            const ordered = Number(line.quantity || 0);
            const shipped = Number(line.quantity_shipped || 0);
            const maxCalculatedShip = Math.max(0, ordered - shipped);

            return {
              id: line.id,
              item_id: line.item_id as string,
              item_name: line.item_name || "Unnamed Stock Item",
              warehouse_id: line.warehouse_id, // Could be null initially from payload
              quantity: ordered,
              shipped_quantity: shipped,
              quantity_to_ship: maxCalculatedShip,
            };
          });

        setLines(mappedLines);
      })
      .catch((err) => console.error("Initialization error:", err))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleWarehouseChange = (index: number, warehouseId: string) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      warehouse_id: warehouseId || null,
    };
    setLines(updated);
  };

  const postShipment = async () => {
    try {
      setPosting(true);

      const linesToShip = lines.filter((l) => l.quantity_to_ship > 0);
      if (linesToShip.length === 0) {
        throw new Error("No quantities specified to ship.");
      }

      // Validation Step: Block transaction if an item lacks a selected warehouse destination
      const missingWarehouse = linesToShip.some((l) => !l.warehouse_id);
      if (missingWarehouse) {
        throw new Error(
          "Please select a valid fulfillment warehouse for all active line allocations.",
        );
      }

      const res = await fetch(`/api/sales/sales-orders/${orderId}/shipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines: linesToShip.map((l) => ({
            salesOrderLineId: l.id,
            itemId: l.item_id,
            warehouseId: l.warehouse_id, // Guaranteed non-null now
            quantity: l.quantity_to_ship,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Shipment failed");
      }

      alert("Shipment posted successfully!");
      router.push(`/${slug}/sales/orders`);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Shipment posting routine failed",
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs font-medium text-gray-500 animate-pulse">
        Loading order parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
            <tr>
              <th className="p-3 text-left">Item Name</th>
              <th className="p-3 text-left w-[250px]">Fulfillment Warehouse</th>
              <th className="p-3 text-right">Ordered</th>
              <th className="p-3 text-right">Shipped</th>
              <th className="p-3 text-right">Ship Now Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No stock-trackable lines found for dispatch processing.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => {
                const maxAvailable = line.quantity - line.shipped_quantity;
                return (
                  <tr key={line.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-700">
                      {line.item_name}
                    </td>

                    {/* Warehouse Input Cell Selection Row */}
                    <td className="p-3">
                      <select
                        value={line.warehouse_id || ""}
                        onChange={(e) =>
                          handleWarehouseChange(index, e.target.value)
                        }
                        className={`border rounded p-1.5 w-full text-xs bg-white ${
                          !line.warehouse_id
                            ? "border-amber-500 text-amber-700 font-medium"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">-- Choose Warehouse --</option>
                        {warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name} ({wh.code})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3 text-right text-gray-600">
                      {line.quantity}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {line.shipped_quantity}
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={maxAvailable}
                        disabled={!line.warehouse_id} // Lock quantity entry until a warehouse target is set
                        value={line.quantity_to_ship}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[index] = {
                            ...updated[index],
                            quantity_to_ship: Number(e.target.value),
                          };
                          setLines(updated);
                        }}
                        className="border rounded p-2 w-[120px] text-right disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={posting || lines.length === 0}
          onClick={postShipment}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded shadow transition-colors disabled:opacity-50"
        >
          {posting ? "Posting Shipment..." : "Post Shipment"}
        </button>
      </div>
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  orderId: string;
};

interface ApiSalesOrderLine {
  id: string;
  item_id: string | null;
  item_name: string | null;
  warehouse_id: string | null;
  quantity: string | number;
  quantity_shipped: string | number; // Matches your API payload key precisely
}

interface ShipmentLine {
  id: string;
  item_id: string;
  item_name: string;
  warehouse_id: string | null; // Allow null here so the UI doesn't crash if unassigned
  quantity: number;
  shipped_quantity: number;
  quantity_to_ship: number;
}

export default function ShipmentPostingForm({ slug, orderId }: Props) {
  const router = useRouter();
  const [posting, setPosting] = useState(false);
  const [lines, setLines] = useState<ShipmentLine[]>([]);

  useEffect(() => {
    fetch(`/api/sales/sales-orders/${orderId}`)
      .then((r) => r.json())
      .then((data: { lines?: ApiSalesOrderLine[] }) => {
        const mappedLines: ShipmentLine[] = (data.lines || [])
          // 1. FILTER: Real physical stock items MUST have an item_id.
          // This safely excludes your pseudo-GL/Goodwill row.
          .filter((line: ApiSalesOrderLine) => line.item_id !== null)

          // 2. MAP: Align database properties cleanly with UI state
          .map((line: ApiSalesOrderLine) => {
            const ordered = Number(line.quantity || 0);
            const shipped = Number(line.quantity_shipped || 0); // Corrected property key mapping
            const maxCalculatedShip = Math.max(0, ordered - shipped);

            return {
              id: line.id,
              item_id: line.item_id as string,
              item_name: line.item_name || "Unnamed Stock Item",
              warehouse_id: line.warehouse_id, // Keeps the null intact without dropping the row
              quantity: ordered,
              shipped_quantity: shipped,
              quantity_to_ship: maxCalculatedShip,
            };
          });

        setLines(mappedLines);
      });
  }, [orderId]);

  const postShipment = async () => {
    try {
      setPosting(true);

      // Filter out items where nothing is being shipped in this pass
      const linesToShip = lines.filter((l) => l.quantity_to_ship > 0);
      if (linesToShip.length === 0) {
        throw new Error("No quantities specified to ship.");
      }

      const res = await fetch(`/api/sales/sales-orders/${orderId}/shipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines: linesToShip.map((l) => ({
            salesOrderLineId: l.id,
            itemId: l.item_id,
            warehouseId: l.warehouse_id,
            quantity: l.quantity_to_ship,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Shipment failed");
      }

      alert("Shipment posted successfully!");
      router.push(`/${slug}/sales/orders`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Shipment failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b text-black dark:text-white">
            <tr>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">Ordered</th>
              <th className="p-3 text-right">Already Shipped</th>
              <th className="p-3 text-right">Ship Now Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No order lines available.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => {
                const maxAvailable = line.quantity - line.shipped_quantity;
                return (
                  <tr key={line.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-700">
                        {line.item_name}
                      </div>
                      {!line.warehouse_id && (
                        <span className="text-xs text-red-500 font-semibold block">
                          ⚠️ No warehouse assigned to this line
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {line.quantity}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {line.shipped_quantity}
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={maxAvailable}
                        disabled={!line.warehouse_id} // Disable input if warehouse is missing
                        value={line.quantity_to_ship}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[index] = {
                            ...updated[index],
                            quantity_to_ship: Number(e.target.value),
                          };
                          setLines(updated);
                        }}
                        className="border rounded p-2 w-[120px] text-right disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={posting || lines.length === 0}
          onClick={postShipment}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded shadow transition-colors disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post Shipment"}
        </button>
      </div>
    </div>
  );
} */

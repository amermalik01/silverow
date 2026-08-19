// app/components/purchases/receipts/PurchaseReceiptForm.tsx

"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { PurchaseReceipt, PurchaseReceiptLine } from "@/types/purchase-receipt";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  purchaseOrderId?: string;
};

type POLoadLine = {
  id: string;

  item_id: string;

  item_code?: string;

  item_name?: string;

  warehouse_id?: string;

  warehouse_name?: string;

  remaining_quantity: number;

  reserved_quantity?: number;

  available_stock?: number;

  unit_cost: number;
};

export default function PurchaseReceiptForm({ slug, purchaseOrderId }: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState<PurchaseReceipt>({
    vendor_id: "",
    receipt_date: new Date().toISOString().split("T")[0],
    posting_date: new Date().toISOString().split("T")[0],
  });

  const [lines, setLines] = useState<PurchaseReceiptLine[]>([]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        item_id: "",
        warehouse_id: "",
        quantity: 1,
        unit_cost: 0,
      },
    ]);
  };

  const updateLine = (
    index: number,
    field: keyof PurchaseReceiptLine,
    value: PurchaseReceiptLine[keyof PurchaseReceiptLine],
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    updated[index].total_cost =
      Number(updated[index].quantity || 0) *
      Number(updated[index].unit_cost || 0);

    setLines(updated);
  };

  useEffect(() => {
    if (!purchaseOrderId) {
      return;
    }

    fetch(`/api/purchase-orders/${purchaseOrderId}`)
      .then((r) => r.json())
      .then((data) => {
        const order = data.order;

        const poLines = data.lines || [];

        setHeader((prev) => ({
          ...prev,

          vendor_id: order.supplier_id,

          purchase_order_id: order.id,

          warehouse_id: order.warehouse_id,
        }));

        const mappedLines = poLines
          .filter((x: POLoadLine) => Number(x.remaining_quantity || 0) > 0)
          .map((line: POLoadLine, index: number) => ({
            line_no: index + 1,

            purchase_order_line_id: line.id,

            item_id: line.item_id,

            item_code: line.item_code,

            item_name: line.item_name,

            warehouse_id: line.warehouse_id || order.warehouse_id,

            warehouse_name: line.warehouse_name,

            quantity: Number(line.remaining_quantity || 0),

            unit_cost: Number(line.unit_cost || 0),

            total_cost:
              Number(line.remaining_quantity || 0) *
              Number(line.unit_cost || 0),
          }));

        setLines(mappedLines);
      });
  }, [purchaseOrderId]);

  const save = async () => {
    try {
      for (const line of lines) {
        if (!line.item_id) {
          throw new Error("Item missing");
        }

        if (!line.warehouse_id) {
          throw new Error(`Warehouse missing for ${line.item_name}`);
        }

        if (!line.location_id) {
          throw new Error(`Location missing for ${line.item_name}`);
        }

        if (Number(line.quantity) <= 0) {
          throw new Error(`Invalid quantity for ${line.item_name}`);
        }
      }

      setSaving(true);

      const res = await fetch("/api/purchase-receipts", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          receipt: header,
          lines,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error);
      }

      router.push(`/${slug}/purchases/receipts`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded p-4 grid grid-cols-2 gap-4">
        <div>
          <label>Receipt Date</label>

          <input
            type="date"
            value={header.receipt_date}
            onChange={(e) =>
              setHeader({
                ...header,
                receipt_date: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />
        </div>

        <div>
          <label>Posting Date</label>

          <input
            type="date"
            value={header.posting_date}
            onChange={(e) =>
              setHeader({
                ...header,
                posting_date: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Location</th>
              <th className="p-2">Batch</th>
              <th className="p-2">Bin</th>
              <th className="p-2">Expiry</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Reserved</th>
              <th className="p-2">Serial</th>
              <th className="p-2">Consignment</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">
                  <input
                    value={line.item_name || ""}
                    className="border rounded p-2 w-full"
                  />
                </td>

                <td className="p-2">
                  <input
                    value={line.location_code || ""}
                    onChange={(e) =>
                      updateLine(index, "location_code", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">
                  <input
                    value={line.batch_no || ""}
                    onChange={(e) =>
                      updateLine(index, "batch_no", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">
                  <input
                    value={line.bin_code || ""}
                    onChange={(e) =>
                      updateLine(index, "bin_code", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">
                  <input
                    type="date"
                    value={line.expiry_date || ""}
                    onChange={(e) =>
                      updateLine(index, "expiry_date", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border rounded p-2"
                  />
                  {line.available_stock !== undefined &&
                    line.quantity > line.available_stock && (
                      <div className="text-red-500 text-xs mt-1">
                        Exceeds available stock
                      </div>
                    )}
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    value={line.unit_cost}
                    onChange={(e) =>
                      updateLine(index, "unit_cost", Number(e.target.value))
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">{line.reserved_quantity || 0}</td>

                <td className="p-2">
                  <input
                    value={line.serial_no || ""}
                    onChange={(e) =>
                      updateLine(index, "serial_no", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="p-2">
                  <input
                    value={line.consignment_no || ""}
                    onChange={(e) =>
                      updateLine(index, "consignment_no", e.target.value)
                    }
                    className="border rounded p-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4">
        {/* <button
          type="button"
          onClick={addLine}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Add Line
        </button> */}
        <Button
          type="button"
          onClick={addLine}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Add Line
        </Button>

        <Button
          type="button"
          disabled={saving}
          onClick={save}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Save Receipt
        </Button>
      </div>
    </div>
  );
}

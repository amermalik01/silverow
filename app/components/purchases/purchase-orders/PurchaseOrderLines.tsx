// app/components/purchases/purchase-orders/PurchaseOrderLines.tsx

"use client";

import { PurchaseOrderLine } from "@/types/purchase-order";

type Props = {
  lines: PurchaseOrderLine[];

  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLine[]>>;

  isReadonly?: boolean;
};

export default function PurchaseOrderLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  const addLine = () => {
    setLines([
      ...lines,
      {
        item_id: "",
        quantity: 1,
        unit_cost: 0,
      },
    ]);
  };

  const updateLine = (
    index: number,
    field: keyof PurchaseOrderLine,
    value: string | number,
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    updated[index].line_total =
      Number(updated[index].quantity || 0) *
      Number(updated[index].unit_cost || 0);

    setLines(updated);
  };

  return (
    <div className="space-y-4">
      {!isReadonly && (
        <button
          type="button"
          onClick={addLine}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Line
        </button>
      )}

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2">Item</th>

            <th className="p-2">Qty</th>

            <th className="p-2">Cost</th>

            <th className="p-2">Total</th>
          </tr>
        </thead>

        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className="p-2">
                <input
                  value={line.description || ""}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />
              </td>

              <td className="p-2">
                <input
                  type="number"
                  value={line.quantity}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateLine(index, "quantity", Number(e.target.value))
                  }
                  className="border p-2 rounded w-full"
                />
              </td>

              <td className="p-2">
                <input
                  type="number"
                  value={line.unit_cost}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateLine(index, "unit_cost", Number(e.target.value))
                  }
                  className="border p-2 rounded w-full"
                />
              </td>

              <td className="p-2 text-right">
                {Number(line.line_total || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

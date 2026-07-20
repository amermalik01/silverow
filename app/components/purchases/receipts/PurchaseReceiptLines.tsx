// app/components/purchases/receipts/PurchaseReceiptLines.tsx

/* "use client";

import { PurchaseReceiptLine } from "@/types/purchase-receipt";

type Props = {
  lines: PurchaseReceiptLine[];

  setLines: React.Dispatch<React.SetStateAction<PurchaseReceiptLine[]>>;

  isReadonly?: boolean;
};

export default function PurchaseReceiptLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  const updateLine = <K extends keyof PurchaseReceiptLine>(
    index: number,
    field: K,
    value: PurchaseReceiptLine[K],
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setLines(updated);
  };

  return (
    <div className="border rounded-xl overflow-auto">
      <table className="w-full text-xs min-w-[1800px]">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Item</th>

            <th className="p-2 text-right">Qty</th>

            <th className="p-2 text-right">Cost</th>

            <th className="p-2 text-left">Warehouse</th>

            <th className="p-2 text-left">Location</th>

            <th className="p-2 text-left">Batch</th>

            <th className="p-2 text-left">Bin</th>

            <th className="p-2 text-left">Serial</th>

            <th className="p-2 text-left">Consignment</th>

            <th className="p-2 text-left">MFG Date</th>

            <th className="p-2 text-left">Expiry</th>
          </tr>
        </thead>

        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="border-t">
              <td className="p-2">
                <div>
                  <div className="font-medium">{line.item_name}</div>

                  <div className="text-xs text-gray-500">{line.item_code}</div>
                </div>
              </td>

              <td className="p-2">
                <input
                  type="number"
                  value={line.quantity}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateLine(index, "quantity", Number(e.target.value))
                  }
                  className="border rounded p-2 w-[100px] text-right"
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
                  className="border rounded p-2 w-[120px] text-right"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.warehouse_name || ""}
                  readOnly
                  className="border rounded p-2 w-[180px] bg-gray-50"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.location_code || ""}
                  onChange={(e) =>
                    updateLine(index, "location_code", e.target.value)
                  }
                  className="border rounded p-2 w-[150px]"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.batch_no || ""}
                  onChange={(e) =>
                    updateLine(index, "batch_no", e.target.value)
                  }
                  className="border rounded p-2 w-[140px]"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.bin_code || ""}
                  onChange={(e) =>
                    updateLine(index, "bin_code", e.target.value)
                  }
                  className="border rounded p-2 w-[120px]"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.serial_no || ""}
                  onChange={(e) =>
                    updateLine(index, "serial_no", e.target.value)
                  }
                  className="border rounded p-2 w-[150px]"
                />
              </td>

              <td className="p-2">
                <input
                  value={line.consignment_no || ""}
                  onChange={(e) =>
                    updateLine(index, "consignment_no", e.target.value)
                  }
                  className="border rounded p-2 w-[150px]"
                />
              </td>

              <td className="p-2">
                <input
                  type="date"
                  value={line.manufacture_date || ""}
                  onChange={(e) =>
                    updateLine(index, "manufacture_date", e.target.value)
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 */
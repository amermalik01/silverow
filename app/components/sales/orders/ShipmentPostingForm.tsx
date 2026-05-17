// /app/components/sales/orders/ShipmentPostingForm.tsx
"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

type Props = {
  slug: string;

  orderId: string;
};

type ShipmentLine = {
  id: string;

  item_name?: string;

  quantity: number;

  shipped_quantity?: number;

  remaining_quantity?: number;
};

export default function ShipmentPostingForm({ slug, orderId }: Props) {
  const router = useRouter();

  const [posting, setPosting] = useState(false);

  const [lines, setLines] = useState<ShipmentLine[]>([]);

  useEffect(() => {
    fetch(`/api/sales/sales-orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        setLines(data.lines || []);
      });
  }, [orderId]);

  const postShipment = async () => {
    try {
      setPosting(true);

      const res = await fetch(`/api/sales/sales-orders/${orderId}/shipment`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          lines,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Shipment failed");
      }

      alert("Shipment posted");

      router.push(`/${slug}/sales/orders`);
    } catch (err) {
      console.error(err);

      alert(err instanceof Error ? err.message : "Shipment failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Item</th>

              <th className="p-3 text-right">Ordered</th>

              <th className="p-3 text-right">Ship Qty</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-t">
                <td className="p-3">{line.item_name}</td>

                <td className="p-3 text-right">{line.quantity}</td>

                <td className="p-3">
                  <input
                    type="number"
                    value={line.remaining_quantity || line.quantity}
                    onChange={(e) => {
                      const updated = [...lines];

                      updated[index] = {
                        ...updated[index],

                        remaining_quantity: Number(e.target.value),
                      };

                      setLines(updated);
                    }}
                    className="border rounded p-2 w-[120px]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={posting}
          onClick={postShipment}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          {posting ? "Posting..." : "Post Shipment"}
        </button>
      </div>
    </div>
  );
}

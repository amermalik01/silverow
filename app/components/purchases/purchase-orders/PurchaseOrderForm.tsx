// app/components/purchases/purchase-orders/PurchaseOrderForm.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLine,
} from "@/types/purchase-order";

import PurchaseOrderLines from "./PurchaseOrderLines";

import PurchaseOrderTotals from "./PurchaseOrderTotals";

type Props = {
  slug: string;

  id?: string;

  isReadonly?: boolean;
};

export default function PurchaseOrderForm({
  slug,
  id,
  isReadonly = false,
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [order, setOrder] = useState<PurchaseOrder>({
    supplier_id: "",
    order_date: new Date().toISOString().split("T")[0],
  });

  const [billingAddress, setBillingAddress] = useState<PurchaseOrderAddress>({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<PurchaseOrderAddress>({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data.order);

        setLines(data.lines || []);

        setBillingAddress(
          data.billing_address || {
            address_type: "billing",
          },
        );

        setShippingAddress(
          data.shipping_address || {
            address_type: "shipping",
          },
        );
      });
  }, [id]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.line_total || 0),
      0,
    );

    return {
      subtotal,
      tax: 0,
      total: subtotal,
    };
  }, [lines]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        order: {
          ...order,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          total_amount: totals.total,
        },

        billing_address: billingAddress,

        shipping_address: shippingAddress,

        lines,
      };

      const res = await fetch(
        id ? `/api/purchase-orders/${id}` : "/api/purchase-orders",
        {
          method: id ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const err = await res.json();

        throw new Error(err.error);
      }

      router.push(`/${slug}/purchases/purchase-orders`);
    } catch (err) {
      console.error(err);

      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 border rounded p-4">
        <div>
          <label className="text-sm">Order Date</label>

          <input
            type="date"
            value={order.order_date}
            disabled={isReadonly}
            onChange={(e) =>
              setOrder({
                ...order,
                order_date: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm">Reference</label>

          <input
            value={order.reference || ""}
            disabled={isReadonly}
            onChange={(e) =>
              setOrder({
                ...order,
                reference: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadonly}
      />

      <PurchaseOrderTotals
        subtotal={totals.subtotal}
        tax={totals.tax}
        total={totals.total}
      />

      {!isReadonly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      )}
    </div>
  );
}

// /app/components/sales/orders/SalesOrderForm.tsx
"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
} from "@/types/sales-order";
import SalesOrderLines from "./SalesOrderLines";

type Props = {
  slug: string;

  id?: string;
};

export default function SalesOrderForm({ slug, id }: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [order, setOrder] = useState<SalesOrder>({
    customer_id: "",

    order_date: new Date().toISOString().split("T")[0],
  });

  const [billingAddress, setBillingAddress] = useState<SalesOrderAddress>({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<SalesOrderAddress>({
    address_type: "shipping",
  });

  const [lines, setLines] = useState<SalesOrderLine[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    fetch(`/api/sales/sales-orders/${id}`)
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

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,

      customer_id: customer.id,

      customer_name: customer.name,
    }));

    if (customer.billing_address) {
      setBillingAddress({
        ...billingAddress,

        ...customer.billing_address,
      });
    }

    if (customer.shipping_address) {
      setShippingAddress({
        ...shippingAddress,

        ...customer.shipping_address,
      });
    }
  };

  const save = async () => {
    try {
      setSaving(true);

      const subtotal = lines.reduce(
        (sum, line) => sum + Number(line.line_total || 0),
        0,
      );

      const payload = {
        order: {
          ...order,

          subtotal,

          total_amount: subtotal,
        },

        billing_address: billingAddress,

        shipping_address: shippingAddress,

        lines,
      };

      const res = await fetch(
        id ? `/api/sales/sales-orders/${id}` : "/api/sales/sales-orders",
        {
          method: id ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      router.push(`/${slug}/sales/orders`);
    } catch (err) {
      console.error(err);

      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded p-4 grid grid-cols-3 gap-4">
        <div>
          <label>Order Date</label>

          <input
            type="date"
            value={order.order_date}
            onChange={(e) =>
              setOrder({
                ...order,

                order_date: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />
        </div>

        <div>
          <label>Reference</label>

          <input
            value={order.reference || ""}
            onChange={(e) =>
              setOrder({
                ...order,

                reference: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />
        </div>

        <div>
          <label>Customer</label>

          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="border rounded p-2 w-full text-left bg-white"
          >
            {order.customer_name || "Select Customer"}
          </button>
        </div>
      </div>

      <SalesOrderLines lines={lines} setLines={setLines} />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}

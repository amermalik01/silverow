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
import SupplierLookupModal, {
  SupplierLookupItem,
} from "../../shared/modals/SupplierLookupModal";

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

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

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
    // const subtotal = lines.reduce(
    //   (sum, line) => sum + Number(line.net_amount || 0),
    //   0,
    // );

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.original_amount || line.net_amount || 0),
      0,
    );

    const tax = lines.reduce(
      (sum, line) => sum + Number(line.vat_amount || 0),
      0,
    );

    return {
      subtotal,
      tax: tax,
      total: subtotal + tax,
    };
  }, [lines]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      supplier_id: supplier.id,
    }));

    /**
     * STAMP BILLING ADDRESS
     */

    // if (supplier.billing_address) {
    //   setBillingAddress({
    //     ...supplier.billing_address,
    //   });
    // }

    if (supplier.billing_address) {
      setBillingAddress({
        ...billingAddress,
        ...supplier.billing_address,
      });
    }

    /**
     * STAMP SHIPPING ADDRESS
     */

    if (supplier.shipping_address) {
      setShippingAddress({
        ...shippingAddress,
        ...supplier.shipping_address,
      });
    }

    // if (supplier.shipping_address) {
    //   setShippingAddress({
    //     ...supplier.shipping_address,
    //   });
    // }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      /**
       * =====================================================
       * 1. VALIDATE LINES (FRONTEND SAFETY LAYER)
       * =====================================================
       */

      if (lines.length === 0) {
        throw new Error("At least one line is required");
      }

      const cleanedLines = lines.map((line, index) => {
        /**
         * FORCE LINE NUMBERING
         */
        const baseLine = {
          ...line,
          line_no: (index + 1) * 10000,
        };

        /**
         * ITEM LINE VALIDATION
         */
        if (baseLine.line_type === "ITEM") {
          if (!baseLine.item_id) {
            throw new Error(`Line ${index + 1}: Item is required`);
          }

          if (!baseLine.warehouse_id) {
            throw new Error(`Line ${index + 1}: Warehouse is required`);
          }

          if (Number(baseLine.quantity || 0) <= 0) {
            throw new Error(
              `Line ${index + 1}: Quantity must be greater than 0`,
            );
          }

          if (Number(baseLine.unit_cost || 0) < 0) {
            throw new Error(`Line ${index + 1}: Unit cost cannot be negative`);
          }
        }

        /**
         * GL ACCOUNT LINE VALIDATION
         */
        if (baseLine.line_type === "GL_ACCOUNT") {
          if (!baseLine.gl_account_id) {
            throw new Error(`Line ${index + 1}: GL Account is required`);
          }

          /**
           * GL lines must NOT carry inventory data
           */
          baseLine.item_id = undefined;
          baseLine.item_code = undefined;
          baseLine.item_name = undefined;

          baseLine.warehouse_id = undefined;
          baseLine.warehouse_code = undefined;
          baseLine.warehouse_name = undefined;
        }

        /**
         * COMMENT LINE CLEANUP
         */
        if (baseLine.line_type === "COMMENT") {
          baseLine.item_id = undefined;
          baseLine.gl_account_id = undefined;
          baseLine.warehouse_id = undefined;
          baseLine.quantity = 0;
          baseLine.unit_cost = 0;
          baseLine.net_amount = 0;
          baseLine.gross_amount = 0;
        }

        return baseLine;
      });

      /**
       * =====================================================
       * 2. REVALIDATE TOTALS (SAFE GUARD)
       * =====================================================
       */

      const subtotal = cleanedLines.reduce(
        (sum, l) => sum + Number(l.net_amount || 0),
        0,
      );

      const tax = cleanedLines.reduce(
        (sum, l) => sum + Number(l.vat_amount || 0),
        0,
      );

      const total = subtotal + tax;

      /**
       * =====================================================
       * 3. BUILD PAYLOAD
       * =====================================================
       */

      const payload = {
        order: {
          ...order,
          subtotal,
          tax_amount: tax,
          total_amount: total,
        },

        billing_address: billingAddress,

        shipping_address: shippingAddress,

        lines: cleanedLines,
      };

      /**
       * =====================================================
       * 4. API CALL
       * =====================================================
       */

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

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Save failed");
      }

      /**
       * SUCCESS
       */
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
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Supplier</h3>

            <button
              type="button"
              onClick={() => setSupplierModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Select Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Supplier ID</label>

              <input
                value={order.supplier_id || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50  mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Billing City</label>

              <input
                value={billingAddress?.city || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50  mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Shipping City</label>

              <input
                value={shippingAddress?.city || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50  mt-2"
              />
            </div>
          </div>
        </div>

        <div>
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

          <div>
            <label className="text-sm">Currency ID</label>
            <input
              value={order.currency_id || ""}
              onChange={(e) =>
                setOrder({ ...order, currency_id: e.target.value })
              }
              className="border p-2 rounded w-full"
            />
          </div>
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

      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
}




  /* const handleSave = async () => {
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
  }; */
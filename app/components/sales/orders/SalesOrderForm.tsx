// /app/components/sales/orders/SalesOrderForm.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";

import {
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
  SalesOrderLineUI,
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Core Document Entities States
  const [order, setOrder] = useState<SalesOrder>({
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoiced_amount: 0,
  });

  const [billingAddress, setBillingAddress] = useState<SalesOrderAddress>({
    address_type: "billing",
  });
  const [shippingAddress, setShippingAddress] = useState<SalesOrderAddress>({
    address_type: "shipping",
  });
  const [lines, setLines] = useState<SalesOrderLineUI[]>([]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/sales/sales-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        if (data.lines) setLines(data.lines);
        if (data.billing_address) setBillingAddress(data.billing_address);
        if (data.shipping_address) setShippingAddress(data.shipping_address);
      })
      .catch((err) => console.error("Error fetching order details:", err));
  }, [id]);

  /* useEffect(() => {
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
  }, [id]); */

  const handleTotalsChange = useCallback(
    (computed: { subtotal: number; tax: number; total: number }) => {
      setOrder((prev) => ({
        ...prev,
        subtotal: computed.subtotal,
        tax_amount: computed.tax,
        total_amount: computed.total,
      }));
    },
    [],
  );

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setOrder((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
    }));

    if (customer.billing_address) {
      setBillingAddress((prev) => ({ ...prev, ...customer.billing_address }));
    }
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({ ...prev, ...customer.shipping_address }));
    }
    setCustomerModalOpen(false);
  };

  // UI Client-side Validation Engine
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!order.customer_id) {
      errors.push("You must select a valid Customer record.");
    }
    if (!order.order_date) {
      errors.push("Order Date field is mandatory.");
    }
    if (lines.length === 0) {
      errors.push("Sales Order must contain at least one line element.");
    }

    lines.forEach((line, index) => {
      const lineNo = index + 1;
      if (line.line_type === "ITEM" && !line.item_id) {
        errors.push(`Line #${lineNo}: Item specification is blank.`);
      }
      if (line.line_type === "GL_ACCOUNT" && !line.gl_account_id) {
        errors.push(
          `Line #${lineNo}: General Ledger validation source is blank.`,
        );
      }
      if (line.line_type !== "COMMENT" && Number(line.quantity || 0) <= 0) {
        errors.push(
          `Line #${lineNo}: Quantity value must be greater than zero.`,
        );
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const save = async () => {
    setValidationErrors([]);
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        order,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines,
      };

      const res = await fetch(
        id ? `/api/sales/sales-orders/${id}` : "/api/sales/sales-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save processing failed.");

      router.push(`/${slug}/sales/orders`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setValidationErrors([
        err instanceof Error
          ? err.message
          : "An unexpected server error occurred",
      ]);
    } finally {
      setSaving(false);
    }
  };

  /* const save = async () => {
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
  }; */

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
      {/* Error Banner Container */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-400 space-y-1">
          <p className="font-semibold text-red-800 dark:text-red-300">
            Please fix the following validation criteria:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Fields Master Frame */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Order Date
          </label>
          <input
            type="date"
            value={order.order_date}
            onChange={(e) => setOrder({ ...order, order_date: e.target.value })}
            className="border dark:border-slate-700 rounded p-2 w-full bg-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Reference / PO No
          </label>
          <input
            type="text"
            placeholder="e.g. PO-9876"
            value={order.reference || ""}
            onChange={(e) => setOrder({ ...order, reference: e.target.value })}
            className="border dark:border-slate-700 rounded p-2 w-full bg-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Customer Selection
          </label>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="border dark:border-slate-700 rounded p-2 w-full text-left bg-gray-50 dark:bg-slate-800 text-sm flex justify-between items-center"
          >
            <span
              className={
                order.customer_name
                  ? "text-black dark:text-white"
                  : "text-gray-400"
              }
            >
              {order.customer_name || "Select Customer metadata..."}
            </span>
            <span className="text-gray-400 text-xs">🔍</span>
          </button>
        </div>
      </div>

      {/* Order Line Matrix */}
      <SalesOrderLines
        lines={lines}
        setLines={setLines}
        onTotalsChange={handleTotalsChange}
      />

      {/* Global Financial Recap Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-start-3 space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (Net Amount)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(order.subtotal || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax Aggregations (VAT)</span>
            <span className="font-medium text-black dark:text-white">
              {Number(order.tax_amount || 0).toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
          <div className="flex justify-between font-semibold text-base">
            <span>Order Grand Total</span>
            <span className="text-blue-600 dark:text-blue-400">
              {Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
          {id && (
            <>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Invoiced Value Allocation</span>
                <span>{Number(order.invoiced_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-600 font-medium">
                <span>Uninvoiced Remaining balance</span>
                <span>
                  {(
                    Number(order.total_amount || 0) -
                    Number(order.invoiced_amount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Submissions/Actions Footer Matrix */}
      <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/orders`)}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel and Return
        </button>

        <div className="flex gap-3">
          {id &&
            order.invoice_status !== "INVOICED" &&
            order.status !== "CANCELLED" && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (
                    !confirm(
                      "Are you sure you want to finalize and convert this order into a formal Sales Invoice?",
                    )
                  )
                    return;
                  try {
                    setSaving(true);
                    const res = await fetch(
                      `/api/sales/sales-orders/${id}/convert-to-invoice`,
                      { method: "POST" },
                    );
                    const data = await res.json();
                    if (!res.ok)
                      throw new Error(data.error || "Conversion failure.");

                    alert("Sales Invoice generated successfully.");
                    router.push(`/${slug}/sales/invoices/${data.invoice_id}`);
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Conversion processing aborted.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                Convert To Invoice
              </button>
            )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save Order"}
          </button>
        </div>
      </div>

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}

// app/components/purchases/purchase-orders/PurchaseOrderForm.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

import {
  PurchaseOrderPayloadSchema,
  PurchaseOrderPayloadInput,
} from "@/lib/validations/purchase-order.schema";

interface Currency {
  id: string;
  code: string;
  name: string;
  exchange_rate: number; // Suggested base default mapping
}

type Props = {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
};

// Unified properties payload handling incoming parent parameters safely
interface PurchaseOrderFormProps {
  slug: string;
  id?: string;
  isReadOnly?: boolean;
  initialData?: Partial<PurchaseOrderPayloadInput>;
}

interface CurrencyFormInputs {
  currency_id: string;
  exchange_rate: number;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  slug,
  id,
  isReadOnly = false,
  initialData,
}) => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // ✅ Managed validation state array
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CurrencyFormInputs>({
    defaultValues: {
      currency_id: initialData?.order?.currency_id || "",
      exchange_rate: initialData?.order?.exchange_rate || 1,
    },
  });

  // Watch fields to update data state parameters reactively
  const selectedCurrencyId = watch("currency_id");
  const watchExchangeRate = watch("exchange_rate");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setOrder(data.order);
          setLines(data.lines || []);
          setBillingAddress(
            data.billing_address || { address_type: "billing" },
          );
          setShippingAddress(
            data.shipping_address || { address_type: "shipping" },
          );

          // Synchronize incoming data values to react-hook-form field inputs
          if (data.order?.currency_id) {
            setValue("currency_id", data.order.currency_id);
          }
          if (data.order?.exchange_rate) {
            setValue("exchange_rate", data.order.exchange_rate);
          }
        }
      })
      .catch((err) => console.error("Error fetching order details:", err));
  }, [id]);

  useEffect(() => {
    async function fetchCurrencies() {
      try {
        const res = await fetch("/api/parties/currencies");
        if (res.ok) {
          const data = await res.json();
          setCurrencies(data);
        }
      } catch (err) {
        console.error("Error fetching system currencies client side:", err);
      }
    }
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (!selectedCurrencyId || isReadOnly) return;

    const matchedCurrency = currencies.find((c) => c.id === selectedCurrencyId);
    if (matchedCurrency) {
      setValue("exchange_rate", matchedCurrency.exchange_rate, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [selectedCurrencyId, currencies, setValue, isReadOnly]);

  // Synchronize changes back to local structural state payload variables
  /* useEffect(() => {
    if (selectedCurrencyId) {
      setOrder((prev) => ({ ...prev, currency_id: selectedCurrencyId }));
    }
  }, [selectedCurrencyId]);

  useEffect(() => {
    if (watchExchangeRate) {
      setOrder((prev) => ({
        ...prev,
        exchange_rate: Number(watchExchangeRate),
      }));
    }
  }, [watchExchangeRate]); */

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.original_amount || line.net_amount || 0),
      0,
    );
    const tax = lines.reduce(
      (sum, line) => sum + Number(line.vat_amount || 0),
      0,
    );
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setOrder((prev) => ({ ...prev, supplier_id: supplier.id }));
    if (supplier.billing_address)
      setBillingAddress({ ...billingAddress, ...supplier.billing_address });
    if (supplier.shipping_address)
      setShippingAddress({ ...shippingAddress, ...supplier.shipping_address });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setValidationErrors([]); // Clear existing entries
      const localErrors: string[] = [];

      if (!order.supplier_id) {
        localErrors.push("Supplier selection is required.");
      }

      if (!selectedCurrencyId) {
        localErrors.push(
          "An operational transaction currency selection is required.",
        );
      }

      if (lines.length === 0) {
        localErrors.push("At least one transactional line is required.");
      }

      const cleanedLines = lines.map((line, index) => {
        const baseLine = { ...line, line_no: (index + 1) * 10000 };

        if (baseLine.line_type === "ITEM") {
          if (!baseLine.item_id)
            localErrors.push(
              `Line ${index + 1}: Item asset allocation selection is required.`,
            );
          if (!baseLine.warehouse_id)
            localErrors.push(
              `Line ${index + 1}: Warehouse target routing destination is required.`,
            );
          if (Number(baseLine.quantity || 0) <= 0)
            localErrors.push(
              `Line ${index + 1}: Quantity metrics must evaluate higher than 0.`,
            );
          if (Number(baseLine.unit_cost || 0) < 0)
            localErrors.push(
              `Line ${index + 1}: Base unit cost parameters cannot calculate dynamically as negative numbers.`,
            );
        }

        if (baseLine.line_type === "GL_ACCOUNT") {
          if (!baseLine.gl_account_id)
            localErrors.push(
              `Line ${index + 1}: General Ledger account distribution assignment code is required.`,
            );
          baseLine.item_id = undefined;
          baseLine.item_code = undefined;
          baseLine.item_name = undefined;
          baseLine.warehouse_id = undefined;
          baseLine.warehouse_code = undefined;
          baseLine.warehouse_name = undefined;
        }

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

      // Break execution sequence and push logs upwards if errors detected
      if (localErrors.length > 0) {
        setValidationErrors(localErrors);
        return;
      }

      const subtotal = cleanedLines.reduce(
        (sum, l) => sum + Number(l.net_amount || 0),
        0,
      );
      const tax = cleanedLines.reduce(
        (sum, l) => sum + Number(l.vat_amount || 0),
        0,
      );
      const total = subtotal + tax;

      const payload = {
        order: {
          ...order,
          currency_id: selectedCurrencyId,
          exchange_rate: Number(watchExchangeRate || 1),
          subtotal,
          tax_amount: tax,
          total_amount: total,
        },
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines: cleanedLines,
      };

      // const payload = {
      //   order: { ...order, subtotal, tax_amount: tax, total_amount: total },
      //   billing_address: billingAddress,
      //   shipping_address: shippingAddress,
      //   lines: cleanedLines,
      // };

      const res = await fetch(
        id ? `/api/purchase-orders/${id}` : "/api/purchase-orders",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await res.json();
      if (!result.ok)
        throw new Error(result.error || "Save sequence transaction rejected.");

      router.push(`/${slug}/purchases/purchase-orders`);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Transactional runtime operation failure.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto p-2 text-black dark:text-white">
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

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Supplier</h3>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setSupplierModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Select Supplier
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm text-gray-500">Supplier ID</label>
              <input
                value={order?.supplier_id || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50 mt-2 text-black"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Billing City</label>
              <input
                value={billingAddress?.city || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50 mt-2 text-black"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Shipping City</label>
              <input
                value={shippingAddress?.city || ""}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50 mt-2 text-black"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm">Order Date</label>
            <input
              type="date"
              value={order?.order_date}
              disabled={isReadOnly}
              onChange={(e) =>
                setOrder({ ...order, order_date: e.target.value })
              }
              className="border p-2 rounded w-full text-black"
            />
          </div>
          <div>
            <label className="text-sm">Reference</label>
            <input
              value={order?.reference || ""}
              disabled={isReadOnly}
              onChange={(e) =>
                setOrder({ ...order, reference: e.target.value })
              }
              className="border p-2 rounded w-full text-black"
            />
          </div>

          {/* Currency Dropdown Element */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Transaction Currency
            </label>
            <select
              {...register("currency_id")}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border rounded-md shadow-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select operational currency...</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            {errors?.currency_id && (
              <span className="text-xs text-red-500">
                {String(errors.currency_id.message)}
              </span>
            )}
          </div>

          {/* Exchange Rate Numerical Input Element */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Exchange Rate (Base Multiplier)
            </label>
            <input
              type="number"
              step="0.000001"
              placeholder="1.000000"
              disabled={isReadOnly}
              {...register("exchange_rate")}
              className="w-full px-3 py-2 border rounded-md shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {errors?.exchange_rate && (
              <span className="text-xs text-red-500">
                {String(errors.exchange_rate.message)}
              </span>
            )}
          </div>
        </div>
      </div>

      <PurchaseOrderLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadOnly}
      />
      <PurchaseOrderTotals
        subtotal={totals.subtotal}
        tax={totals.tax}
        total={totals.total}
      />

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
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
};

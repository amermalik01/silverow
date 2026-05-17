// app/components/sales/quotes/SalesQuoteForm.tsx

"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  SalesOrderAddress,
  SalesQuote,
  SalesQuoteLine2,
} from "@/types/sales-quote";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";
import SalesQuoteLines from "./SalesQuoteLines";

type Props = {
  slug: string;

  id?: string;

  isReadonly?: boolean;
};

export default function SalesQuoteForm({
  slug,
  id,
  isReadonly = false,
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [billingAddress, setBillingAddress] = useState<SalesOrderAddress>({
    address_type: "billing",
  });

  const [shippingAddress, setShippingAddress] = useState<SalesOrderAddress>({
    address_type: "shipping",
  });

  const [quote, setQuote] = useState<SalesQuote>({
    customer_id: "",
    quote_date: new Date().toISOString().split("T")[0],
  });

  const [lines, setLines] = useState<SalesQuoteLine2[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    fetch(`/api/sales-quotes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuote(data.quote);

        setLines(data.lines || []);
      });
  }, [id]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const validateLines = (lines: SalesQuoteLine2[]) => {
    if (!lines.length) {
      throw new Error("At least one line is required");
    }

    lines.forEach((line, index) => {
      const lineNo = index + 1;

      if (!line.item_name && !line.description) {
        throw new Error(`Line ${lineNo}: Item or description required`);
      }

      if (Number(line.quantity || 0) <= 0) {
        throw new Error(`Line ${lineNo}: Quantity must be greater than 0`);
      }

      if (Number(line.unit_price || 0) < 0) {
        throw new Error(`Line ${lineNo}: Unit price cannot be negative`);
      }

      if (
        Number(line.discount_amount || 0) < 0 ||
        Number(line.tax_amount || 0) < 0
      ) {
        throw new Error(`Line ${lineNo}: Discount/Tax cannot be negative`);
      }
    });
  };

  const updateLine = <K extends keyof SalesQuoteLine2>(
    index: number,
    field: K,
    value: SalesQuoteLine2[K],
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    const qty = Number(updated[index].quantity || 0);
    const price = Number(updated[index].unit_price || 0);
    const discount = Number(updated[index].discount_amount || 0);
    const tax = Number(updated[index].tax_amount || 0);

    const base = qty * price;

    updated[index].line_total = Number((base - discount + tax).toFixed(2));

    setLines(updated);
  };

  const totals = lines.reduce(
    (acc, line) => {
      acc.subtotal += Number(line.line_total || 0);

      return acc;
    },
    {
      subtotal: 0,
    },
  );

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setQuote((prev) => ({
      ...prev,
      customer_id: customer.id,
    }));

    /**
     * STAMP BILLING ADDRESS
     */
    if (customer.billing_address) {
      //   setBillingAddress({
      //     ...billingAddress,
      //     ...customer.billing_address,
      //   });

      setBillingAddress((prev) => ({
        ...prev,
        ...customer.billing_address,
      }));
    }

    /**
     * STAMP SHIPPING ADDRESS
     */
    if (customer.shipping_address) {
      setShippingAddress((prev) => ({
        ...prev,
        ...customer.shipping_address,
      }));

      //   setShippingAddress({
      //     ...shippingAddress,
      //     ...customer.shipping_address,
      //   });
    }
  };

  const save = async () => {
    try {
      setSaving(true);

      /**
       * 1. VALIDATE CUSTOMER
       */
      if (!quote.customer_id) {
        throw new Error("Customer is required");
      }

      /**
       * 2. VALIDATE LINES
       */
      validateLines(lines);

      /**
       * 3. FORCE RECALCULATION SAFETY
       */
      const safeLines = lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity || 0),
        unit_price: Number(l.unit_price || 0),
        discount_amount: Number(l.discount_amount || 0),
        tax_amount: Number(l.tax_amount || 0),
      }));

      const subtotal = safeLines.reduce(
        (sum, l) => sum + Number(l.line_total || 0),
        0,
      );

      /**
       * 4. BUILD PAYLOAD
       */
      const payload = {
        quote: {
          ...quote,
          subtotal,
          total_amount: subtotal,
        },
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines: safeLines,
      };

      /**
       * 5. API CALL
       */
      const res = await fetch(
        id ? `/api/sales-quotes/${id}` : "/api/sales-quotes",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      router.push(`/${slug}/sales/quotes`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded p-4 grid grid-cols-3 gap-4">
        <div>
          <label>Quote Date</label>

          <input
            type="date"
            value={quote.quote_date}
            onChange={(e) =>
              setQuote({
                ...quote,
                quote_date: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />
        </div>

        <div>
          <label>Expiry Date</label>

          <input
            type="date"
            value={quote.expiry_date || ""}
            onChange={(e) =>
              setQuote({
                ...quote,
                expiry_date: e.target.value,
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
            {quote.customer_name || "Select Customer"}
          </button>
        </div>
      </div>

      <SalesQuoteLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadonly}
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || !quote.customer_id || lines.length === 0}
          onClick={save}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Save Quote
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

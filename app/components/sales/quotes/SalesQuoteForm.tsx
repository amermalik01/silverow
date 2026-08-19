// app/components/sales/quotes/SalesQuoteForm.tsx

"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  SalesOrderAddress,
  SalesQuote,
  SalesQuoteLine2,
  SalesQuoteLineUI,
} from "@/types/sales-quote";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "../../shared/modals/CustomerLookupModal";
import SalesQuoteLines from "./SalesQuoteLines";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  id?: string;
  isReadonly?: boolean;
};

// Simple utility to sanitize data format constraints natively
const formatShortDate = (dateInput?: string): string => {
  if (!dateInput) return "";
  return dateInput.split("T")[0];
};

export default function SalesQuoteForm({
  slug,
  id,
  isReadonly: manualReadonly = false,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [isConvertedReadonly, setIsConvertedReadonly] = useState(false);

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

  const [lines, setLines] = useState<SalesQuoteLineUI[]>([]);

  const isReadonly = manualReadonly || isConvertedReadonly;

  useEffect(() => {
    if (!id) {
      return;
    }

    fetch(`/api/sales/sales-quotes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.quote) {
          // Map backend payload to safe form inputs parameters
          setQuote({
            ...data.quote,
            quote_date: formatShortDate(data.quote.quote_date),
            expiry_date: formatShortDate(data.quote.expiry_date),
          });

          if (
            data.quote.status &&
            data.quote.status !== "DRAFT" &&
            data.quote.status !== "OPEN"
          ) {
            setIsConvertedReadonly(true);
          }
        }

        // Populate fallback UI field structural defaults onto incoming data matrices
        if (data.lines) {
          const sanitizedLines = (
            data.lines as Partial<SalesQuoteLineUI>[]
          ).map((line) => ({
            ...line,
            line_type: line.line_type || "ITEM",
            quantity: Number(line.quantity || 0),
            unit_price: Number(line.unit_price || 0),
            discount_type: line.discount_type || "PERCENT",
            discount_value: Number(line.discount_value || 0),
            tax_percent: Number(line.tax_percent || 0),
            original_amount: Number(line.original_amount || 0),
            discount_amount: Number(line.discount_amount || 0),
            net_amount: Number(line.net_amount || 0),
            tax_amount: Number(line.tax_amount || 0),
            total_amount: Number(line.total_amount || 0),
            line_total: Number(line.total_amount || 0),
          }));
          setLines(sanitizedLines);
        }

        if (data.billing_address) setBillingAddress(data.billing_address);
        if (data.shipping_address) setShippingAddress(data.shipping_address);
      })
      .catch((err) => console.error("Error loading quote details:", err));
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

  const validateLines = (lines: SalesQuoteLineUI[]) => {
    if (!lines.length) {
      throw new Error("At least one line is required");
    }

    lines.forEach((line, index) => {
      const lineNo = index + 1;

      if (!line.item_id && !line.gl_account_id && !line.description) {
        throw new Error(
          `Line ${lineNo}: Identification Reference or description required`,
        );
      }
      if (line.line_type !== "COMMENT" && Number(line.quantity || 0) <= 0) {
        throw new Error(`Line ${lineNo}: Quantity must be greater than 0`);
      }

      if (!line.item_name && !line.description) {
        throw new Error(`Line ${lineNo}: Item or description required`);
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
    // 1. Update Quote Header
    setQuote((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name, // Ensure this matches your display state
    }));

    // 2. Robust Address Stamping
    // Assuming customer.billing_address is a JSON object from your DB
    if (customer.billing_address) {
      const addr =
        typeof customer.billing_address === "string"
          ? JSON.parse(customer.billing_address)
          : customer.billing_address;

      setBillingAddress({
        address_type: "billing",
        contact_name: customer.name,
        ...addr,
      });
    }

    if (customer.shipping_address) {
      const addr =
        typeof customer.shipping_address === "string"
          ? JSON.parse(customer.shipping_address)
          : customer.shipping_address;

      setShippingAddress({
        address_type: "shipping",
        contact_name: customer.name,
        ...addr,
      });
    }

    setCustomerModalOpen(false); // Close modal after selection
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
      // const safeLines = lines.map((l) => ({
      //   ...l,
      //   quantity: Number(l.quantity || 0),
      //   unit_price: Number(l.unit_price || 0),
      //   discount_amount: Number(l.discount_amount || 0),
      //   tax_amount: Number(l.tax_amount || 0),
      // }));

      // Re-calculate all line properties inline to prevent data drifting
      const safeLines = lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity || 0),
        unit_price: Number(l.unit_price || 0),
        discount_value: Number(l.discount_value || 0),
        tax_percent: Number(l.tax_percent || 0),
      }));

      const subtotal = safeLines.reduce(
        (sum, l) => sum + Number(l.line_total || 0),
        0,
      );

      const totalCalculated = safeLines.reduce(
        (sum, l) => sum + Number(l.total_amount || 0),
        0,
      );

      const payload = {
        quote: {
          ...quote,
          subtotal: totalCalculated,
          total_amount: totalCalculated,
        },
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        lines: safeLines,
      };

      /**
       * 4. BUILD PAYLOAD
       */
      // const payload = {
      //   quote: {
      //     ...quote,
      //     subtotal,
      //     total_amount: subtotal,
      //   },
      //   billing_address: billingAddress,
      //   shipping_address: shippingAddress,
      //   lines: safeLines,
      // };

      /**
       * 5. API CALL
       */
      const res = await fetch(
        id ? `/api/sales/sales-quotes/${id}` : "/api/sales/sales-quotes",
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
    <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white overflow-hidden shadow-sm p-4">
      {isReadonly && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-lg text-xs font-medium">
          This quote has been processed ({quote.status}) and is view-only.
        </div>
      )}

      <div className="border rounded p-4 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-70">
            Quote Date
          </label>
          <input
            type="date"
            value={quote.quote_date}
            onChange={(e) => setQuote({ ...quote, quote_date: e.target.value })}
            className="border rounded p-2 w-full dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 opacity-70">
            Expiry Date
          </label>
          <input
            type="date"
            value={quote.expiry_date || ""}
            onChange={(e) =>
              setQuote({ ...quote, expiry_date: e.target.value })
            }
            className="border rounded p-2 w-full dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 opacity-70">
            Customer
          </label>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="border rounded p-2 w-full text-left bg-white text-black dark:bg-slate-900 dark:text-white"
          >
            {quote.customer_name || "Select Customer"}
          </button>
        </div>

        {/* <div>
          <label>Customer</label>

          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="border rounded p-2 w-full text-left bg-white text-black"
          >
            {quote.customer_name || "Select Customer"}
          </button>
        </div> */}
      </div>

      <SalesQuoteLines
        lines={lines}
        setLines={setLines}
        isReadonly={isReadonly}
      />

      {!isReadonly && (
        <div className="flex justify-end mt-4">
          <Button
            type="button"
            disabled={saving || !quote.customer_id || lines.length === 0}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-6 py-2 rounded transition-colors"
          >
            {saving ? "Saving Quote..." : "Save"}
          </Button>
        </div>
      )}

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}

// /components/inventory/prices/PriceModal.tsx
"use client";

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

type Props = {
  itemId: string;
  priceType: 1 | 2;
  onClose: () => void;
  onSaved: () => void;
};

type Form = {
  uom_id: string;
  currency_id: string;
  price: string;
  minimum_price: string;
  start_date: string;
  end_date: string;
  minimum_qty: string;
  maximum_qty: string;
  is_default: boolean;
};

export default function PriceModal({
  itemId,
  priceType,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<Form>({
    uom_id: "",
    currency_id: "",
    price: "",
    minimum_price: "",
    start_date: "",
    end_date: "",
    minimum_qty: "",
    maximum_qty: "",
    is_default: false,
  });

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);

    try {
      await fetch(`/api/inventory/items/${itemId}/prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          price_type: priceType,
        }),
      });

      onSaved(); // 🔥 IMPORTANT: refresh parent table
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white text-black w-[600px] p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {priceType === 1 ? "Sales Price" : "Purchase Price"}
        </h2>

        <input
          placeholder="Price"
          className="border p-2 w-full"
          value={form.price}
          onChange={(e) =>
            setForm({
              ...form,
              price: e.target.value,
            })
          }
        />

        <input
          placeholder="Min Price"
          className="border p-2 w-full"
          value={form.minimum_price}
          onChange={(e) =>
            setForm({
              ...form,
              minimum_price: e.target.value,
            })
          }
        />

        <DatePicker
          value={form.start_date ? parseISO(form.start_date) : undefined}
          onChange={(date) =>
            setForm({
              ...form,
              start_date: date ? format(date, "yyyy-MM-dd") : "",
            })
          }
          className="border p-2 w-full"
        />

        <DatePicker
          value={form.end_date ? parseISO(form.end_date) : undefined}
          onChange={(date) =>
            setForm({
              ...form,
              end_date: date ? format(date, "yyyy-MM-dd") : "",
            })
          }
          className="border p-2 w-full"
        />

        {/* <input
          type="date"
          className="border p-2 w-full"
          value={form.start_date}
          onChange={(e) =>
            setForm({
              ...form,
              start_date:
                e.target.value,
            })
          }
        />

        <input
          type="date"
          className="border p-2 w-full"
          value={form.end_date}
          onChange={(e) =>
            setForm({
              ...form,
              end_date:
                e.target.value,
            })
          }
        /> */}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>

          <Button
            onClick={submit}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5 text-white px-4 py-2"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

type Props = {
  itemId: string;
  type: 1 | 2; // 1 sales, 2 purchase
  onClose: () => void;
  onSaved: () => void;
};

type PriceForm = {
  uom_id: string;
  currency_id: string;
  price: string;
  minimum_price: string;
  start_date: string;
  end_date: string;
  minimum_qty: string;
  maximum_qty: string;
  is_default: boolean;
};

const defaultForm: PriceForm = {
  uom_id: "",
  currency_id: "",
  price: "",
  minimum_price: "",
  start_date: "",
  end_date: "",
  minimum_qty: "",
  maximum_qty: "",
  is_default: false,
};

export default function PriceModal({ itemId, type, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PriceForm>(defaultForm);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await fetch(`/api/inventory/items/${itemId}/prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          price_type: type,
        }),
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white text-black w-[600px] p-6 rounded space-y-4">
        <h2 className="text-lg font-semibold">
          {type === 1 ? "Sales Price" : "Purchase Price"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="UOM ID"
            value={form.uom_id}
            onChange={(e) =>
              setForm({
                ...form,
                uom_id: e.target.value,
              })
            }
            className="border p-2"
          />

          <input
            placeholder="Currency ID"
            value={form.currency_id}
            onChange={(e) =>
              setForm({
                ...form,
                currency_id: e.target.value,
              })
            }
            className="border p-2"
          />

          <input
            placeholder="Price"
            value={form.price}
            onChange={(e) =>
              setForm({
                ...form,
                price: e.target.value,
              })
            }
            className="border p-2"
          />

          <input
            placeholder="Min Price"
            value={form.minimum_price}
            onChange={(e) =>
              setForm({
                ...form,
                minimum_price: e.target.value,
              })
            }
            className="border p-2"
          />

          <input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm({
                ...form,
                start_date: e.target.value,
              })
            }
            className="border p-2"
          />

          <input
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm({
                ...form,
                end_date: e.target.value,
              })
            }
            className="border p-2"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) =>
              setForm({
                ...form,
                is_default: e.target.checked,
              })
            }
          />
          Default Price
        </label>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} className="px-4 py-2 border">
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
} */

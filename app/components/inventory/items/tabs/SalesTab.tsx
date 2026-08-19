// app/components/inventory/items/tabs/SalesTab.tsx

"use client";

import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  uoms: ItemLookupOption[];
  isReadonly?: boolean;
};

export default function SalesTab({
  item,
  setItem,
  uoms,
  isReadonly = false,
}: Props) {
  return (
    <div className="space-y-4 text-xs">
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Sales U.O.M</th>
              <th className="p-3">Standard Price</th>
              <th className="p-3">Min. Sales Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3">
                <select
                  disabled={isReadonly}
                  value={item.sales_uom_id}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      sales_uom_id: e.target.value,
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                >
                  <option value="">Default Base UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3">
                <input
                  type="number"
                  disabled={isReadonly}
                  value={item.standard_sales_price}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: e.target.value,
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                />
              </td>
              <td className="p-3">
                <input
                  type="number"
                  disabled={isReadonly}
                  defaultValue={item.standard_sales_price}
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";
import PriceModal from "@/app/components/inventory/prices/PriceModal";

type Price = {
  id: string;
  price: number;
  uom_id: string;
  start_date: string;
  end_date: string;
};

export default function SalesTab({ itemId }: { itemId: string }) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);

  const loadPrices = async () => {
      const res = await fetch(`/api/inventory/items/${itemId}/prices?type=1`);

      const data = await res.json();

      setPrices(data);
    };
    const loadEffectivePrice = async () => {
      const res = await fetch(
        `/api/inventory/items/${itemId}/effective-price?qty=1&price_type=1`,
      );

      const data = await res.json();

      setEffectivePrice(data.price);
    };

  useEffect(() => {
    const loadPrices = async () => {
      const res = await fetch(`/api/inventory/items/${itemId}/prices?type=1`);

      const data = await res.json();

      setPrices(data);
    };
    const loadEffectivePrice = async () => {
      const res = await fetch(
        `/api/inventory/items/${itemId}/effective-price?qty=1&price_type=1`,
      );

      const data = await res.json();

      setEffectivePrice(data.price);
    };

    loadPrices();
    loadEffectivePrice();
  }, [itemId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">Sales Setup</h2>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-3 py-1"
        >
          + Add Price
        </Button>
      </div>

 
      <div className="p-3 bg-green-50 border text-black">
        Effective Price: <b>{effectivePrice ?? 0}</b>
      </div>

 
      <table className="w-full text-xs border">
        <thead>
          <tr>
            <th>Price</th>
            <th>UOM</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>

        <tbody>
          {prices.map((p) => (
            <tr key={p.id}>
              <td>{p.price}</td>
              <td>{p.uom_id}</td>
              <td>{p.start_date}</td>
              <td>{p.end_date}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500">Item ID: {itemId}</p>

      {showModal && (
        <PriceModal
          itemId={itemId}
          priceType={1}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            loadPrices();
            loadEffectivePrice(); // 🔥 sync pricing engine
          }}
        />
      )}
    </div>
  );
} */

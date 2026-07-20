// app/components/inventory/items/tabs/SalesTab.tsx

"use client";

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

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-3 py-1"
        >
          + Add Price
        </button>
      </div>

      {/* 🔥 EFFECTIVE PRICE PREVIEW */}
      <div className="p-3 bg-green-50 border text-black">
        Effective Price: <b>{effectivePrice ?? 0}</b>
      </div>

      {/* TABLE */}
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
}

/* "use client";

import { useEffect, useState } from "react";

type SalesPrice = {
  id: string;
  uom_id: string;
  uom_name?: string;

  price: number;
  minimum_price?: number | null;

  start_date?: string | null;
  end_date?: string | null;
};

type Props = {
  itemId: string;
};

export default function SalesTab({ itemId }: Props) {
  const [data, setData] = useState<SalesPrice[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/items/${itemId}/sales-prices`);

      const result = await res.json();

      setData(result || []);
    } catch (err) {
      console.error("SalesTab error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Sales Setup</h2>

        <p className="text-xs text-gray-500">
          Manage item sales prices by UOM and validity
        </p>
      </div>



      <div className="border rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">UOM</th>

              <th className="p-3 text-left">Price</th>

              <th className="p-3 text-left">Min Price</th>

              <th className="p-3 text-left">Start Date</th>

              <th className="p-3 text-left">End Date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No sales prices found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.uom_name || row.uom_id}</td>

                  <td className="p-3">{row.price}</td>

                  <td className="p-3">{row.minimum_price ?? "-"}</td>

                  <td className="p-3">{row.start_date ?? "-"}</td>

                  <td className="p-3">{row.end_date ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>



      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
} */

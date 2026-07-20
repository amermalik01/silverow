// app/components/setup/general/currencies/RateHistoryModal.tsx

"use client";

import { formatDate, formatRate } from "@/lib/utils/currency";
import { useEffect, useState } from "react";

type Rate = {
  id: string;
  rate: number;
  effective_date: string;
};

export default function RateHistoryModal({
  currencyId,
  currencyCode,
  currencySymbol,
  onClose,
}: {
  currencyId: string;
  currencyCode: string;
  currencySymbol: string;
  onClose: () => void;
}) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRates = async () => {
    const res = await fetch(
      `/api/setup/general/company/currencies/rates?currency_id=${currencyId}`,
    );
    const json = await res.json();
    setRates(json);
  };

  useEffect(() => {
    const fetchRates = async () => {
      const res = await fetch(
        `/api/setup/general/company/currencies/rates?currency_id=${currencyId}`,
      );
      const json = await res.json();
      setRates(json);
    };
    fetchRates();
  }, []);

  const saveRate = async () => {
    if (!rate || !date) return;

    setLoading(true);

    await fetch("/api/setup/general/company/currencies/rates", {
      method: "POST",
      body: JSON.stringify({
        currency_id: currencyId,
        rate: parseFloat(rate),
        effective_date: date,
      }),
    });

    setRate("");
    setDate("");
    setLoading(false);
    fetchRates();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white text-black rounded-xl w-[600px] shadow-xl p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-black">
            Rate History - {currencyCode} ({currencySymbol})
          </h3>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>

        {/* Add Rate */}
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            step="0.0001"
            placeholder="Rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="border p-2 rounded w-1/3"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />

          <button
            onClick={saveRate}
            className="bg-blue-600 text-white px-4 rounded"
            disabled={loading}
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Effective Date</th>
                <th className="p-3 text-left">Rate</th>
              </tr>
            </thead>

            <tbody>
              {rates.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-500">
                    No rates found
                  </td>
                </tr>
              )}

              {rates.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {formatDate(r.effective_date)}
                    </span>
                  </td>

                  <td className="p-3 font-mono">
                    {currencySymbol}{formatRate(r.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 text-right">
          <button onClick={onClose} className="text-red-500 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );

}

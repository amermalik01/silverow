// app/components/setup/general/currencies/CompanyCurrencies.tsx

"use client";

import { useEffect, useState } from "react";

import { CompanyCurrency } from "@/types/currency";
import CurrencyForm from "./CurrencyForm";
import { formatCurrency } from "@/lib/utils/currency";
import RateHistoryModal from "./RateHistoryModal";

export default function CompanyCurrencies() {
  const [data, setData] = useState<CompanyCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] =
    useState<CompanyCurrency | null>(null);

  const fetchData = async () => {
    const res = await fetch("/api/setup/general/company/currencies");
    const json: CompanyCurrency[] = await res.json();
    setData(json);
  };

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/setup/general/company/currencies");
      const json: CompanyCurrency[] = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  return (
    <div>
      <CurrencyForm onSuccess={fetchData} />

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">Currency</th>
              <th className="p-3 text-left">Rate</th>
              <th className="p-3 text-left">Base</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium">
                    {c.code} ({c.symbol})
                  </div>
                  <div className="text-gray-500 text-xs">{c.name}</div>
                </td>

                <td className="p-3 font-mono">
                  {formatCurrency(c.exchange_rate, c.code)}
                </td>

                <td className="p-3">
                  {c.is_base ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      Base
                    </span>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => setSelectedCurrency(c)}
                    className="text-indigo-600 text-xs"
                  >
                    History
                  </button>

                  {!c.is_base && (
                    <button
                      onClick={async () => {
                        await fetch(
                          "/api/setup/general/company/currencies/set-base",
                          {
                            method: "POST",
                            body: JSON.stringify({ currency_id: c.id }),
                          },
                        );
                        fetchData();
                      }}
                      className="text-blue-600 text-xs"
                    >
                      Set Base
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCurrency && (
        <RateHistoryModal
          currencyId={selectedCurrency.id}
          currencyCode={selectedCurrency.code}
          currencySymbol={selectedCurrency.symbol}
          onClose={() => setSelectedCurrency(null)}
        />
      )}
    </div>
  );
}

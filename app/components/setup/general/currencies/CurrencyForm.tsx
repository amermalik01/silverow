// app/components/setup/general/currencies/CurrencyForm.tsx

"use client";

import { useState } from "react";
import CurrencyDropdown from "@/app/components/common/CurrencyDropdown";

type Props = {
  onSuccess: () => void; // for auto refresh
};

export default function CurrencyForm({ onSuccess }: Props) {
  const [currencyId, setCurrencyId] = useState("");
  const [rate, setRate] = useState(1);
  const [isBase, setIsBase] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    const res = await fetch("/api/setup/general/company/currencies", {
      method: "POST",
      body: JSON.stringify({
        currency_id: currencyId,
        exchange_rate: rate,
        is_base: isBase,
      }),
    });

    setLoading(false);

    if (res.ok) {
      setCurrencyId("");
      setRate(1);
      setIsBase(false);
      onSuccess(); // 🔥 trigger refresh
    } else {
      const err = await res.json();
      console.error(err);
    }
  };

  return (
    <div className="border p-4 rounded mb-4">
      <h3 className="font-semibold mb-2">Add / Update Currency</h3>

      {/* <CurrencyDropdown value={currencyId} onChange={setCurrencyId} /> */}
      <CurrencyDropdown
        value={currencyId}
        onChange={(val) => setCurrencyId(val || "")}
      />

      <input
        type="number"
        step="0.0001"
        value={rate}
        onChange={(e) => setRate(parseFloat(e.target.value))}
        className="border p-2 w-full mt-2"
        placeholder="Exchange Rate"
      />

      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={isBase}
          onChange={(e) => setIsBase(e.target.checked)}
        />
        Base Currency
      </label>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 mt-3 rounded"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

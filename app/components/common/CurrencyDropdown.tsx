// app/components/common/CurrencyDropdown.tsx

"use client";

import { useEffect, useState } from "react";
import { Currency } from "@/types/currency";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function CurrencyDropdown({ value, onChange }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    fetch("/api/setup/general/currencies")
      .then((res) => res.json())
      .then(setCurrencies);
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded w-full"
    >
      <option value="">Select Currency</option>
      {currencies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} - {c.name}
        </option>
      ))}
    </select>
  );
}

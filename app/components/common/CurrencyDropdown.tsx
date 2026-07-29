// app/components/common/CurrencyDropdown.tsx

"use client";

import { useEffect, useState } from "react";
import { Currency } from "@/types/currency";

type Props = {
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
  valueKey?: "id" | "code"; // Allows returning currency ID or Currency Code (e.g. 'GBP')
  displayFormat?: "code-name" | "code" | "name"; // Formatting for option text
  defaultFilter?: (item: Currency) => boolean;
};

export default function CurrencyDropdown({
  value,
  onChange,
  className = "border p-2 w-full rounded text-black bg-white",
  disabled = false,
  valueKey = "id",
  displayFormat = "code-name",
  defaultFilter,
}: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/setup/general/currencies")
      .then((res) => res.json())
      .then((data: Currency[]) => {
        if (isMounted) {
          setCurrencies(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load currencies:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle defaultFilter auto-selection logic matching MasterDropdown
  useEffect(() => {
    if (value || !defaultFilter || currencies.length === 0) return;

    const matchedItem = currencies.find(defaultFilter);

    if (matchedItem) {
      onChange(valueKey === "code" ? matchedItem.code : matchedItem.id);
    }
  }, [value, currencies, defaultFilter, onChange, valueKey]);

  const renderLabel = (c: Currency) => {
    switch (displayFormat) {
      case "code":
        return c.code;
      case "name":
        return c.name;
      case "code-name":
      default:
        return `${c.code} - ${c.name}`;
    }
  };

  return (
    <select
      value={value ?? ""}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      className={className}
    >
      <option value="">{loading ? "Loading currencies..." : "Select Currency"}</option>

      {currencies.map((c) => {
        const optionValue = valueKey === "code" ? c.code : c.id;
        return (
          <option key={c.id} value={optionValue}>
            {renderLabel(c)}
          </option>
        );
      })}
    </select>
  );
}

/* "use client";

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
      className="border p-2 rounded w-full text-black bg-gray"
    >
      <option value="">Select Currency</option>
      {currencies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} - {c.name}
        </option>
      ))}
    </select>
  );
} */

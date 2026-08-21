// components/ui/NumericTextInput.tsx

"use client";

import { useState } from "react";
import { sanitizeNumericInput } from "@/lib/utils/currency";

type NumericTextInputProps = {
  value: number;
  onChange: (val: number) => void;
  allowDecimals?: boolean;
  decimalScale?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export default function NumericTextInput({
  value,
  onChange,
  allowDecimals = true,
  decimalScale = 2,
  disabled = false,
  className = "",
  placeholder = "0",
}: NumericTextInputProps) {
  // Track local value string AND the last prop value received
  const [localVal, setLocalVal] = useState<string>(
    value !== undefined && value !== null ? String(value) : "",
  );
  const [prevValue, setPrevValue] = useState<number>(value);

  // Sync state during render if parent value prop changed externally
  if (prevValue !== value) {
    setPrevValue(value);
    setLocalVal(value !== undefined && value !== null ? String(value) : "");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitized = sanitizeNumericInput(
      rawValue,
      allowDecimals,
      decimalScale,
    );
    setLocalVal(sanitized);

    const numValue =
      sanitized === "" || sanitized === "." ? 0 : Number(sanitized);
    onChange(numValue);
  };

  const handleBlur = () => {
    const numValue = localVal === "" || localVal === "." ? 0 : Number(localVal);
    if (allowDecimals && localVal !== "") {
      setLocalVal(numValue.toString());
    } else {
      setLocalVal(String(numValue));
    }
    onChange(numValue);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={localVal}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

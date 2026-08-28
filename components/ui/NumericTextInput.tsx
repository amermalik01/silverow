// components/ui/NumericTextInput.tsx

"use client";

import { useState } from "react";

type NumericTextInputProps = {
  value: number;
  onChange: (val: number) => void;
  allowDecimals?: boolean;
  decimalScale?: number;
  min?: number | string;
  max?: number | string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export default function NumericTextInput({
  value,
  onChange,
  allowDecimals = true,
  decimalScale = 2,
  min,
  max,
  disabled = false,
  className = "",
  placeholder = "0",
}: NumericTextInputProps) {
  const [inputValue, setInputValue] = useState(
    value !== undefined && value !== null
      ? String(value)
      : "",
  );

  const [isEditing, setIsEditing] = useState(false);

  const [lastValue, setLastValue] = useState(value);

  /**
   * If the parent changes `value` externally while we're NOT editing,
   * reflect that value in the input.
   *
   * We use state instead of refs/effects.
   */
  if (!isEditing && lastValue !== value) {
    setLastValue(value);
    setInputValue(
      value !== undefined && value !== null
        ? String(value)
        : "",
    );
  }

  const clampValue = (num: number) => {
    if (min !== undefined && num < Number(min)) {
      return Number(min);
    }

    if (max !== undefined && num > Number(max)) {
      return Number(max);
    }

    return num;
  };

  /**
   * Keep the user's text intact while typing.
   *
   * Examples:
   *
   * ""
   * "0"
   * "0."
   * "0.8"
   * "0.87"
   * ".5"
   */
  const sanitizeInput = (input: string) => {
    if (!allowDecimals) {
      return input.replace(/\D/g, "");
    }

    let sanitized = input.replace(/[^\d.]/g, "");

    // Only one decimal point.
    const firstDotIndex = sanitized.indexOf(".");

    if (firstDotIndex !== -1) {
      sanitized =
        sanitized.slice(0, firstDotIndex + 1) +
        sanitized.slice(firstDotIndex + 1).replace(/\./g, "");
    }

    // Limit decimal places.
    if (firstDotIndex !== -1) {
      const integerPart = sanitized.slice(
        0,
        firstDotIndex + 1,
      );

      const decimalPart = sanitized
        .slice(firstDotIndex + 1)
        .slice(0, decimalScale);

      sanitized = integerPart + decimalPart;
    }

    return sanitized;
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const sanitized = sanitizeInput(e.target.value);

    setInputValue(sanitized);

    /**
     * These are intermediate typing states.
     *
     * Don't convert them to 0.
     */
    if (
      sanitized === "" ||
      sanitized === "." ||
      sanitized.endsWith(".")
    ) {
      return;
    }

    const numValue = Number(sanitized);

    if (!Number.isFinite(numValue)) {
      return;
    }

    /**
     * Don't clamp during typing.
     *
     * Clamping while typing causes the cursor/input to jump.
     */
    onChange(numValue);
  };

  const handleBlur = () => {
    setIsEditing(false);

    /**
     * Empty input.
     */
    if (inputValue === "" || inputValue === ".") {
      const fallback =
        min !== undefined ? Number(min) : 0;

      setInputValue(String(fallback));
      setLastValue(fallback);
      onChange(fallback);

      return;
    }

    let numValue = Number(inputValue);

    if (!Number.isFinite(numValue)) {
      numValue = min !== undefined ? Number(min) : 0;
    }

    /**
     * Apply min/max only after typing has finished.
     */
    numValue = clampValue(numValue);

    let formattedValue: string;

    if (allowDecimals) {
      formattedValue = numValue.toFixed(decimalScale);

      // Remove trailing zeros.
      formattedValue = formattedValue.replace(
        /\.?0+$/,
        "",
      );
    } else {
      formattedValue = String(Math.round(numValue));
    }

    setInputValue(formattedValue);
    setLastValue(numValue);

    onChange(numValue);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={inputValue}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}



/* export default function NumericTextInput({
  value,
  onChange,
  allowDecimals = true,
  decimalScale = 2,
  min,
  max,
  disabled = false,
  className = "",
  placeholder = "0",
}: NumericTextInputProps) {
  const [inputValue, setInputValue] = useState(
    value !== undefined && value !== null ? String(value) : "",
  );

  const isFocusedRef = useRef(false);


  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(
        value !== undefined && value !== null ? String(value) : "",
      );
    }
  }, [value]);


  const isValidInput = (input: string) => {
    if (input === "") {
      return true;
    }

    if (allowDecimals) {
      // Allows:
      // 123
      // 123.
      // 123.45
      // .45
      return /^\d*\.?\d*$/.test(input);
    }

    // Integers only
    return /^\d*$/.test(input);
  };


  const sanitizeInput = (input: string) => {
    let sanitized = input;

    // Remove everything except digits and decimal point.
    if (allowDecimals) {
      sanitized = sanitized.replace(/[^\d.]/g, "");

      // Only allow one decimal point.
      const firstDot = sanitized.indexOf(".");

      if (firstDot !== -1) {
        sanitized =
          sanitized.slice(0, firstDot + 1) +
          sanitized.slice(firstDot + 1).replace(/\./g, "");
      }

      // Limit decimal places.
      if (firstDot !== -1 && decimalScale >= 0) {
        const integerPart = sanitized.slice(0, firstDot + 1);
        const decimalPart = sanitized
          .slice(firstDot + 1)
          .slice(0, decimalScale);

        sanitized = integerPart + decimalPart;
      }
    } else {
      sanitized = sanitized.replace(/\D/g, "");
    }

    return sanitized;
  };

  const clampValue = (num: number) => {
    if (min !== undefined && num < Number(min)) {
      return Number(min);
    }

    if (max !== undefined && num > Number(max)) {
      return Number(max);
    }

    return num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    const sanitized = sanitizeInput(rawValue);

    // Don't update if the value isn't allowed.
    if (!isValidInput(sanitized)) {
      return;
    }

    setInputValue(sanitized);


    if (
      sanitized === "" ||
      sanitized === "." ||
      sanitized.endsWith(".")
    ) {
      return;
    }

    const numValue = Number(sanitized);

    if (!Number.isFinite(numValue)) {
      return;
    }

    // Optional live min/max validation.
    // We don't clamp here because doing so while typing
    // can also make the input jump unexpectedly.
    if (min !== undefined && numValue < Number(min)) {
      return;
    }

    if (max !== undefined && numValue > Number(max)) {
      return;
    }

    onChange(numValue);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;

    // Empty input
    if (inputValue === "" || inputValue === ".") {
      const fallback =
        min !== undefined ? Number(min) : 0;

      setInputValue(String(fallback));
      onChange(fallback);
      return;
    }

    let numValue = Number(inputValue);

    if (!Number.isFinite(numValue)) {
      numValue = min !== undefined ? Number(min) : 0;
    }

    // Apply min/max only on blur.
    numValue = clampValue(numValue);

    // Format decimal places on blur.
    let formattedValue: string;

    if (allowDecimals) {
      formattedValue = numValue.toFixed(decimalScale);

      // Remove unnecessary trailing zeros.
      formattedValue = formattedValue.replace(/\.?0+$/, "");
    } else {
      formattedValue = String(Math.round(numValue));
    }

    setInputValue(formattedValue);
    onChange(numValue);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={inputValue}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
} */


/* "use client";

import { useState } from "react";
import { sanitizeNumericInput } from "@/lib/utils/currency";

type NumericTextInputProps = {
  value: number;
  onChange: (val: number) => void;
  allowDecimals?: boolean;
  decimalScale?: number;
  min?: number | string;
  max?: number | string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export default function NumericTextInput({
  value,
  onChange,
  allowDecimals = true,
  decimalScale = 2,
  min,
  max,
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

   const clampValue = (numValue: number) => {
    if (min !== undefined && numValue < Number(min)) {
      return Number(min);
    }

    if (max !== undefined && numValue > Number(max)) {
      return Number(max);
    }

    return numValue;
  };

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
    let numValue = localVal === "" || localVal === "." ? 0 : Number(localVal);

    numValue = clampValue(numValue);

    // if (allowDecimals && localVal !== "") {
    //   setLocalVal(numValue.toString());
    // } else {
    //   setLocalVal(String(numValue));
    // }

    setLocalVal(numValue.toString());
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
} */

// /lib/utils/currency.ts

export function formatCurrency(
  amount: number,
  code: string,
  locale: string = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(amount);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRate(rate: number) {
  return Number(rate).toFixed(4); // adjust precision if needed
}

// Sanitizes input string based on constraints
export const sanitizeNumericInput = (
  value: string,
  allowDecimals = true,
  decimalScale = 2,
): string => {
  // 1. Remove everything except digits and a single period
  let sanitized = value.replace(/[^0-9.]/g, "");

  if (!allowDecimals) {
    return sanitized.replace(/\./g, ""); // Strip out all dots for integers
  }

  // 2. Ensure only one decimal point exists
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  // 3. Limit decimal places to specified scale
  if (parts.length >= 2) {
    sanitized = `${parts[0]}.${parts[1].slice(0, decimalScale)}`;
  }

  return sanitized;
};

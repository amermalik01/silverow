// /lib/utils/currency.ts
export function formatCurrency(
  amount: number,
  code: string,
  locale: string = "en-US"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code
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
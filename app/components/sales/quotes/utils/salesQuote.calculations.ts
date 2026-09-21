// app/components/sales/quotes/utils/salesQuote.calculations.ts

import { SalesQuoteLineUI } from "@/types/sales-quote";

export interface SalesQuoteFinancials {
  originalAmount: number;
  totalDiscount: number;
  amount: number;
  vat: number;
  amountInclVat: number;
  amountInclVatLCY: number;
}

export function calculateSalesQuoteFinancials(
  lines: SalesQuoteLineUI[],
  exchangeRate: number,
): SalesQuoteFinancials {
  const originalAmount = lines.reduce(
    (sum, l) =>
      sum + Number(Number(l.quantity || 0) * Number(l.unit_price || 0) || 0),
    0,
  );

  const totalDiscount = lines.reduce(
    (sum, l) => sum + Number(l.discount_amount || 0),
    0,
  );

  const amount = lines.reduce((sum, l) => sum + Number(l.net_amount || 0), 0);
  const vat = lines.reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
  const amountInclVat = amount + vat;

  const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 1;
  const amountInclVatLCY = Number(amountInclVat) * rate;

  return {
    originalAmount,
    totalDiscount,
    amount,
    vat,
    amountInclVat,
    amountInclVatLCY,
  };
}

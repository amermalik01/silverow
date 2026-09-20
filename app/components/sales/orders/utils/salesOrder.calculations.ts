// utils/salesOrder.calculations.ts

import { SalesOrderLineUI, SalesOrderMasterData } from "@/types/sales-order";

export interface SalesOrderFinancials {
  originalAmount: number;
  totalDiscount: number;
  amount: number;
  vat: number;
  amountInclVat: number;
  amountInclVatLCY: number;
}

/**
 * Calculate all Sales Order financial totals from the current UI lines.
 *
 * Expected line fields:
 * - quantity
 * - unit_price
 * - discount_amount
 * - net_amount
 * - vat_amount
 */
export function calculateSalesOrderFinancials(
  lines: SalesOrderLineUI[],
  exchangeRate: number,
): SalesOrderFinancials {
  const originalAmount = lines.reduce(
    (sum, line) =>
      sum +
      Number(Number(line.quantity || 0) * Number(line.unit_price || 0) || 0),
    0,
  );

  const totalDiscount = lines.reduce(
    (sum, line) => sum + Number(line.discount_amount || 0),
    0,
  );

  const amount = lines.reduce(
    (sum, line) => sum + Number(line.net_amount || 0),
    0,
  );

  const vat = lines.reduce(
    (sum, line) => sum + Number(line.vat_amount || 0),
    0,
  );

  const amountInclVat = amount + vat;

  const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 1;

  return {
    originalAmount,
    totalDiscount,
    amount,
    vat,
    amountInclVat,
    amountInclVatLCY: amountInclVat * rate,
  };
}

export function getSelectedCurrency(
  masterData: SalesOrderMasterData | null,
  currencyId: string,
) {
  return (
    masterData?.currencies.find((currency) => currency.id === currencyId) ??
    null
  );
}

/**
 * Returns true when every ITEM line with a positive quantity
 * has been fully dispatched.
 *
 * GL Account lines do not require stock dispatch.
 */
export function isSalesOrderFullyDispatched(
  lines: SalesOrderLineUI[],
): boolean {
  if (lines.length === 0) return false;

  const itemLines = lines.filter(
    (line) => (line.line_type || "ITEM") === "ITEM",
  );

  if (itemLines.length === 0) return false;

  return itemLines.every((line) => {
    const quantity = Number(line.quantity || 0);
    const dispatchedQuantity = Number(line.quantity_shipped || 0);

    return quantity > 0 && dispatchedQuantity >= quantity;
  });
}

export function hasSelectedLineItem(lines: SalesOrderLineUI[]): boolean {
  return lines.some((line) => !!line.item_id || !!line.gl_account_id);
}

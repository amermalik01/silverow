// /app/components/sales/returns/utils/salesReturn.calculations.ts

import { SalesReturnLineUI, SalesReturnMasterData } from "@/types/sales-return";

export interface SalesReturnFinancials {
  originalAmount: number;
  totalDiscount: number;
  amount: number;
  vat: number;
  amountInclVat: number;
  amountInclVatLCY: number;
}

export function calculateSalesReturnFinancials(
  lines: SalesReturnLineUI[],
  exchangeRate: number,
): SalesReturnFinancials {
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
  masterData: SalesReturnMasterData | null,
  currencyId: string,
) {
  return (
    masterData?.currencies.find((currency) => currency.id === currencyId) ??
    null
  );
}

export function isSalesReturnFullyReceived(
  lines: SalesReturnLineUI[],
): boolean {
  if (lines.length === 0) return false;

  const itemLines = lines.filter(
    (line) => (line.line_type || "ITEM") === "ITEM",
  );

  if (itemLines.length === 0) return false;

  return itemLines.every((line) => {
    const quantity = Number(line.quantity || 0);
    const receivedQuantity = Number(line.returned_quantity || 0);

    return quantity > 0 && receivedQuantity >= quantity;
  });
}

export function hasSelectedLineItem(lines: SalesReturnLineUI[]): boolean {
  return lines.some((line) => !!line.item_id || !!line.gl_account_id);
}

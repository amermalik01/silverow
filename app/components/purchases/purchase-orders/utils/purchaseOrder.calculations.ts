// app/components/purchases/purchase-orders/utils/purchaseOrder.calculations.ts

import {
  PurchaseOrderLineUI,
  PurchaseOrderMasterData,
} from "@/types/purchase-order";

export interface PurchaseOrderFinancials {
  originalAmount: number;
  totalDiscount: number;
  amount: number;
  vat: number;
  amountInclVat: number;
  amountInclVatLCY: number;
}

export function calculatePurchaseOrderFinancials(
  lines: PurchaseOrderLineUI[],
  exchangeRate: number,
): PurchaseOrderFinancials {
  const originalAmount = lines.reduce(
    (sum, line) =>
      sum +
      Number(Number(line.quantity || 0) * Number(line.unit_cost || 0) || 0),
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
  masterData: PurchaseOrderMasterData | null,
  currencyId: string,
) {
  return (
    masterData?.currencies.find((currency) => currency.id === currencyId) ??
    null
  );
}

export function isPurchaseOrderFullyReceived(
  lines: PurchaseOrderLineUI[],
): boolean {
  if (lines.length === 0) return false;

  const itemLines = lines.filter(
    (line) => (line.line_type || "ITEM") === "ITEM",
  );

  if (itemLines.length === 0) return false;

  return itemLines.every((line) => {
    const quantity = Number(line.quantity || 0);
    const receivedQuantity = Number(line.received_quantity || 0);

    return quantity > 0 && receivedQuantity >= quantity;
  });
}

export function hasSelectedLineItem(lines: PurchaseOrderLineUI[]): boolean {
  return lines.some((line) => !!line.item_id || !!line.gl_account_id);
}

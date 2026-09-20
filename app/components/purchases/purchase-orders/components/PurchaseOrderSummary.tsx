// components/PurchaseOrderSummary.tsx

"use client";

import NumericTextInput from "@/components/ui/NumericTextInput";

import { PurchaseOrderFinancials } from "../utils/purchaseOrder.calculations";

interface Props {
  financials: PurchaseOrderFinancials;
  currencyCode?: string;
  baseCurrencyCode: string;
  exchangeRate: number;
  disabled: boolean;
  setExchangeRate: (value: number) => void;
  inputStyle: string;
}

export default function PurchaseOrderSummary({
  financials,
  currencyCode,
  baseCurrencyCode,
  exchangeRate,
  disabled,
  setExchangeRate,
  inputStyle,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 space-x-4 gap-4 items-end">
      {/* Conversion rate */}

      {/* LCY amount */}

      {/* Financial totals */}
    </div>
  );
}

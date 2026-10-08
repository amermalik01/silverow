// app/components/setup/opening-balances/bank/components/BankOpeningBalanceToolbar.tsx

"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onSelectSupplier: () => void;
  onSelectCustomer: () => void;
};

export default function BankOpeningBalanceToolbar({
  onSelectSupplier,
  onSelectCustomer,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs"
        onClick={onSelectSupplier}
      >
        Select Suppliers
      </Button>

      <Button
        type="button"
        variant="outline"
        className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs"
        onClick={onSelectCustomer}
      >
        Select Customers
      </Button>
    </div>
  );
}

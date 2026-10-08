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
    <div className="flex flex-wrap gap-2 justify-end">
      <Button
        type="button"
        variant="add_line"
        onClick={onSelectSupplier}
      >
        Select Suppliers
      </Button>

      <Button
        type="button"
        variant="add_line"
        onClick={onSelectCustomer}
      >
        Select Customers
      </Button>
    </div>
  );
}

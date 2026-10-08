// app/components/setup/opening-balances/customer/components/CustomerOpeningBalanceToolbar.tsx

"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onSelectCustomer: () => void;
};

export default function CustomerOpeningBalanceToolbar({
  onSelectCustomer,
}: Props) {
  return (
    <div className="flex gap-2 justify-end">
      <Button
        type="button"
        variant="add_line"
        onClick={onSelectCustomer}
      >
        Select Customer
      </Button>
    </div>
  );
}

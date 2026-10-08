// app/components/setup/opening-balances/supplier/components/SupplierOpeningBalanceToolbar.tsx

"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onSelectSupplier: () => void;
};

export default function SupplierOpeningBalanceToolbar({
  onSelectSupplier,
}: Props) {
  return (
    <div className="flex gap-2 justify-end">
      <Button
        type="button"
        variant="add_line"
        onClick={onSelectSupplier}
      >
        Select Supplier
      </Button>
    </div>
  );
}

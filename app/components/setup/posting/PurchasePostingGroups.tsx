// app/components/setup/posting/PurchasePostingGroups.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function PurchasePostingGroupsPage() {
  const [accountOptions, setAccountOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setup/finance/accounts/options")
      .then((r) => r.json())
      .then((data) => setAccountOptions(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="p-4 text-sm text-gray-500">Loading configurations...</div>
    );

  return (
    <SetupDataGrid
      title="Purchase Posting Groups"
      api="/api/setup/posting/purchase-groups"
      fields={[
        { name: "name", label: "Group Name", required: true },
        {
          name: "payable_account_id",
          label: "Payable Account",
          type: "select",
          options: accountOptions,
          required: true,
        },
        {
          name: "purchase_account_id",
          label: "Purchase Account",
          type: "select",
          options: accountOptions,
          required: true,
        },
        {
          name: "discount_account_id",
          label: "Discount Account",
          type: "select",
          options: accountOptions,
        },
        {
          name: "vat_account_id",
          label: "VAT Account",
          type: "select",
          options: accountOptions,
        },
        {
          name: "inventory_account_id",
          label: "Inventory Account",
          type: "select",
          options: accountOptions,
        },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "payable_account", label: "Payable Account" },
        { name: "purchase_account", label: "Purchase Account" },
        { name: "discount_account", label: "Discount Account" },
        { name: "vat_account", label: "VAT Account" },
        { name: "inventory_account", label: "Inventory Account" },
      ]}
    />
  );
}

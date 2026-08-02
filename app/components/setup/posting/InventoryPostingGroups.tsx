// app/components/setup/posting/InventoryPostingGroups.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function InventoryPostingGroupsPage() {
  const [accountOptions, setAccountOptions] = useState([]);
  const [isPerpetual, setIsPerpetual] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/setup/finance/accounts/options").then((r) => r.json()),
      fetch("/api/setup/posting/inventory-system").then((r) => r.json()),
    ])
      .then(([accounts, systemStatus]) => {
        setAccountOptions(accounts);
        setIsPerpetual(systemStatus?.inventory_system === "PERPETUAL");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="p-4 text-xs text-gray-500">Loading configurations...</div>
    );

  return (
    <SetupDataGrid
      title="Inventory Posting Groups"
      api="/api/setup/posting/inventory-groups"
      fields={[
        { name: "name", label: "Group Name", required: true },
        {
          name: "inventory_account_id",
          label: "Asset Account (Balance Sheet)",
          type: "select",
          options: accountOptions,
          required: isPerpetual,
        },
        {
          name: "cogs_account_id",
          label: "COGS Account (Income Statement)",
          type: "select",
          options: accountOptions,
          required: isPerpetual,
        },
        {
          name: "adjustment_account_id",
          label: "Inventory Adjustment Account",
          type: "select",
          options: accountOptions,
        },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "inventory_account", label: "Inventory Asset Account" },
        { name: "cogs_account", label: "COGS Account" },
        { name: "adjustment_account", label: "Adjustment Account" },
      ]}
    />
  );
}

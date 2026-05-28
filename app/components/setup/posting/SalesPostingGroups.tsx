// app/components/setup/posting/SalesPostingGroups.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function SalesPostingGroupsPage() {
  const [accountOptions, setAccountOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setup/finance/accounts/options")
      .then((r) => r.json())
      .then((data) => setAccountOptions(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading configurations...</div>;

  return (
    <SetupDataGrid
      title="Sales Posting Groups"
      api="/api/setup/posting/sales-groups"
      fields={[
        { name: "name", label: "Group Name", required: true },
        { name: "receivable_account_id", label: "Receivable Account", type: "select", options: accountOptions, required: true },
        { name: "sales_account_id", label: "Sales Account", type: "select", options: accountOptions, required: true },
        { name: "discount_account_id", label: "Discount Account", type: "select", options: accountOptions },
        { name: "vat_account_id", label: "VAT Account", type: "select", options: accountOptions },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "receivable_account", label: "Receivable Account" },
        { name: "sales_account", label: "Sales Account" },
        { name: "discount_account", label: "Discount Account" },
        { name: "vat_account", label: "VAT Account" },
      ]}
    />
  );
}

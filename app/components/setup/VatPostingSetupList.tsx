// app/components/setup/VatPostingSetupList.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid, { Field } from "@/app/components/setup/SetupDataGrid";

type RawGroup = { id: string; name: string };

export default function VATPostingSetupPage() {
  const [bizOptions, setBizOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [prodOptions, setProdOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDropdownData() {
      try {
        setLoadingOptions(true);

        // Fetch data from both relational setup endpoints concurrently
        const [bizRes, prodRes] = await Promise.all([
          fetch("/api/setup/vat-business-posting-groups"), // Update endpoint if named differently
          fetch("/api/setup/vat-product-posting-groups"),
        ]);

        if (!bizRes.ok || !prodRes.ok) {
          throw new Error(
            "Failed to load dependency relations for posting setup matrix.",
          );
        }

        const bizData: RawGroup[] = await bizRes.json();
        const prodData: RawGroup[] = await prodRes.json();

        // Transform them into the shape the DataGrid expects
        setBizOptions(bizData.map((g) => ({ value: g.id, label: g.name })));
        setProdOptions(prodData.map((g) => ({ value: g.id, label: g.name })));
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadDropdownData();
  }, []);

  if (loadingOptions) {
    return (
      <div className="p-6 text-gray-500">
        Loading master group dependencies...
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 font-medium">Error: {error}</div>;
  }

  const dynamicFields: Field[] = [
    {
      name: "vat_business_group_id", // Changed name to match POST body payload requirement
      label: "Posting Group",
      type: "select",
      options: bizOptions,
      required: true,
    },
    {
      name: "vat_product_group_id", // Changed name to match POST body payload requirement
      label: "VAT Name",
      type: "select",
      options: prodOptions,
      required: true,
    },
    { name: "vat_rate", label: "VAT Rate (%)", type: "number", required: true },
    {
      name: "sales_vat_account_id",
      label: "Sales VAT Account (UUID)",
      type: "text",
      required: false,
    },
    {
      name: "purchase_vat_account_id",
      label: "Purchase VAT Account (UUID)",
      type: "text",
      required: false,
    },
  ];

  return (
    <SetupDataGrid
      title="VAT Posting Setup"
      api="/api/setup/vat-posting-setup"
      fields={dynamicFields}
      columns={[
        { name: "business_group", label: "Posting Group", sortable: true },
        { name: "product_group", label: "VAT Name" },
        { name: "vat_rate", label: "VAT Rate" },
        { name: "vat_posting_group", label: "VAT Posting Group Name Map" },
      ]}
    />
  );
}

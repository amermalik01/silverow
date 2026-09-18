// app/components/setup/inventory/tabs/categories.tsx
"use client";

import { useEffect, useState } from "react";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { CategoryOption } from "@/types/inventory";

export default function CategoriesTab() {
  const [parents, setParents] = useState([]); //useState<CategoryOption[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParents = async () => {
      const res = await fetch("/api/setup/inventory/categories");

      const result = await res.json();

      setParents(result);
    };

    loadParents();
  }, []);

  return (
    <SetupDataGrid
      title="Categories"
      api="/api/setup/inventory/categories"
      fields={[
        { name: "code", label: "Code" },
        { name: "code_prefix", label: "Code Prefix", required: true },
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description" },
        {
          name: "parent_id",
          label: "Parent",
          type: "select",
          options: parents,
          required: true,
        },
      ]}
      columns={[
        { name: "code", label: "Code", sortable: true },
        { name: "code_prefix", label: "Code Prefix" },
        { name: "name", label: "Name", sortable: true },
        { name: "description", label: "Description", sortable: true },
        { name: "parent_id", label: "Parent" },
      ]}
    />
  );
}

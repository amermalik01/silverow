// app/components/setup/inventory/tabs/storage_types.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

type StorageType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  company_id: string | null;
};

export default function StorageTypesTab() {
  return (
    <SetupDataGrid
      title="Warehouse Storage Types"
      api="/api/setup/warehouse-storage-types"
      fields={[
        // { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        // { name: "description", label: "Description" },
        // { name: "code_prefix", label: "Scope" },
      ]}
      columns={[
        // { name: "code", label: "Code", sortable: true },
        { name: "name", label: "Name", sortable: true },
        // { name: "description", label: "Description" },
      ]}
    />
  );
}

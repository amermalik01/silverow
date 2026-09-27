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
        { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description" },
        // { name: "code_prefix", label: "Scope" },
      ]}
      columns={[
        { name: "code", label: "Code", sortable: true },
        { name: "name", label: "Name", sortable: true },
        { name: "description", label: "Description" },
      ]}
    />
  );
}
/* 
<SetupDataGrid
      title="Categories"
      api="/api/setup/warehouse-storage-types"
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
*/
// const [data, setData] = useState<StorageType[]>([]);
//   const [loading, setLoading] = useState(false);

// ---------------- FETCH ----------------
//   const fetchData = async () => {
//     setLoading(true);
//     const res = await fetch("/api/setup/warehouse-storage-types");
//     const json = await res.json();
//     setData(json);
//     setLoading(false);
//   };

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       const res = await fetch("/api/setup/warehouse-storage-types");
//       const json = await res.json();
//       setData(json);
//       setLoading(false);
//     };
//     fetchData();
//   }, []);

// app/components/setup/inventory/tabs/brands.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function BrandsTab() {

  return (
    <SetupDataGrid
      title="Brands"
      api="/api/setup/inventory/brands"
      fields={[
        { name: "code", label: "Code" },
        { name: "code_prefix", label: "Code Prefix", required: true },
        { name: "name", label: "Name", required: true },
      ]}
      columns={[
        { name: "code", label: "Code", sortable: true },
        { name: "code_prefix", label: "Code Prefix" },
        { name: "name", label: "Name", sortable: true  },
      ]}
    />
  );
}

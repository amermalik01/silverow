// app/[slug]/setup/sales/segments/page.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid"
import { setupConfig } from "@/app/config/setupConfig"

export default function Page() {
  return <SetupDataGrid {...setupConfig.salesSegments} />
}

/* import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function Page() {
  return (
    <SetupDataGrid
      title="Sales Segments"
      api="/api/setup/sales/segments"
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "module", label: "Module", type: "hidden" },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
      ]}
      defaultValues={{
        module: "sales",
      }}
    />
  );
} */

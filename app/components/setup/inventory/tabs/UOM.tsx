// app/components/setup/inventory/tabs/UOM.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function UOMTab() {

  return (
    <SetupDataGrid
      title="Unit of Measure"
      api="/api/setup/inventory/uoms"
      fields={[
        // { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        // { name: "uom_type", label: "Type", required: true },
        // { name: "decimal_places", label: "Decimal Places" },
      ]}
      columns={[
        // { name: "code", label: "Code", sortable: true },
        { name: "name", label: "Name", sortable: true  },
        // { name: "uom_type", label: "Type", sortable: true  },
        // { name: "decimal_places", label: "Decimal Places"  },
      ]}
    />
  );
}

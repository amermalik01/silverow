// app/components/setup/inventory/tabs/UOM.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function UOMTab() {

  return (
    <SetupDataGrid
      title="Unit of Measure"
      api="/api/setup/inventory/uoms"
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        { name: "uom_type", label: "Type", required: true },
        { name: "decimal_places", label: "Decimal Places" },
      ]}
      columns={[
        { name: "code", label: "Code", sortable: true },
        { name: "name", label: "Name", sortable: true  },
        { name: "uom_type", label: "Type", sortable: true  },
        { name: "decimal_places", label: "Decimal Places"  },
      ]}
    />
  );
}


// const [form, setForm] = useState<UOMFormData>({
//     code: "",
//     name: "",
//     uom_type: 1,
//     decimal_places: 2,
//     status: 1,
//   });

  /* <select
          value={form.uom_type}
          onChange={(e) =>
            setForm({
              ...form,
              uom_type: Number(e.target.value),
            })
          }
          className="border p-2 w-full"
        >
          <option value={1}>Quantity</option>

          <option value={2}>Weight</option>

          <option value={3}>Volume</option>

          <option value={4}>Length</option>
        </select> */
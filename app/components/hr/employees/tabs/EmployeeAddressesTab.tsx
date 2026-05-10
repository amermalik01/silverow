// app/components/hr/employees/tabs/EmployeeAddressesTab.tsx

"use client";

import { EmployeeAddress } from "@/types/hr/employee";

type Props = {
  addresses: EmployeeAddress[];

  setAddresses: (addresses: EmployeeAddress[]) => void;
};

export default function EmployeeAddressesTab({
  addresses,
  setAddresses,
}: Props) {
  const addRow = () => {
    setAddresses([
      ...addresses,
      {
        address_1: "",
        city: "",
        county: "",
        postcode: "",
        is_primary: false,
      },
    ]);
  };

  const updateRow = (
    index: number,
    field: keyof EmployeeAddress,
    value: EmployeeAddress[keyof EmployeeAddress],
  ) => {
    const updated = [...addresses];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setAddresses(updated);
  };

  const removeRow = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addRow}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Add Address
      </button>

      <div className="space-y-4">
        {addresses.map((row, index) => (
          <div
            key={index}
            className="border rounded p-4 grid grid-cols-2 gap-4"
          >
            <input
              placeholder="Address 1"
              value={row.address_1 || ""}
              onChange={(e) => updateRow(index, "address_1", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Address 2"
              value={row.address_2 || ""}
              onChange={(e) => updateRow(index, "address_2", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="City"
              value={row.city || ""}
              onChange={(e) => updateRow(index, "city", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="County"
              value={row.county || ""}
              onChange={(e) => updateRow(index, "county", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Postcode"
              value={row.postcode || ""}
              onChange={(e) => updateRow(index, "postcode", e.target.value)}
              className="border p-2 rounded"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.is_primary || false}
                onChange={(e) =>
                  updateRow(index, "is_primary", e.target.checked)
                }
              />
              Primary Address
            </label>

            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

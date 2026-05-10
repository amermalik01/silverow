// app/components/hr/employees/tabs/EmployeeContactsTab.tsx
"use client";

import { EmployeeContact } from "@/types/hr/employee";

type Props = {
  contacts: EmployeeContact[];

  setContacts: (contacts: EmployeeContact[]) => void;
};

export default function EmployeeContactsTab({ contacts, setContacts }: Props) {
  const addRow = () => {
    setContacts([
      ...contacts,
      {
        name: "",
        relation: "",
        phone: "",
        email: "",
        is_emergency: false,
      },
    ]);
  };

  const updateRow = (
    index: number,
    field: keyof EmployeeContact,
    value: EmployeeContact[keyof EmployeeContact],
  ) => {
    const updated = [...contacts];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setContacts(updated);
  };

  const removeRow = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addRow}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Add Contact
      </button>

      <div className="space-y-4">
        {contacts.map((row, index) => (
          <div
            key={index}
            className="border rounded p-4 grid grid-cols-2 gap-4"
          >
            <input
              placeholder="Name"
              value={row.name}
              onChange={(e) => updateRow(index, "name", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Relation"
              value={row.relation || ""}
              onChange={(e) => updateRow(index, "relation", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Phone"
              value={row.phone || ""}
              onChange={(e) => updateRow(index, "phone", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Email"
              value={row.email || ""}
              onChange={(e) => updateRow(index, "email", e.target.value)}
              className="border p-2 rounded"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.is_emergency || false}
                onChange={(e) =>
                  updateRow(index, "is_emergency", e.target.checked)
                }
              />
              Emergency Contact
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

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
      { name: "", relation: "", phone: "", email: "", is_emergency: false },
    ]);
  };

  const updateRow = <K extends keyof EmployeeContact>(
    index: number,
    field: K,
    value: EmployeeContact[K],
  ) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const removeRow = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const inputClass =
    "border border-slate-300 rounded-lg p-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-md font-semibold text-slate-800">
            Associated Contacts
          </h3>
          <p className="text-xs text-slate-500">
            Manage modern emergency and legal corporate records.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
        >
          + Append Contact Record
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-sm text-slate-500">
            No contact links associated with this record yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((row, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 shadow-sm relative group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <input
                  placeholder="Full Legal Name"
                  value={row.name}
                  onChange={(e) => updateRow(index, "name", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Kinship/Relation (e.g. Spouse)"
                  value={row.relation || ""}
                  onChange={(e) => updateRow(index, "relation", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Primary Telephone"
                  value={row.phone || ""}
                  onChange={(e) => updateRow(index, "phone", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Personal Email Address"
                  value={row.email || ""}
                  onChange={(e) => updateRow(index, "email", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={row.is_emergency || false}
                    onChange={(e) =>
                      updateRow(index, "is_emergency", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 h-4 w-4"
                  />
                  Designate Primary Crisis Contact
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  🗑️ Purge Entry
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* "use client";

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
 */

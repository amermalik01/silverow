// app/components/hr/employees/tabs/EmployeeAddressesTab.tsx

"use client";

import { Button } from "@/components/ui/button";
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
      { address_1: "", city: "", county: "", postcode: "", is_primary: false },
    ]);
  };

  const updateRow = <K extends keyof EmployeeAddress>(
    index: number,
    field: K,
    value: EmployeeAddress[K],
  ) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], [field]: value };
    setAddresses(updated);
  };

  const removeRow = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const inputClass =
    "border border-slate-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-md font-semibold text-slate-800">
            Geographic Locality Indexes
          </h3>
          <p className="text-xs text-slate-500">
            Manage payroll taxation locations and active physical addresses.
          </p>
        </div>
        <Button
          type="button"
          onClick={addRow}
          // className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
          variant="add_line"
        >
          + Append Address Index
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-xs text-slate-500">
            No physical routing indices are registered for this profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((row, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  placeholder="Address Line 1"
                  value={row.address_1 || ""}
                  onChange={(e) =>
                    updateRow(index, "address_1", e.target.value)
                  }
                  className={`${inputClass} lg:col-span-2`}
                />
                <input
                  placeholder="Address Line 2 (Optional)"
                  value={row.address_2 || ""}
                  onChange={(e) =>
                    updateRow(index, "address_2", e.target.value)
                  }
                  className={inputClass}
                />
                <input
                  placeholder="City"
                  value={row.city || ""}
                  onChange={(e) => updateRow(index, "city", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="State/County/Province"
                  value={row.county || ""}
                  onChange={(e) => updateRow(index, "county", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Postal Code / ZIP"
                  value={row.postcode || ""}
                  onChange={(e) => updateRow(index, "postcode", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={row.is_primary || false}
                    onChange={(e) =>
                      updateRow(index, "is_primary", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 h-4 w-4"
                  />
                  Mark as Headquarter/Primary Domicile
                </label>
                <Button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  🗑️ Purge Entry
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

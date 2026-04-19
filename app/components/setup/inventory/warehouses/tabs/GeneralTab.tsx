// app/components/setup/inventory/warehouses/tabs/GeneralTab.tsx

"use client";

import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Warehouse, WarehouseLocation } from "@/types/warehouse";

type Props = {
  warehouse: Warehouse;
  setWarehouse: (val: Warehouse | ((prev: Warehouse) => Warehouse)) => void;
  locations: WarehouseLocation[];
};

export default function GeneralTab({
  warehouse,
  setWarehouse,
  locations,
}: Props) {
  const primaryLocationName = locations.find(
    (l) => l.id === warehouse.primary_location_id,
  )?.title;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* CODE (READ ONLY) */}
      <div className="col-span-2">
        <label className="text-sm text-gray-600">Code</label>
        <input
          value={warehouse.code || ""}
          disabled
          className="border p-2 w-full bg-gray-100"
        />
      </div>

      {/* NAME */}
      <div className="col-span-2">
        <label>Name</label>
        <input
          value={warehouse.name || ""}
          onChange={(e) => setWarehouse({ ...warehouse, name: e.target.value })}
          className="border p-2 w-full"
        />
      </div>

      {/* TYPE */}
      <div>
        <label>Type</label>
        <select
          value={warehouse.type}
          onChange={(e) =>
            setWarehouse({
              ...warehouse,
              type: e.target.value as Warehouse["type"],
            })
          }
          className="border p-2 w-full"
        >
          <option value="DISTRIBUTION">Distribution</option>
          <option value="STORE">Store</option>
          <option value="TRANSIT">Transit</option>
          <option value="COLD_STORAGE">Cold Storage</option>
        </select>
      </div>

      {/* STATUS */}
      <div>
        <label>Status</label>
        <select
          value={warehouse.status}
          onChange={(e) =>
            setWarehouse({
              ...warehouse,
              status: Number(e.target.value),
            })
          }
          className="border p-2 w-full"
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </div>

      {/* CURRENCY */}
      <div>
        <label>Currency</label>
        <MasterDropdown
          type="currency"
          value={warehouse.currency_id}
          onChange={(val) => setWarehouse({ ...warehouse, currency_id: val })}
        />
      </div>

      {/* STORAGE TYPE */}
      <div>
        <label>Storage Type ID</label>
        <MasterDropdown
          type="storage_type"
          value={warehouse.storage_type_id}
          onChange={(val) =>
            setWarehouse({ ...warehouse, storage_type_id: val })
          }
        />
      </div>

      {/* PRIMARY LOCATION */}
      <div>
        <label>Primary Location</label>
      <div className="text-sm text-gray-600 mt-1">
        Current Primary:{" "}
        <span className="font-medium">
          {primaryLocationName || "Not selected"}
        </span>
      </div>

        <select
          value={warehouse.primary_location_id || ""}
          onChange={(e) =>
            setWarehouse({
              ...warehouse,
              primary_location_id: e.target.value || null,
            })
          }
          className="border p-2 w-full"
        >
          <option value="">Select Primary Location</option>

          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* "use client";

import { Warehouse } from "@/types/warehouse";

type Props = {
  warehouse: Warehouse;
  setWarehouse: (val: Warehouse | ((prev: Warehouse) => Warehouse)) => void;
};

export default function GeneralTab({ warehouse, setWarehouse }: Props) {
  return (
    <div className="space-y-4">
      <input
        value={warehouse.name || ""}
        onChange={(e) => setWarehouse({ ...warehouse, name: e.target.value })}
        placeholder="Warehouse Name"
        className="border p-2 w-full"
      />

      <input
        value={warehouse.code || ""}
        onChange={(e) => setWarehouse({ ...warehouse, code: e.target.value })}
        placeholder="Code"
        className="border p-2 w-full"
      />
    </div>
  );
} */

// app/components/setup/inventory/warehouses/tabs/GeneralTab.tsx

"use client";

import { useEffect, useState } from "react";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Warehouse, WarehouseLocation } from "@/types/warehouse";

type StorageType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  company_id: string | null;
};

type Props = {
  warehouse: Warehouse;
  setWarehouse: (val: Warehouse | ((prev: Warehouse) => Warehouse)) => void;
  locations: WarehouseLocation[];
  isReadOnly?: boolean;
};

export default function GeneralTab({
  warehouse,
  setWarehouse,
  locations,
  isReadOnly = false,
}: Props) {
  const [storageTypes, setStorageTypes] = useState<StorageType[]>([]);
  const [loadingStorageTypes, setLoadingStorageTypes] = useState<boolean>(true);

  useEffect(() => {
    const fetchStorageTypes = async () => {
      try {
        const res = await fetch("/api/setup/warehouse-storage-types");
        if (res.ok) {
          const json = await res.json();
          setStorageTypes(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        console.error("Failed to fetch storage types:", err);
      } finally {
        setLoadingStorageTypes(false);
      }
    };

    fetchStorageTypes();
  }, []);

  const updateField = <K extends keyof Warehouse>(
    field: K,
    value: Warehouse[K],
  ) => {
    if (isReadOnly) return;
    setWarehouse((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = `w-full px-2 py-1 rounded border text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    isReadOnly
      ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
      : "bg-white border-slate-300 text-slate-900"
  }`;

  const labelClass = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="space-y-6">
      {/* Upper Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        {/* Left Column: Warehouse & Address */}
        <div className="space-y-3.5 col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Warehouse Identification
            </h3>

            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              <input
                type="checkbox"
                checked={Boolean(warehouse.is_default)}
                onChange={(e) => updateField("is_default", e.target.checked)}
                disabled={isReadOnly}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-xs font-semibold text-slate-700">
                Default Company Warehouse
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Warehouse No.</label>
            <input
              value={warehouse.code || ""}
              disabled
              className="w-full px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-600 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={warehouse.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Address Line 1</label>
            <input
              value={warehouse.address_line_1 || ""}
              onChange={(e) => updateField("address_line_1", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Address Line 2</label>
            <input
              value={warehouse.address_line_2 || ""}
              onChange={(e) => updateField("address_line_2", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>City / Town</label>
              <input
                value={warehouse.city || ""}
                onChange={(e) => updateField("city", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>County / State</label>
              <input
                value={warehouse.county || ""}
                onChange={(e) => updateField("county", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Postcode</label>
              <input
                value={warehouse.postcode || ""}
                onChange={(e) => updateField("postcode", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Country</label>
              <input
                value={warehouse.country || "United Kingdom"}
                onChange={(e) => updateField("country", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Telephone</label>
              <input
                value={warehouse.telephone || ""}
                onChange={(e) => updateField("telephone", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Fax</label>
              <input
                value={warehouse.fax || ""}
                onChange={(e) => updateField("fax", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>
              Warehouse Storage Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={warehouse.warehouse_storage_type || warehouse.type || ""}
              onChange={(e) =>
                updateField("warehouse_storage_type", e.target.value)
              }
              disabled={isReadOnly || loadingStorageTypes}
              className={inputClass}
            >
              <option value="">
                {loadingStorageTypes
                  ? "Loading storage types..."
                  : "Select Storage Type"}
              </option>
              {storageTypes.map((st) => (
                <option key={st.id} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>
              Warehouse Storage Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={warehouse.warehouse_storage_type || warehouse.type || "DISTRIBUTION"}
              onChange={(e) => updateField("type", e.target.value as Warehouse["type"])}
              disabled={isReadOnly}
              className={inputClass}
            >
              <option value="DISTRIBUTION">Outsourced</option>
              <option value="STORE">In-House Store</option>
              <option value="TRANSIT">Transit</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="COLD_STORAGE">Cold Storage</option>
            </select>
          </div> */}
        </div>
        <div className="space-y-3.5"></div>

        {/* Right Column: Primary Contact */}
        <div className="space-y-3.5 col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Primary Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <input
              value={warehouse.contact_person || ""}
              onChange={(e) => updateField("contact_person", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Job Title</label>
            <input
              value={warehouse.job_title || ""}
              onChange={(e) => updateField("job_title", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Direct Line</label>
            <input
              value={warehouse.direct_line || ""}
              onChange={(e) => updateField("direct_line", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Mobile</label>
            <input
              value={warehouse.mobile || ""}
              onChange={(e) => updateField("mobile", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={warehouse.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(warehouse.e_dispatch_email)}
                onChange={(e) =>
                  updateField("e_dispatch_email", e.target.checked)
                }
                disabled={isReadOnly}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-xs text-slate-700 font-medium">
                E-Dispatch Email Notification
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Storage Configuration & Costs */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
          Storage Setup & Costing
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>
                Primary Storage Location{" "}
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouse.primary_location_id || ""}
                onChange={(e) =>
                  updateField("primary_location_id", e.target.value || null)
                }
                disabled={isReadOnly}
                className={inputClass}
              >
                <option value="">Select Primary Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Parent Storage Location</label>
              <select
                value={warehouse.parent_location_id || ""}
                onChange={(e) =>
                  updateField("parent_location_id", e.target.value || null)
                }
                disabled={isReadOnly}
                className={inputClass}
              >
                <option value="">Select Parent Storage Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={warehouse.start_date || ""}
                onChange={(e) => updateField("start_date", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <input
                value={warehouse.unit_of_measure || "Pcs"}
                onChange={(e) => updateField("unit_of_measure", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>
                Cost Frequency <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouse.cost_frequency || "Weekly"}
                onChange={(e) => updateField("cost_frequency", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Annually">Annually</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                <label className={labelClass}>Currency</label>
                <MasterDropdown
                  type="currency"
                  value={warehouse.currency_id}
                  onChange={(val) => updateField("currency_id", val)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                <label className={labelClass}>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={warehouse.cost || ""}
                  onChange={(e) => updateField("cost", e.target.value)}
                  disabled={isReadOnly}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <label className={labelClass}>Comments</label>
              <textarea
                rows={2}
                value={warehouse.comments || ""}
                onChange={(e) => updateField("comments", e.target.value)}
                disabled={isReadOnly}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* "use client";

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

      <div className="col-span-2">
        <label className="text-xs text-gray-600">Code</label>
        <input
          value={warehouse.code || ""}
          disabled
          className="border p-2 w-full bg-gray-100"
        />
      </div>


      <div className="col-span-2">
        <label>Name</label>
        <input
          value={warehouse.name || ""}
          onChange={(e) => setWarehouse({ ...warehouse, name: e.target.value })}
          className="border p-2 w-full"
        />
      </div>


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


      <div>
        <label>Currency</label>
        <MasterDropdown
          type="currency"
          value={warehouse.currency_id}
          onChange={(val) => setWarehouse({ ...warehouse, currency_id: val })}
        />
      </div>


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

 
      <div>
        <label>Primary Location</label>
      <div className="text-xs text-gray-600 mt-1">
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
} */

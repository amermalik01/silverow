// app/components/inventory/items/tabs/WarehouseTab.tsx

"use client";

import { useEffect, useState } from "react";
import type {
  ItemWarehouseDraft,
  WarehouseOption,
  StorageLocationOption,
} from "@/types/inventory";

import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

type Props = {
  warehouses?: ItemWarehouseDraft[]; // Made optional to prevent runtime crashes
  setWarehouses: React.Dispatch<React.SetStateAction<ItemWarehouseDraft[]>>;
  errors?: Record<string, string>;
  isReadonly?: boolean;
};

export default function WarehouseTab({
  warehouses = [], // Default to empty array if undefined
  setWarehouses,
  errors = {},
  isReadonly = false,
}: Props) {
  const [warehouseList, setWarehouseList] = useState<WarehouseOption[]>([]);
  const [locationList, setLocationList] = useState<StorageLocationOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  useEffect(() => {
    async function fetchLookups() {
      try {
        setLoadingLookups(true);
        const [resWrh, resLoc] = await Promise.all([
          fetch("/api/inventory/warehouses"),
          fetch("/api/inventory/warehouse-locations"),
        ]);

        if (resWrh.ok) {
          const wrhData = await resWrh.json();
          // Support both data: [] and warehouses: [] payload structures
          setWarehouseList(wrhData.data || wrhData.warehouses || []);
        }
        if (resLoc.ok) {
          const locData = await resLoc.json();
          setLocationList(locData.data || locData.locations || []);
        }
      } catch (err) {
        console.error("Failed to load warehouse lookups:", err);
      } finally {
        setLoadingLookups(false);
      }
    }

    fetchLookups();
  }, []);

  const addWarehouseRow = () => {
    const currentList = warehouses || [];
    setWarehouses([
      ...currentList,
      {
        warehouse_id: "",
        storage_location_id: "",
        unit_of_measure: "Pcs",
        cost_frequency: "Weekly",
        currency: "GBP",
        cost: "0.00",
        is_default: currentList.length === 0,
        status: 1,
        start_date: format(new Date(), "yyyy-MM-dd"),
        comments: "",
      },
    ]);
  };

  const updateWarehouseRow = <K extends keyof ItemWarehouseDraft>(
    idx: number,
    key: K,
    val: ItemWarehouseDraft[K],
  ) => {
    setWarehouses((prev = []) =>
      prev.map((item, i) => {
        if (i !== idx) return item;

        const updated = { ...item, [key]: val };

        if (key === "warehouse_id") {
          updated.storage_location_id = "";
        }

        if (key === "storage_location_id") {
          const matchedLoc = locationList.find((loc) => loc.id === val);
          if (matchedLoc) {
            updated.cost_frequency =
              matchedLoc.cost_frequency || updated.cost_frequency;
            updated.unit_of_measure =
              matchedLoc.unit_of_measure || updated.unit_of_measure;
            updated.currency = matchedLoc.currency || updated.currency;
            updated.cost =
              matchedLoc.cost !== undefined ? matchedLoc.cost : updated.cost;
          }
        }

        return updated;
      }),
    );
  };

  const handleSetDefault = (targetIdx: number) => {
    setWarehouses((prev = []) =>
      prev.map((item, i) => ({
        ...item,
        is_default: i === targetIdx,
      })),
    );
  };

  const removeRow = (idx: number) => {
    const currentList = warehouses || [];
    const isRemovingDefault = currentList[idx]?.is_default;
    const filtered = currentList.filter((_, i) => i !== idx);

    if (isRemovingDefault && filtered.length > 0) {
      filtered[0].is_default = true;
    }

    setWarehouses(filtered);
  };

  // Safe reference for rendering
  const activeWarehouses = warehouses || [];

  return (
    <div className="space-y-6">
      {/* Top Header Summary Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-4">
        {/* <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300 font-medium">
          <span>
            On Route Stock:{" "}
            <strong className="text-slate-900 dark:text-white">0</strong>
          </span>
          <span>
            Total Stock:{" "}
            <strong className="text-slate-900 dark:text-white">0</strong>
          </span>
          <span>
            Available Stock:{" "}
            <strong className="text-slate-900 dark:text-white">0</strong>
          </span>
          <span>
            Allocated Stock:{" "}
            <strong className="text-slate-900 dark:text-white">0</strong>
          </span>
        </div> */}

        {!isReadonly && (
          <button
            type="button"
            onClick={addWarehouseRow}
            disabled={loadingLookups}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            // className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm disabled:opacity-50"
          >
            Add Warehouse
          </button>
        )}
      </div>

      {activeWarehouses.length === 0 && (
        <div className="p-8 text-center text-xs border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No warehouse assignments established for this item.
        </div>
      )}

      {/* Warehouse Cards List */}
      {activeWarehouses.map((w, idx) => {
        const filteredLocations = locationList.filter(
          (loc) => loc.warehouse_id === w.warehouse_id,
        );

        return (
          <div
            key={idx}
            className="relative rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden text-xs shadow-sm"
          >
            {/* Row Header */}
            <div className="flex items-center justify-between font-medium px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Location Assignment #{idx + 1}
                </span>

                {w.is_default && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Default Warehouse
                  </span>
                )}
              </div>

              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition"
                  title="Remove location assignment"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 p-4">
              {/* Left Column */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={isReadonly}
                    value={w.warehouse_id || ""}
                    onChange={(e) =>
                      updateWarehouseRow(idx, "warehouse_id", e.target.value)
                    }
                    className={`col-span-2 p-2 rounded border ${
                      errors[`warehouses.${idx}.warehouse_id`]
                        ? "border-red-500"
                        : "border-slate-300 dark:border-slate-700"
                    } dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouseList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Storage Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={isReadonly || !w.warehouse_id}
                    value={w.storage_location_id || ""}
                    onChange={(e) =>
                      updateWarehouseRow(
                        idx,
                        "storage_location_id",
                        e.target.value,
                      )
                    }
                    className="col-span-2 p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Location...</option>
                    {filteredLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>

                  <DatePicker
                    value={w.start_date ? parseISO(w.start_date) : undefined}
                    onChange={(date) =>
                      updateWarehouseRow(
                        idx,
                        "start_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    disabled={isReadonly}
                    className="col-span-2 w-full bg-white text-slate-900 border border-slate-300 dark:border-slate-700 dark:bg-slate-900 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    disabled={isReadonly}
                    value={w.start_date || ""}
                    onChange={(e) =>
                      updateWarehouseRow(idx, "start_date", e.target.value)
                    }
                    className="col-span-2 p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div> */}

                <div className="grid grid-cols-3 gap-3 items-start">
                  <label className="font-medium text-slate-700 dark:text-slate-300 pt-2">
                    Comments
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadonly}
                    value={w.comments || ""}
                    onChange={(e) =>
                      updateWarehouseRow(idx, "comments", e.target.value)
                    }
                    className="col-span-2 p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    disabled={isReadonly}
                    value={w.unit_of_measure || ""}
                    onChange={(e) =>
                      updateWarehouseRow(idx, "unit_of_measure", e.target.value)
                    }
                    className="col-span-2 p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Cost Frequency
                  </label>
                  <select
                    disabled={isReadonly}
                    value={w.cost_frequency || "Weekly"}
                    onChange={(e) =>
                      updateWarehouseRow(idx, "cost_frequency", e.target.value)
                    }
                    className="col-span-2 p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Currency / Cost
                  </label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      disabled={isReadonly}
                      placeholder="GBP"
                      value={w.currency || ""}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "currency", e.target.value)
                      }
                      className="p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900 capitalize"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      disabled={isReadonly}
                      placeholder="0.00"
                      value={w.cost ?? ""}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "cost", e.target.value)
                      }
                      className="p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Default / Status
                  </label>
                  <div className="col-span-2 flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="default_warehouse_radio"
                        disabled={isReadonly}
                        checked={!!w.is_default}
                        onChange={() => handleSetDefault(idx)}
                        className="w-4 h-4 text-blue-600"
                      />
                      Default
                    </label>

                    <select
                      disabled={isReadonly}
                      value={w.status ?? 1}
                      onChange={(e) =>
                        updateWarehouseRow(
                          idx,
                          "status",
                          Number(e.target.value),
                        )
                      }
                      className="p-2 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

import { WarehouseStock } from "@/types/inventory";

type Props = {
  itemId: string;
};

export default function WarehouseTab({
  itemId,
}: Props) {
  const [rows, setRows] = useState<
    WarehouseStock[]
  >([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/inventory/items/${itemId}/warehouse-stock`,
      );

      const data: WarehouseStock[] =
        await res.json();

      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Warehouse Stock
        </h2>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">
                Warehouse
              </th>

              <th className="p-3 text-left">
                Location
              </th>

              <th className="p-3 text-left">
                Batch
              </th>

              <th className="p-3 text-left">
                Serial
              </th>

              <th className="p-3 text-right">
                Quantity
              </th>

              <th className="p-3 text-right">
                Reserved
              </th>

              <th className="p-3 text-right">
                Available
              </th>

              <th className="p-3 text-right">
                Avg Cost
              </th>

              <th className="p-3 text-left">
                Last Movement
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center text-gray-500"
                  >
                    No stock found
                  </td>
                </tr>
              )}

            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t"
              >
                <td className="p-3">
                  {row.warehouse_name}
                </td>

                <td className="p-3">
                  {row.location_name || "-"}
                </td>

                <td className="p-3">
                  {row.batch_no || "-"}
                </td>

                <td className="p-3">
                  {row.serial_no || "-"}
                </td>

                <td className="p-3 text-right">
                  {Number(
                    row.quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {Number(
                    row.reserved_quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right font-medium">
                  {Number(
                    row.available_quantity,
                  ).toFixed(2)}
                </td>

                <td className="p-3 text-right">
                  {row.average_cost
                    ? Number(
                        row.average_cost,
                      ).toFixed(2)
                    : "-"}
                </td>

                <td className="p-3">
                  {row.last_movement_at
                    ? new Date(
                        row.last_movement_at,
                      ).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
} */

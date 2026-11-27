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
import { Icon } from "@iconify/react";
import NumericTextInput from "@/components/ui/NumericTextInput";
import {
  cardClass,
  fieldInputClass,
  fieldLabelClass,
  fieldRowClass,
  getInputClass,
  pillClass,
  primaryButtonClass,
  sectionIconClass,
} from "./itemStyles";

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
  const ro = isReadonly;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100">
          <Icon icon="tabler:building-warehouse" className={sectionIconClass} />
          <span>Warehouse Locations &amp; Cost</span>
          <span className={pillClass}>
            {activeWarehouses.length}{" "}
            {activeWarehouses.length === 1 ? "location" : "locations"}
          </span>
        </div>

        {!ro && (
          <button
            type="button"
            onClick={addWarehouseRow}
            disabled={loadingLookups}
            className={primaryButtonClass}
          >
            <Icon icon="tabler:plus" className="text-base" />
            Add Warehouse
          </button>
        )}
      </div>

      {activeWarehouses.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400">
          <Icon
            icon="tabler:building-warehouse"
            className="mx-auto mb-2 text-3xl text-slate-300 dark:text-slate-600"
          />
          No warehouse assignments established for this item.
        </div>
      )}

      {activeWarehouses.map((w, idx) => {
        const filteredLocations = locationList.filter(
          (loc) => loc.warehouse_id === w.warehouse_id,
        );
        const warehouse = warehouseList.find((x) => x.id === w.warehouse_id);
        const isActive = Number(w.status ?? 1) === 1;

        return (
          <section
            key={idx}
            className={`${cardClass} p-0 overflow-hidden ${
              w.is_default ? "border-emerald-300 dark:border-emerald-800" : ""
            }`}
          >
            {/* Card header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {idx + 1}
                </span>
                <span className="truncate text-sm font-semibold text-black dark:text-slate-100">
                  {warehouse
                    ? `${warehouse.code} - ${warehouse.name}`
                    : "New location assignment"}
                </span>
                {w.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon icon="tabler:star-filled" className="h-3 w-3" />
                    Default
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-400"
                      : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {!ro && (
                <div className="flex items-center gap-1">
                  {!w.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(idx)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40"
                      title="Make this the default warehouse"
                    >
                      <Icon icon="tabler:star" className="h-3.5 w-3.5" />
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    title="Remove location assignment"
                  >
                    <Icon icon="tabler:trash" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3 p-4">
              <div className="space-y-3">
                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>
                    Warehouse <span className="text-red-500">*</span>
                  </label>
                  <div className={fieldInputClass}>
                    <select
                      disabled={ro}
                      value={w.warehouse_id || ""}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "warehouse_id", e.target.value)
                      }
                      className={getInputClass(
                        Boolean(errors[`warehouses.${idx}.warehouse_id`]),
                        ro,
                      )}
                    >
                      <option value="">Select Warehouse...</option>
                      {warehouseList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>
                    Storage Location <span className="text-red-500">*</span>
                  </label>
                  <div className={fieldInputClass}>
                    <select
                      disabled={ro || !w.warehouse_id}
                      value={w.storage_location_id || ""}
                      onChange={(e) =>
                        updateWarehouseRow(
                          idx,
                          "storage_location_id",
                          e.target.value,
                        )
                      }
                      className={getInputClass(false, ro || !w.warehouse_id)}
                    >
                      <option value="">
                        {w.warehouse_id ? "Select Location..." : "Select a warehouse first"}
                      </option>
                      {filteredLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>Start Date</label>
                  <div className={fieldInputClass}>
                    <DatePicker
                      value={w.start_date ? parseISO(w.start_date) : undefined}
                      onChange={(date) =>
                        updateWarehouseRow(
                          idx,
                          "start_date",
                          date ? format(date, "yyyy-MM-dd") : "",
                        )
                      }
                      disabled={ro}
                      className={getInputClass(false, ro)}
                    />
                  </div>
                </div>

                <div className={`${fieldRowClass} items-start`}>
                  <label className={`${fieldLabelClass} pt-1.5`}>Comments</label>
                  <div className={fieldInputClass}>
                    <textarea
                      rows={2}
                      disabled={ro}
                      value={w.comments || ""}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "comments", e.target.value)
                      }
                      placeholder="Notes for this location..."
                      className={`${getInputClass(false, ro)} resize-none`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>Unit of Measure</label>
                  <div className={fieldInputClass}>
                    <input
                      type="text"
                      disabled={ro}
                      value={w.unit_of_measure || ""}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "unit_of_measure", e.target.value)
                      }
                      className={getInputClass(false, ro)}
                    />
                  </div>
                </div>

                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>Cost Frequency</label>
                  <div className={fieldInputClass}>
                    <select
                      disabled={ro}
                      value={w.cost_frequency || "Weekly"}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "cost_frequency", e.target.value)
                      }
                      className={getInputClass(false, ro)}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>Currency / Cost</label>
                  <div className={`${fieldInputClass} grid grid-cols-5 gap-2`}>
                    <input
                      type="text"
                      disabled={ro}
                      placeholder="GBP"
                      maxLength={3}
                      value={w.currency || ""}
                      onChange={(e) =>
                        updateWarehouseRow(
                          idx,
                          "currency",
                          e.target.value.toUpperCase(),
                        )
                      }
                      className={`${getInputClass(false, ro)} col-span-2 uppercase`}
                    />
                    <div className="col-span-3">
                      <NumericTextInput
                        allowDecimals
                        decimalScale={2}
                        disabled={ro}
                        value={Number(w.cost)}
                        onChange={(val) =>
                          updateWarehouseRow(idx, "cost", String(val))
                        }
                        className={`${getInputClass(false, ro)} tabular-nums font-semibold`}
                      />
                    </div>
                  </div>
                </div>

                <div className={fieldRowClass}>
                  <label className={fieldLabelClass}>Status</label>
                  <div className={fieldInputClass}>
                    <select
                      disabled={ro}
                      value={w.status ?? 1}
                      onChange={(e) =>
                        updateWarehouseRow(idx, "status", Number(e.target.value))
                      }
                      className={getInputClass(false, ro)}
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

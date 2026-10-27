// app/components/energy/sites/components/SiteBessAllocation.tsx


"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, SiteBessUnit } from "@/types/sites";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded border border-slate-200 bg-white p-2 " +
  "text-xs text-slate-800 outline-none focus:border-emerald-500 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 " +
  "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:disabled:bg-slate-800/50";

const cellClass =
  "border-t border-slate-100 p-2 dark:border-slate-800/60";

export default function SiteBessAllocation({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addUnit = () => {
    const unit: SiteBessUnit = {
      brand: "",
      model: "",
      serial_no: "",
      capacity_kw: null,
      capacity_kwh: null,
      allocation_date: "",
      notes: "",
    };

    setSiteRec((prev) => ({
      ...prev,
      bess_units: [...prev.bess_units, unit],
    }));
  };

  const updateUnit = (
    index: number,
    changes: Partial<SiteBessUnit>,
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      bess_units: prev.bess_units.map((unit, i) =>
        i === index ? { ...unit, ...changes } : unit,
      ),
    }));
  };

  const removeUnit = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      bess_units: prev.bess_units.filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          BESS Allocation
        </h3>

        {!isReadonly && (
          <button
            type="button"
            onClick={addUnit}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Icon icon="lucide:plus" />
            Allocate BESS
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="w-16 p-3">#</th>
              <th className="w-[13%] p-3">Brand</th>
              <th className="w-[13%] p-3">Model</th>
              <th className="w-[17%] p-3">
                Serial Number <span className="text-red-500">*</span>
              </th>
              <th className="w-[12%] p-3">Power (kW)</th>
              <th className="w-[12%] p-3">Capacity (kWh)</th>
              <th className="w-[15%] p-3">Allocation Date</th>
              {!isReadonly && (
                <th className="w-16 p-3 text-center">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {site.bess_units.length === 0 ? (
              <tr>
                <td
                  colSpan={isReadonly ? 7 : 8}
                  className="p-8 text-center text-xs text-slate-400"
                >
                  No BESS units allocated to this site.
                </td>
              </tr>
            ) : (
              site.bess_units.map((unit, index) => (
                <tr
                  key={unit.id ?? `bess-${index}`}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <td className={cellClass}>
                    <span className="font-medium">{index + 1}</span>
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      value={unit.brand}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateUnit(index, { brand: e.target.value })
                      }
                      className={inputClass}
                    />
                    {errors[`bess_units.${index}.brand`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`bess_units.${index}.brand`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      value={unit.model}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateUnit(index, { model: e.target.value })
                      }
                      className={inputClass}
                    />
                    {errors[`bess_units.${index}.model`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`bess_units.${index}.model`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      value={unit.serial_no}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateUnit(index, {
                          serial_no: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                    {errors[`bess_units.${index}.serial_no`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`bess_units.${index}.serial_no`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <NumericTextInput
                      allowDecimals
                      decimalScale={3}
                      min={0}
                      value={unit.capacity_kw ?? 0}
                      disabled={isReadonly}
                      onChange={(value) =>
                        updateUnit(index, {
                          capacity_kw: value,
                        })
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className={cellClass}>
                    <NumericTextInput
                      allowDecimals
                      decimalScale={3}
                      min={0}
                      value={unit.capacity_kwh ?? 0}
                      disabled={isReadonly}
                      onChange={(value) =>
                        updateUnit(index, {
                          capacity_kwh: value,
                        })
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className={cellClass}>
                    <input
                      type="date"
                      value={unit.allocation_date}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateUnit(index, {
                          allocation_date: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </td>

                  {!isReadonly && (
                    <td className={`${cellClass} text-center`}>
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        aria-label={`Remove BESS unit ${index + 1}`}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                      >
                        <Icon icon="lucide:trash-2" className="text-base" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {site.bess_units.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Allocation Notes
          </h4>

          <div className="grid grid-cols-1 gap-x-12 gap-y-3 lg:grid-cols-2">
            {site.bess_units.map((unit, index) => (
              <div
                key={unit.id ?? `bess-notes-${index}`}
                className="grid grid-cols-3 items-start gap-2"
              >
                <label className="pt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Unit {index + 1} Notes
                </label>

                <div className="col-span-2">
                  <textarea
                    rows={2}
                    value={unit.notes}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateUnit(index, { notes: e.target.value })
                    }
                    placeholder="Allocation remarks..."
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.bess_units && (
        <p className="text-xs text-red-500">{errors.bess_units}</p>
      )}
    </section>
  );
}


/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, SiteBessUnit } from "@/types/sites";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs " +
  "outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 " +
  "disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 " +
  "dark:disabled:bg-slate-800/50";

export default function SiteBessAllocation({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addUnit = () => {
    const unit: SiteBessUnit = {
      brand: "",
      model: "",
      serial_no: "",
      capacity_kw: null,
      capacity_kwh: null,
      allocation_date: "",
      notes: "",
    };

    setSiteRec((prev) => ({
      ...prev,
      bess_units: [...prev.bess_units, unit],
    }));
  };

  const updateUnit = (index: number, changes: Partial<SiteBessUnit>) => {
    setSiteRec((prev) => ({
      ...prev,
      bess_units: prev.bess_units.map((unit, i) =>
        i === index ? { ...unit, ...changes } : unit,
      ),
    }));
  };

  const removeUnit = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      bess_units: prev.bess_units.filter((_, i) => i !== index),
    }));
  };

  const parseNumber = (value: string): number | null =>
    value.trim() === "" ? null : Number(value);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon icon="lucide:battery-charging" className="text-emerald-600" />
            BESS Allocation
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Assign battery storage units and their serial numbers.
          </p>
        </div>

        {!isReadonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUnit}
            className="gap-1.5 text-xs"
          >
            <Icon icon="lucide:plus" />
            Allocate BESS
          </Button>
        )}
      </div>

      {site.bess_units.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <Icon
            icon="lucide:battery"
            className="mx-auto mb-2 text-2xl text-slate-400"
          />
          <p className="text-xs text-slate-500">No BESS units allocated.</p>
        </div>
      )}

      {site.bess_units.map((unit, index) => (
        <div
          key={unit.id ?? `bess-${index}`}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold">BESS Unit {index + 1}</span>

            {!isReadonly && (
              <button
                type="button"
                onClick={() => removeUnit(index)}
                className="text-rose-500 hover:text-rose-700"
                aria-label={`Remove BESS unit ${index + 1}`}
              >
                <Icon icon="lucide:trash-2" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                ["brand", "Brand"],
                ["model", "Model"],
                ["serial_no", "Serial Number"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-medium">
                  {label} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={unit[key]}
                  disabled={isReadonly}
                  onChange={(e) => updateUnit(index, { [key]: e.target.value })}
                  className={inputClass}
                />
                {errors[`bess_units.${index}.${key}`] && (
                  <p className="mt-1 text-[11px] text-rose-500">
                    {errors[`bess_units.${index}.${key}`]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Power Rating (kW)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={unit.capacity_kw ?? ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateUnit(index, {
                    capacity_kw: parseNumber(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Energy Capacity (kWh)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={unit.capacity_kwh ?? ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateUnit(index, {
                    capacity_kwh: parseNumber(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Allocation Date
              </label>
              <input
                type="date"
                value={unit.allocation_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updateUnit(index, {
                    allocation_date: e.target.value,
                  })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium">Notes</label>
            <textarea
              rows={2}
              value={unit.notes}
              disabled={isReadonly}
              onChange={(e) => updateUnit(index, { notes: e.target.value })}
              className={inputClass}
              placeholder="Allocation remarks..."
            />
          </div>
        </div>
      ))}

      {errors.bess_units && (
        <p className="text-xs text-rose-500">{errors.bess_units}</p>
      )}
    </section>
  );
} */

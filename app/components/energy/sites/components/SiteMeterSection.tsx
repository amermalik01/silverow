// app/components/energy/sites/components/SiteMeterSection.tsx


"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, SiteMeter, MeterType } from "@/types/sites";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const meterTypes: { value: MeterType; label: string }[] = [
  { value: "IMPORT", label: "Import" },
  { value: "EXPORT", label: "Export" },
  { value: "IMPORT_EXPORT", label: "Import / Export" },
  { value: "GENERATION", label: "Generation" },
  { value: "OTHER", label: "Other" },
];

const inputClass =
  "w-full rounded border border-slate-200 bg-white p-2 " +
  "text-xs text-slate-800 outline-none focus:border-emerald-500 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 " +
  "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:disabled:bg-slate-800/50";

const cellClass =
  "border-t border-slate-100 p-2 dark:border-slate-800/60";

export default function SiteMeterSection({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addMeter = () => {
    setSiteRec((prev) => {
      if (prev.meters.length >= 2) return prev;

      const meter: SiteMeter = {
        mpan_no: "",
        meter_serial_no: "",
        meter_type: "IMPORT",
        is_primary: prev.meters.length === 0,
      };

      return {
        ...prev,
        meters: [...prev.meters, meter],
      };
    });
  };

  const updateMeter = (index: number, changes: Partial<SiteMeter>) => {
    setSiteRec((prev) => ({
      ...prev,
      meters: prev.meters.map((meter, i) =>
        i === index ? { ...meter, ...changes } : meter,
      ),
    }));
  };

  const removeMeter = (index: number) => {
    setSiteRec((prev) => {
      const meters = prev.meters.filter((_, i) => i !== index);

      if (meters.length > 0 && !meters.some((m) => m.is_primary)) {
        meters[0] = { ...meters[0], is_primary: true };
      }

      return { ...prev, meters };
    });
  };

  const setPrimary = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      meters: prev.meters.map((meter, i) => ({
        ...meter,
        is_primary: i === index,
      })),
    }));
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Meter Information
        </h3>

        {!isReadonly && (
          <button
            type="button"
            onClick={addMeter}
            disabled={site.meters.length >= 2}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Icon icon="lucide:plus" />
            Add Meter
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[760px] table-fixed text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="w-20 p-3">Meter</th>
              <th className="w-[24%] p-3">
                MPAN Number <span className="text-red-500">*</span>
              </th>
              <th className="p-3">Meter Serial Number</th>
              <th className="w-[23%] p-3">Meter Type</th>
              <th className="w-20 p-3 text-center">Primary</th>
              {!isReadonly && (
                <th className="w-16 p-3 text-center">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {site.meters.length === 0 ? (
              <tr>
                <td
                  colSpan={isReadonly ? 5 : 6}
                  className="p-8 text-center text-xs text-slate-400"
                >
                  No meters assigned to this site.
                </td>
              </tr>
            ) : (
              site.meters.map((meter, index) => (
                <tr
                  key={meter.id ?? `meter-${index}`}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <td className={cellClass}>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Meter {index + 1}
                    </span>
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      value={meter.mpan_no}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateMeter(index, {
                          mpan_no: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="13-digit MPAN"
                      className={inputClass}
                    />
                    {errors[`meters.${index}.mpan_no`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`meters.${index}.mpan_no`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      value={meter.meter_serial_no}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateMeter(index, {
                          meter_serial_no: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className={cellClass}>
                    <select
                      value={meter.meter_type}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateMeter(index, {
                          meter_type: e.target.value as MeterType,
                        })
                      }
                      className={inputClass}
                    >
                      {meterTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={`${cellClass} text-center`}>
                    <input
                      type="radio"
                      name="primary-site-meter"
                      checked={meter.is_primary}
                      disabled={isReadonly}
                      onChange={() => setPrimary(index)}
                      aria-label={`Set meter ${index + 1} as primary`}
                      className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                    />
                  </td>

                  {!isReadonly && (
                    <td className={`${cellClass} text-center`}>
                      <button
                        type="button"
                        onClick={() => removeMeter(index)}
                        aria-label={`Remove meter ${index + 1}`}
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

      {errors.meters && (
        <p className="text-xs text-red-500">{errors.meters}</p>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Maximum two meters per site. Select one as the primary meter.
      </p>
    </section>
  );
}


/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, SiteMeter, MeterType } from "@/types/sites";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const meterTypes: { value: MeterType; label: string }[] = [
  { value: "IMPORT", label: "Import" },
  { value: "EXPORT", label: "Export" },
  { value: "IMPORT_EXPORT", label: "Import / Export" },
  { value: "GENERATION", label: "Generation" },
  { value: "OTHER", label: "Other" },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs " +
  "text-slate-900 outline-none focus:border-emerald-500 " +
  "focus:ring-1 focus:ring-emerald-500 " +
  "disabled:bg-slate-50 disabled:text-slate-500 " +
  "dark:border-slate-700 dark:bg-slate-900 " +
  "dark:text-slate-100 dark:disabled:bg-slate-800/50";

export default function SiteMeterSection({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addMeter = () => {
    if (site.meters.length >= 2) return;

    const newMeter: SiteMeter = {
      mpan_no: "",
      meter_serial_no: "",
      meter_type: "IMPORT",
      is_primary: site.meters.length === 0,
    };

    setSiteRec((prev) => ({
      ...prev,
      meters: [...prev.meters, newMeter],
    }));
  };

  const updateMeter = (index: number, changes: Partial<SiteMeter>) => {
    setSiteRec((prev) => ({
      ...prev,
      meters: prev.meters.map((meter, i) =>
        i === index ? { ...meter, ...changes } : meter,
      ),
    }));
  };

  const removeMeter = (index: number) => {
    setSiteRec((prev) => {
      const meters = prev.meters.filter((_, i) => i !== index);

      if (meters.length > 0 && !meters.some((m) => m.is_primary)) {
        meters[0] = { ...meters[0], is_primary: true };
      }

      return { ...prev, meters };
    });
  };

  const setPrimary = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      meters: prev.meters.map((meter, i) => ({
        ...meter,
        is_primary: i === index,
      })),
    }));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Icon icon="lucide:gauge" className="text-emerald-600" />
            Meter Information
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Configure up to two electricity meters for this site.
          </p>
        </div>

        {!isReadonly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={site.meters.length >= 2}
            onClick={addMeter}
            className="gap-1.5 text-xs"
          >
            <Icon icon="lucide:plus" />
            Add Meter
          </Button>
        )}
      </div>

      {site.meters.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <Icon
            icon="lucide:gauge"
            className="mx-auto mb-2 text-2xl text-slate-400"
          />
          <p className="text-xs text-slate-500">
            No meters have been assigned to this site.
          </p>
        </div>
      )}

      {site.meters.map((meter, index) => (
        <div
          key={meter.id ?? `meter-${index}`}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Meter {index + 1}</span>

              {meter.is_primary && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  Primary
                </span>
              )}
            </div>

            {!isReadonly && (
              <button
                type="button"
                onClick={() => removeMeter(index)}
                className="text-rose-500 hover:text-rose-700"
                aria-label={`Remove meter ${index + 1}`}
              >
                <Icon icon="lucide:trash-2" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                MPAN Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                disabled={isReadonly}
                value={meter.mpan_no}
                onChange={(e) =>
                  updateMeter(index, {
                    mpan_no: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="13-digit MPAN"
                className={inputClass}
              />
              {errors[`meters.${index}.mpan_no`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`meters.${index}.mpan_no`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Meter Serial Number
              </label>
              <input
                type="text"
                disabled={isReadonly}
                value={meter.meter_serial_no}
                onChange={(e) =>
                  updateMeter(index, {
                    meter_serial_no: e.target.value,
                  })
                }
                placeholder="Meter serial number"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Meter Type
              </label>
              <select
                disabled={isReadonly}
                value={meter.meter_type}
                onChange={(e) =>
                  updateMeter(index, {
                    meter_type: e.target.value as MeterType,
                  })
                }
                className={inputClass}
              >
                {meterTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isReadonly && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="radio"
                name="primary-meter"
                checked={meter.is_primary}
                onChange={() => setPrimary(index)}
                className="accent-emerald-600"
              />
              Set as primary meter
            </label>
          )}
        </div>
      ))}

      {errors.meters && (
        <p className="text-xs text-rose-500">{errors.meters}</p>
      )}
    </section>
  );
} */

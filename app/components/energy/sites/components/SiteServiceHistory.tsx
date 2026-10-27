// app/components/energy/sites/components/SiteServiceHistory.tsx


"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  SitesFormData,
  SiteServiceRecord,
  ServiceType,
  ServiceStatus,
} from "@/types/sites";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { Icon } from "@iconify/react";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded border border-slate-200 bg-white p-2.5 " +
  "text-xs text-slate-800 outline-none " +
  "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 " +
  "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:disabled:bg-slate-800/50";

const cellClass =
  "border-t border-slate-100 p-2 dark:border-slate-800/60";

const labelClass =
  "text-xs font-medium text-slate-700 dark:text-slate-300";

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: "PREVENTIVE", label: "Preventive" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "REPAIR", label: "Repair" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "OTHER", label: "Other" },
];

const serviceStatuses: { value: ServiceStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function SiteServiceHistory({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addService = () => {
    const service: SiteServiceRecord = {
      service_type: "MAINTENANCE",
      service_date: "",
      next_service_date: "",
      description: "",
      documentation_url: "",
      performed_by: "",
      cost: null,
      status: "SCHEDULED",
    };

    setSiteRec((prev) => ({
      ...prev,
      services: [...prev.services, service],
    }));
  };

  const updateService = (
    index: number,
    changes: Partial<SiteServiceRecord>,
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      services: prev.services.map((service, i) =>
        i === index ? { ...service, ...changes } : service,
      ),
    }));
  };

  const removeService = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="space-y-4">
      {/* Section Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Maintenance & Repair History
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage site maintenance, repairs, inspections and service records.
          </p>
        </div>

        {!isReadonly && (
          <button
            type="button"
            onClick={addService}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon icon="lucide:plus" />
            Add Service
          </button>
        )}
      </div>

      {/* Service Grid */}
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="w-12 p-3">#</th>
              <th className="w-[17%] p-3">Service Type</th>
              <th className="w-[16%] p-3">Service Date</th>
              <th className="w-[16%] p-3">Next Service Date</th>
              <th className="w-[17%] p-3">Performed By</th>
              <th className="w-[13%] p-3">Cost</th>
              <th className="w-[15%] p-3">Status</th>
              {!isReadonly && (
                <th className="w-14 p-3 text-center">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {site.services.length === 0 ? (
              <tr>
                <td
                  colSpan={isReadonly ? 7 : 8}
                  className="p-8 text-center text-xs text-slate-400"
                >
                  No service records available.
                </td>
              </tr>
            ) : (
              site.services.map((service, index) => (
                <tr
                  key={service.id ?? `service-${index}`}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <td className={cellClass}>
                    <span className="font-medium">{index + 1}</span>
                  </td>

                  <td className={cellClass}>
                    <select
                      value={service.service_type}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateService(index, {
                          service_type: e.target.value as ServiceType,
                        })
                      }
                      className={inputClass}
                    >
                      {serviceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={cellClass}>
                    <input
                      type="date"
                      value={service.service_date}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateService(index, {
                          service_date: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                    {errors[`services.${index}.service_date`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`services.${index}.service_date`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <input
                      type="date"
                      value={service.next_service_date}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateService(index, {
                          next_service_date: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                    {errors[`services.${index}.next_service_date`] && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors[`services.${index}.next_service_date`]}
                      </p>
                    )}
                  </td>

                  <td className={cellClass}>
                    <input
                      type="text"
                      value={service.performed_by}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateService(index, {
                          performed_by: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className={cellClass}>
                    <NumericTextInput
                      allowDecimals
                      decimalScale={2}
                      min={0}
                      value={service.cost ?? 0}
                      disabled={isReadonly}
                      onChange={(value) =>
                        updateService(index, { cost: value })
                      }
                      className={inputClass}
                    />
                  </td>

                  <td className={cellClass}>
                    <select
                      value={service.status}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateService(index, {
                          status: e.target.value as ServiceStatus,
                        })
                      }
                      className={inputClass}
                    >
                      {serviceStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {!isReadonly && (
                    <td className={`${cellClass} text-center`}>
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        aria-label={`Remove service ${index + 1}`}
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

      {/* Service Description / Documentation */}
      {site.services.length > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="border-b border-slate-200 pb-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
            Service Details & Documentation
          </h4>

          {site.services.map((service, index) => (
            <div
              key={service.id ?? `service-details-${index}`}
              className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2"
            >
              <div className="grid grid-cols-3 items-start gap-2">
                <label className={`${labelClass} pt-2`}>
                  Service {index + 1} Description
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="col-span-2">
                  <textarea
                    rows={2}
                    value={service.description}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateService(index, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Service work performed..."
                    className={inputClass}
                  />

                  {errors[`services.${index}.description`] && (
                    <p className="mt-1 text-[10px] text-red-500">
                      {errors[`services.${index}.description`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className={labelClass}>
                  Documentation / Reference
                </label>

                <div className="col-span-2">
                  <input
                    type="text"
                    value={service.documentation_url}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateService(index, {
                        documentation_url: e.target.value,
                      })
                    }
                    placeholder="Document reference or URL"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.services && (
        <p className="text-xs text-red-500">{errors.services}</p>
      )}
    </section>
  );
}


/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  SitesFormData,
  SiteServiceRecord,
  ServiceType,
  ServiceStatus,
} from "@/types/sites";
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

export default function SiteServiceHistory({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const addService = () => {
    const service: SiteServiceRecord = {
      service_type: "MAINTENANCE",
      service_date: "",
      next_service_date: "",
      description: "",
      documentation_url: "",
      performed_by: "",
      cost: null,
      status: "SCHEDULED",
    };

    setSiteRec((prev) => ({
      ...prev,
      services: [...prev.services, service],
    }));
  };

  const updateService = (
    index: number,
    changes: Partial<SiteServiceRecord>,
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      services: prev.services.map((service, i) =>
        i === index ? { ...service, ...changes } : service,
      ),
    }));
  };

  const removeService = (index: number) => {
    setSiteRec((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon icon="lucide:clipboard-list" className="text-emerald-600" />
            Maintenance & Repair History
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Track scheduled and completed site services.
          </p>
        </div>

        {!isReadonly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addService}
            className="gap-1.5 text-xs"
          >
            <Icon icon="lucide:plus" />
            Add Service
          </Button>
        )}
      </div>

      {site.services.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
          No service records available.
        </div>
      )}

      {site.services.map((service, index) => (
        <div
          key={service.id ?? `service-${index}`}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold">
              Service Record {index + 1}
            </span>

            {!isReadonly && (
              <button
                type="button"
                onClick={() => removeService(index)}
                className="text-rose-500"
                aria-label={`Remove service ${index + 1}`}
              >
                <Icon icon="lucide:trash-2" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Service Type
              </label>
              <select
                value={service.service_type}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    service_type: e.target.value as ServiceType,
                  })
                }
                className={inputClass}
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="REPAIR">Repair</option>
                <option value="INSPECTION">Inspection</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Service Date
              </label>
              <input
                type="date"
                value={service.service_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    service_date: e.target.value,
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Next Service Date
              </label>
              <input
                type="date"
                value={service.next_service_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    next_service_date: e.target.value,
                  })
                }
                className={inputClass}
              />
              {errors[`services.${index}.next_service_date`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`services.${index}.next_service_date`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Performed By
              </label>
              <input
                type="text"
                value={service.performed_by}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    performed_by: e.target.value,
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Service Cost
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={service.cost ?? ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    cost: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Status</label>
              <select
                value={service.status}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    status: e.target.value as ServiceStatus,
                  })
                }
                className={inputClass}
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={service.description}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    description: e.target.value,
                  })
                }
                className={inputClass}
              />
              {errors[`services.${index}.description`] && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors[`services.${index}.description`]}
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium">
                Documentation URL / Reference
              </label>
              <input
                type="text"
                value={service.documentation_url}
                disabled={isReadonly}
                onChange={(e) =>
                  updateService(index, {
                    documentation_url: e.target.value,
                  })
                }
                placeholder="Document reference or URL"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
 */
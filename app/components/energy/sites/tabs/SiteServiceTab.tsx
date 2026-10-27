// app/components/energy/sites/tabs/SiteServiceTab.tsx

"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { SitesFormData } from "@/types/sites";

import NumericTextInput from "@/components/ui/NumericTextInput";
import SiteServiceHistory from "../components/SiteServiceHistory";

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

const labelClass = "text-xs font-medium text-slate-700 dark:text-slate-300";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  alignStart?: boolean;
}

function FormField({
  label,
  error,
  children,
  alignStart = false,
}: FormFieldProps) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 ${
        alignStart ? "items-start" : "items-center"
      }`}
    >
      <label className={`${labelClass} ${alignStart ? "pt-2" : ""}`}>
        {label}
      </label>

      <div className="col-span-2">
        {children}

        {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
      </div>
    </div>
  );
}

export default function SiteServiceTab({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const updateSite = <K extends keyof SitesFormData>(
    key: K,
    value: SitesFormData[K],
  ) => {
    setSiteRec((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const completedCount = site.services.filter(
    (service) => service.status === "COMPLETED",
  ).length;

  const scheduledCount = site.services.filter(
    (service) => service.status === "SCHEDULED",
  ).length;

  return (
    <div className="space-y-8 pt-2">
      {/* Service Configuration */}
      <section>
        <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
          Service Configuration
        </h3>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-2">
            <FormField
              label="Service Interval (Months)"
              error={errors.service_interval_months}
            >
              <NumericTextInput
                min={1}
                disabled={isReadonly}
                value={site.service_interval_months ?? 0}
                onChange={(value) =>
                  updateSite("service_interval_months", value)
                }
                placeholder="e.g. 6"
                className={inputClass}
              />
            </FormField>

            <FormField label="Service Documentation / Instructions" alignStart>
              <textarea
                rows={3}
                value={site.service_notes}
                disabled={isReadonly}
                onChange={(e) => updateSite("service_notes", e.target.value)}
                placeholder="Enter maintenance instructions, documentation or service requirements..."
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Right Column */}
          <div className="space-y-2">
            <FormField label="Service Start Date">
              <input
                type="date"
                value={site.service_start_date}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("service_start_date", e.target.value)
                }
                className={inputClass}
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* Service Summary */}
      <section>
        <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
          Service Summary
        </h3>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div className="space-y-2">
            <FormField label="Total Services">
              <input
                type="text"
                readOnly
                value={site.services.length}
                className={`${inputClass} bg-slate-50 text-right font-semibold tabular-nums dark:bg-slate-800/50`}
              />
            </FormField>

            <FormField label="Completed Services">
              <input
                type="text"
                readOnly
                value={completedCount}
                className={`${inputClass} bg-slate-50 text-right font-semibold tabular-nums dark:bg-slate-800/50`}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField label="Scheduled Services">
              <input
                type="text"
                readOnly
                value={scheduledCount}
                className={`${inputClass} bg-slate-50 text-right font-semibold tabular-nums dark:bg-slate-800/50`}
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* Maintenance History */}
      <SiteServiceHistory
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />
    </div>
  );
}

/* "use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData } from "@/types/sites";
import { Icon } from "@iconify/react";
import SiteServiceHistory from "../components/SiteServiceHistory";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 " +
  "text-xs outline-none focus:border-emerald-500 " +
  "focus:ring-1 focus:ring-emerald-500 " +
  "disabled:bg-slate-50 dark:border-slate-700 " +
  "dark:bg-slate-900 dark:disabled:bg-slate-800/50";

export default function SiteServiceTab({
  site,
  setSiteRec,
  errors,
  isReadonly = false,
}: Props) {
  const updateSite = <K extends keyof SitesFormData>(
    key: K,
    value: SitesFormData[K],
  ) => {
    setSiteRec((prev) => ({ ...prev, [key]: value }));
  };

  const completedCount = site.services.filter(
    (service) => service.status === "COMPLETED",
  ).length;

  const scheduledCount = site.services.filter(
    (service) => service.status === "SCHEDULED",
  ).length;

  return (
    <div className="space-y-7 py-4">
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:settings-2" className="text-lg text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold">Service Configuration</h3>
            <p className="text-[11px] text-slate-500">
              Configure periodic servicing and maintenance requirements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Service Interval (Months)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={site.service_interval_months ?? ""}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "service_interval_months",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              placeholder="e.g. 6"
              className={inputClass}
            />
            {errors["service_interval_months"] && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors["service_interval_months"]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Service Start Date
            </label>
            <input
              type="date"
              value={site.service_start_date}
              disabled={isReadonly}
              onChange={(e) => updateSite("service_start_date", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium">
              Service Documentation / Instructions
            </label>
            <textarea
              rows={3}
              value={site.service_notes}
              disabled={isReadonly}
              onChange={(e) => updateSite("service_notes", e.target.value)}
              placeholder="Enter service requirements, documentation references or maintenance instructions..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total Services",
            value: site.services.length,
            icon: "lucide:clipboard-list",
          },
          {
            label: "Completed",
            value: completedCount,
            icon: "lucide:check-circle-2",
          },
          {
            label: "Scheduled",
            value: scheduledCount,
            icon: "lucide:calendar-clock",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <Icon icon={metric.icon} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <SiteServiceHistory
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />
    </div>
  );
} */

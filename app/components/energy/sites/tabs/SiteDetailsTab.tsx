// app/components/energy/sites/tabs/SiteDetailsTab.tsx


"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SitesFormData, BessFunction } from "@/types/sites";
import NumericTextInput from "@/components/ui/NumericTextInput";

import SiteMeterSection from "../components/SiteMeterSection";
import SiteBessAllocation from "../components/SiteBessAllocation";

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

const labelClass =
  "text-xs font-medium text-slate-700 dark:text-slate-300";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
      {children}
    </h3>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-3">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="sm:col-span-2">
        {children}
        {error && (
          <p className="mt-1 text-[10px] text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function SiteDetailsTab({
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

  return (
    <div className="space-y-8 pt-2">
      <section>
        <SectionHeading>Site Information</SectionHeading>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div className="space-y-2">
            <FormField
              label="Site No."
              required
              error={errors.site_no}
            >
              <input
                type="text"
                value={site.site_no}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("site_no", e.target.value)
                }
                placeholder="Enter site number"
                className={inputClass}
              />
            </FormField>

            <FormField label="Site Name" error={errors.site_name}>
              <input
                type="text"
                value={site.site_name}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("site_name", e.target.value)
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Grid Supply Point (GSP)">
              <input
                type="text"
                value={site.gsp_uk}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("gsp_uk", e.target.value)
                }
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField label="Distribution Network Operator">
              <input
                type="text"
                value={site.distributor_network_operator}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite(
                    "distributor_network_operator",
                    e.target.value,
                  )
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Segment / Classification">
              <input
                type="text"
                value={site.segments}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("segments", e.target.value)
                }
                className={inputClass}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Grid Connection</SectionHeading>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div className="space-y-2">
            <FormField
              label="Connection Size"
              error={errors.connection_size}
            >
              <NumericTextInput
                allowDecimals
                decimalScale={3}
                min={0}
                disabled={isReadonly}
                value={site.connection_size ?? 0}
                onChange={(value) =>
                  updateSite("connection_size", value)
                }
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Approved Connection"
              error={errors.connection_size_approved}
            >
              <NumericTextInput
                allowDecimals
                decimalScale={3}
                min={0}
                disabled={isReadonly}
                value={site.connection_size_approved ?? 0}
                onChange={(value) =>
                  updateSite("connection_size_approved", value)
                }
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField label="Connection Unit">
              <select
                value={site.connection_size_unit}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite(
                    "connection_size_unit",
                    e.target.value as SitesFormData["connection_size_unit"],
                  )
                }
                className={inputClass}
              >
                <option value="KW">kW</option>
                <option value="KVA">kVA</option>
                <option value="MW">MW</option>
                <option value="MVA">MVA</option>
              </select>
            </FormField>
          </div>
        </div>
      </section>

      <SiteMeterSection
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />

      <section>
        <SectionHeading>Battery Energy Storage System</SectionHeading>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div className="space-y-2">
            <FormField label="BESS Brand / Model">
              <input
                type="text"
                value={site.bess_brand_model}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("bess_brand_model", e.target.value)
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="BESS Function">
              <select
                value={site.bess_function}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite(
                    "bess_function",
                    e.target.value as BessFunction,
                  )
                }
                className={inputClass}
              >
                <option value="TRADING">Energy Trading</option>
                <option value="UPS">UPS</option>
                <option value="PEAK_SHAVING">Peak Shaving</option>
                <option value="BACKUP">Backup Power</option>
                <option value="OTHER">Other</option>
              </select>
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField label="Trading Configuration">
              <input
                type="text"
                value={site.bess_function_trading}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("bess_function_trading", e.target.value)
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="UPS Enabled">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={site.ups_enabled}
                  disabled={isReadonly}
                  onChange={(e) =>
                    updateSite("ups_enabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                Enable UPS functionality
              </label>
            </FormField>
          </div>
        </div>
      </section>

      <SiteBessAllocation
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
import type {
  SitesFormData,
  BessFunction,
} from "@/types/sites";

import { Icon } from "@iconify/react";

import SiteMeterSection from "../components/SiteMeterSection";
import SiteBessAllocation from "../components/SiteBessAllocation";

interface Props {
  site: SitesFormData;
  setSiteRec: Dispatch<SetStateAction<SitesFormData>>;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 " +
  "text-xs text-slate-900 outline-none transition-colors " +
  "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 " +
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:disabled:bg-slate-800/50";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300";

export default function SiteDetailsTab({
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

  const toNumberOrNull = (value: string): number | null =>
    value.trim() === "" ? null : Number(value);

  return (
    <div className="space-y-7 py-4">

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon
            icon="lucide:building-2"
            className="text-lg text-emerald-600"
          />
          <div>
            <h3 className="text-sm font-semibold">
              Site Information
            </h3>
            <p className="text-[11px] text-slate-500">
              General identification and operational details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
          <div>
            <label className={labelClass}>
              Site No. <span className="text-rose-500">*</span>
            </label>

            <input
              type="text"
              value={site.site_no}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite("site_no", e.target.value)
              }
              placeholder="Enter site number"
              className={inputClass}
            />

            {errors["site_no"] && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors["site_no"]}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Site Name</label>
            <input
              type="text"
              value={site.site_name}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite("site_name", e.target.value)
              }
              placeholder="Enter site name"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Grid Supply Point (GSP)
            </label>
            <input
              type="text"
              value={site.gsp_uk}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite("gsp_uk", e.target.value)
              }
              placeholder="Enter GSP"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Distribution Network Operator (DNO)
            </label>
            <input
              type="text"
              value={site.distributor_network_operator}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "distributor_network_operator",
                  e.target.value,
                )
              }
              placeholder="Enter DNO"
              className={inputClass}
            />
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>
              Segment / Site Classification
            </label>
            <input
              type="text"
              value={site.segments}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite("segments", e.target.value)
              }
              placeholder="Enter segment or classification"
              className={inputClass}
            />
          </div>
        </div>
      </section>


      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon
            icon="lucide:plug-zap"
            className="text-lg text-emerald-600"
          />
          <div>
            <h3 className="text-sm font-semibold">
              Grid Connection
            </h3>
            <p className="text-[11px] text-slate-500">
              Requested and approved connection capacities
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Connection Size</label>
            <input
              type="number"
              min={0}
              step="any"
              value={site.connection_size ?? ""}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "connection_size",
                  toNumberOrNull(e.target.value),
                )
              }
              className={inputClass}
              placeholder="0.00"
            />
            {errors["connection_size"] && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors["connection_size"]}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Connection Size Approved
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={site.connection_size_approved ?? ""}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "connection_size_approved",
                  toNumberOrNull(e.target.value),
                )
              }
              className={inputClass}
              placeholder="0.00"
            />
            {errors["connection_size_approved"] && (
              <p className="mt-1 text-[11px] text-rose-500">
                {errors["connection_size_approved"]}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Connection Unit</label>
            <select
              value={site.connection_size_unit}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "connection_size_unit",
                  e.target.value as SitesFormData["connection_size_unit"],
                )
              }
              className={inputClass}
            >
              <option value="KW">kW</option>
              <option value="KVA">kVA</option>
              <option value="MW">MW</option>
              <option value="MVA">MVA</option>
            </select>
          </div>
        </div>
      </section>


      <SiteMeterSection
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />


      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon
            icon="lucide:battery-charging"
            className="text-lg text-emerald-600"
          />
          <div>
            <h3 className="text-sm font-semibold">
              Battery Energy Storage System
            </h3>
            <p className="text-[11px] text-slate-500">
              BESS function, trading configuration and UPS capability
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={labelClass}>
              BESS Brand & Model (Summary)
            </label>
            <input
              type="text"
              value={site.bess_brand_model}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite("bess_brand_model", e.target.value)
              }
              placeholder="e.g. ZOE - 261 kW - P1"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>BESS Function</label>
            <select
              value={site.bess_function}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "bess_function",
                  e.target.value as BessFunction,
                )
              }
              className={inputClass}
            >
              <option value="TRADING">Energy Trading</option>
              <option value="UPS">UPS</option>
              <option value="PEAK_SHAVING">Peak Shaving</option>
              <option value="BACKUP">Backup Power</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Trading Configuration / Notes
            </label>
            <input
              type="text"
              value={site.bess_function_trading}
              disabled={isReadonly}
              onChange={(e) =>
                updateSite(
                  "bess_function_trading",
                  e.target.value,
                )
              }
              placeholder="Enter trading configuration"
              className={inputClass}
            />
          </div>

          <div className="flex items-center">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
              <input
                type="checkbox"
                checked={site.ups_enabled}
                disabled={isReadonly}
                onChange={(e) =>
                  updateSite("ups_enabled", e.target.checked)
                }
                className="h-4 w-4 accent-emerald-600"
              />
              <div>
                <p className="text-xs font-semibold">
                  UPS Enabled
                </p>
                <p className="text-[11px] text-slate-500">
                  Site supports uninterrupted power supply
                </p>
              </div>
            </label>
          </div>
        </div>
      </section>


      <SiteBessAllocation
        site={site}
        setSiteRec={setSiteRec}
        errors={errors}
        isReadonly={isReadonly}
      />
    </div>
  );
} */

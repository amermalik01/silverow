// app/components/hr/employees/tabs/employeeFormKit.tsx

"use client";

import { Icon } from "@iconify/react";
import { format, parseISO } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";

/* Shared look for the employee record tabs — same theme as the parties /
   items tabs (emerald cards, medium-width label + field rows). */

export const cardClass =
  "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] p-4 shadow-2xs transition-colors";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-black outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100/80 disabled:text-black dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/70 dark:disabled:text-slate-300";

export const labelClass = "text-sm font-medium text-black dark:text-slate-400";

/** Label + field row (label 1/3, field 2/3), capped at a medium width. */
export const fieldRowClass =
  "grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3 max-w-[520px]";

export const checkboxClass =
  "h-4 w-4 rounded border-slate-300 accent-emerald-700 disabled:cursor-not-allowed";

export const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Icon for each section title used across the employee tabs. */
const SECTION_ICONS: Record<string, string> = {
  "Employee Information": "tabler:id-badge-2",
  "Organisation & Reporting": "tabler:sitemap",
  "Employment Details": "tabler:briefcase",
  "Login & Access": "tabler:lock-access",
  "Address Details": "tabler:map-pin",
  "Direct Telephones": "tabler:phone",
  "Communication Channels": "tabler:messages",
  "Personal Details": "tabler:user",
  "Bank Account Details": "tabler:building-bank",
  "Identity & Identification": "tabler:id",
  "Next Of Kin / Emergency Contact Details": "tabler:heart-handshake",
  "Compensation & Remuneration": "tabler:cash",
  "Employee Pension Contribution": "tabler:pig-money",
  "Employer Pension Contribution": "tabler:building-community",
  "Company Car": "tabler:car",
  "Fuel Card": "tabler:gas-station",
  "Company Laptop": "tabler:device-laptop",
  "Company Tablet / Ipad": "tabler:device-tablet",
  "Company Mobile": "tabler:device-mobile",
  "Other Benefits": "tabler:gift",
};

export const sectionIcon = (title: string) =>
  SECTION_ICONS[title] || "tabler:forms";

export function Section({
  title,
  description,
  icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cardClass}>
      <div className="mb-3.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            icon={icon || sectionIcon(title)}
            className="shrink-0 text-2xl text-emerald-800 dark:text-emerald-400"
          />
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions}
      </div>
      <div className="grid grid-cols-1 items-start gap-y-3">{children}</div>
    </section>
  );
}

export type FieldProps = {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "email" | "tel" | "date" | "number";
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export function FormField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
  step,
}: FieldProps) {
  return (
    <div className={fieldRowClass}>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="sm:col-span-2 min-w-0">
        {type === "date" ? (
          <DatePicker
            value={value ? parseISO(String(value)) : undefined}
            onChange={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
            disabled={disabled}
            containerClassName="w-full"
            className={inputClass}
          />
        ) : (
          <input
            type={type}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={`${inputClass} ${type === "number" ? "tabular-nums" : ""}`}
          />
        )}
      </div>
    </div>
  );
}

export type SelectOption = {
  value: string;
  label: string;
};

export function SelectField({
  label,
  value,
  onChange,
  disabled,
  options,
  placeholder = "Select...",
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <div className={fieldRowClass}>
      <label className={labelClass}>{label}</label>
      <div className="sm:col-span-2 min-w-0">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** On/off switch, same as the Finance tab. */
export function SwitchPill({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "border-emerald-600 bg-emerald-600"
            : "border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

// app/components/hr/employees/tabs/EmployeeBenefitsTab.tsx

"use client";

import { type Dispatch, type SetStateAction } from "react";
import type { Employee } from "@/types/hr/employee";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

type Props = {
  employee: Partial<Employee>;
  setEmployee: Dispatch<SetStateAction<Partial<Employee>>>;
  isReadonly?: boolean;
};

type FieldProps = {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "number" | "date";
  placeholder?: string;
  required?: boolean;
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-400";

const labelClass = "text-xs font-medium text-slate-700 dark:text-slate-300";

function FormField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  required = false,
}: FieldProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {type === "date" ? (
        <div className="sm:col-span-2">
          <DatePicker
            value={value ? parseISO(String(value)) : undefined}
            onChange={(date) =>
              onChange(date ? format(date, "yyyy-MM-dd") : "")
            }
            containerClassName="w-full"
          />
        </div>
      ) : (
        <div className="sm:col-span-2">
          <input
            type={type}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}

function BenefitSectionHeader({
  title,
  enabled,
  onToggle,
  disabled,
}: {
  title: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Active
          </span>
        </label>
        <button
          type="button"
          disabled={disabled}
          className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs"
          title="Add entry"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function EmployeeBenefitsTab({
  employee,
  setEmployee,
  isReadonly = false,
}: Props) {
  const updateText = (key: keyof Employee, value: string) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateBoolean = (key: keyof Employee, value: boolean) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        {/* Left Column: Company Car, Fuel Card, Company Laptop */}
        <div className="space-y-8">
          {/* Company Car */}
          <div className="space-y-4">
            <BenefitSectionHeader
              title="Company Car"
              enabled={employee.has_company_car ?? false}
              onToggle={(checked) => updateBoolean("has_company_car", checked)}
              disabled={isReadonly}
            />
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Make"
                  value={employee.car_make}
                  onChange={(val) => updateText("car_make", val)}
                  disabled={isReadonly}
                  required
                />
                <FormField
                  label="Model"
                  value={employee.car_model}
                  onChange={(val) => updateText("car_model", val)}
                  disabled={isReadonly}
                  required
                />
              </div>
              <FormField
                label="VIN / Reg No"
                value={employee.car_vin_reg}
                onChange={(val) => updateText("car_vin_reg", val)}
                disabled={isReadonly}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="CO2 Emissions"
                  value={employee.car_co2}
                  onChange={(val) => updateText("car_co2", val)}
                  disabled={isReadonly}
                  placeholder="g/km"
                  required
                />
                <FormField
                  label="Market Value"
                  value={employee.car_market_value}
                  onChange={(val) => updateText("car_market_value", val)}
                  disabled={isReadonly}
                  placeholder="GBP"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                  <label className={labelClass}>
                    Fuel Type <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-2">
                    <select
                      value={employee.car_fuel_type ?? ""}
                      onChange={(e) =>
                        updateText("car_fuel_type", e.target.value)
                      }
                      disabled={isReadonly}
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                  <label className={labelClass}>
                    Engine Size <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={employee.car_engine_size ?? ""}
                      onChange={(e) =>
                        updateText("car_engine_size", e.target.value)
                      }
                      disabled={isReadonly}
                      placeholder="e.g. 2.0L"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                <label className={labelClass}>
                  Date <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <DatePicker
                    value={
                      employee.car_date_from
                        ? parseISO(String(employee.car_date_from))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "car_date_from",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                  <DatePicker
                    value={
                      employee.car_date_to
                        ? parseISO(String(employee.car_date_to))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "car_date_to",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Fuel Card */}
          <div className="space-y-4">
            <BenefitSectionHeader
              title="Fuel Card"
              enabled={employee.has_fuel_card ?? false}
              onToggle={(checked) => updateBoolean("has_fuel_card", checked)}
              disabled={isReadonly}
            />
            <div className="grid grid-cols-1 gap-4">
              <FormField
                label="Fuel Card Number"
                value={employee.fuel_card_number}
                onChange={(val) => updateText("fuel_card_number", val)}
                disabled={isReadonly}
                required
              />
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={employee.fuel_cost_deductions ?? false}
                    onChange={(e) =>
                      updateBoolean("fuel_cost_deductions", e.target.checked)
                    }
                    disabled={isReadonly}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Fuel Cost Deductions for Personal Mileage
                  </span>
                </label>
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Company Laptop */}
          <div className="space-y-4">
            <BenefitSectionHeader
              title="Company Laptop"
              enabled={employee.has_company_laptop ?? false}
              onToggle={(checked) =>
                updateBoolean("has_company_laptop", checked)
              }
              disabled={isReadonly}
            />
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Make"
                  value={employee.laptop_make}
                  onChange={(val) => updateText("laptop_make", val)}
                  disabled={isReadonly}
                  required
                />
                <FormField
                  label="Model"
                  value={employee.laptop_model}
                  onChange={(val) => updateText("laptop_model", val)}
                  disabled={isReadonly}
                  required
                />
              </div>
              <FormField
                label="Serial Number"
                value={employee.laptop_serial}
                onChange={(val) => updateText("laptop_serial", val)}
                disabled={isReadonly}
                required
              />
              <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                <label className={labelClass}>
                  Date <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <DatePicker
                    value={
                      employee.laptop_date_from
                        ? parseISO(String(employee.laptop_date_from))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "laptop_date_from",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                  <DatePicker
                    value={
                      employee.laptop_date_to
                        ? parseISO(String(employee.laptop_date_to))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "laptop_date_to",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tablet, Mobile, Other Benefits & P11D */}
        <div className="space-y-8">
          {/* Company Tablet / Ipad */}
          <div className="space-y-4">
            <BenefitSectionHeader
              title="Company Tablet / Ipad"
              enabled={employee.has_company_tablet ?? false}
              onToggle={(checked) =>
                updateBoolean("has_company_tablet", checked)
              }
              disabled={isReadonly}
            />
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Make"
                  value={employee.tablet_make}
                  onChange={(val) => updateText("tablet_make", val)}
                  disabled={isReadonly}
                  required
                />
                <FormField
                  label="Model"
                  value={employee.tablet_model}
                  onChange={(val) => updateText("tablet_model", val)}
                  disabled={isReadonly}
                  required
                />
              </div>
              <FormField
                label="Serial Number"
                value={employee.tablet_serial}
                onChange={(val) => updateText("tablet_serial", val)}
                disabled={isReadonly}
                required
              />
              <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                <label className={labelClass}>
                  Date <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <DatePicker
                    value={
                      employee.tablet_date_from
                        ? parseISO(String(employee.tablet_date_from))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "tablet_date_from",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                  <DatePicker
                    value={
                      employee.tablet_date_to
                        ? parseISO(String(employee.tablet_date_to))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "tablet_date_to",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Company Mobile */}
          <div className="space-y-4">
            <BenefitSectionHeader
              title="Company Mobile"
              enabled={employee.has_company_mobile ?? false}
              onToggle={(checked) =>
                updateBoolean("has_company_mobile", checked)
              }
              disabled={isReadonly}
            />
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Make"
                  value={employee.mobile_make}
                  onChange={(val) => updateText("mobile_make", val)}
                  disabled={isReadonly}
                  required
                />
                <FormField
                  label="Model"
                  value={employee.mobile_model}
                  onChange={(val) => updateText("mobile_model", val)}
                  disabled={isReadonly}
                  required
                />
              </div>
              <FormField
                label="IMEI"
                value={employee.mobile_imei}
                onChange={(val) => updateText("mobile_imei", val)}
                disabled={isReadonly}
                required
              />
              <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
                <label className={labelClass}>
                  Date <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <DatePicker
                    value={
                      employee.mobile_date_from
                        ? parseISO(String(employee.mobile_date_from))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "mobile_date_from",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                  <DatePicker
                    value={
                      employee.mobile_date_to
                        ? parseISO(String(employee.mobile_date_to))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "mobile_date_to",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Other Benefits & P11D */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className={labelClass}>Other Benefits</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  ☰ Benefits
                </button>
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>
            <FormField
              label="P11D"
              value={employee.p11d_value}
              onChange={(val) => updateText("p11d_value", val)}
              disabled={isReadonly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

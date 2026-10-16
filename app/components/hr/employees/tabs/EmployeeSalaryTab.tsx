// app/components/hr/employees/tabs/EmployeeSalaryTab.tsx

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
  step?: number;
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
  step,
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
            step={step}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

function SelectField({
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
    <div className="grid grid-cols-1 items-start gap-1.5 sm:items-center ">
      {/* <label className={labelClass}>{label}</label> */}
      <div>
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-4 lg:grid-cols-1">
        {children}
      </div>
    </section>
  );
}

export default function EmployeeSalaryTab({
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

  const updateNumber = (key: keyof Employee, value: string) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value === "" ? undefined : Number(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        {/* Left Column: Salary & Holidays */}
        <div className="space-y-6">
          <Section title="Compensation & Remuneration">
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>
                Salary <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={employee.basic_salary ?? ""}
                  onChange={(e) => updateNumber("basic_salary", e.target.value)}
                  disabled={isReadonly}
                  placeholder="0"
                  className={`${inputClass} col-span-1`}
                />
                <input
                  type="text"
                  value={employee.salary_currency ?? "GBP"}
                  onChange={(e) =>
                    updateText("salary_currency", e.target.value)
                  }
                  disabled={isReadonly}
                  className={`${inputClass} col-span-1 bg-slate-50`}
                />

                <SelectField
                  label=""
                  value={employee.salary_frequency}
                  onChange={(value) => updateText("salary_frequency", value)}
                  disabled={isReadonly}
                  options={[
                    { value: "Hourly", label: "Hourly" },
                    { value: "Weekly", label: "Weekly" },
                    { value: "Monthly", label: "Monthly" },
                    { value: "Yearly", label: "Yearly" },
                  ]}
                  placeholder="Select"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Commission</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  value={employee.commission_rate ?? ""}
                  onChange={(e) =>
                    updateNumber("commission_rate", e.target.value)
                  }
                  disabled={isReadonly}
                  placeholder="0"
                  className={inputClass}
                />
                <span className="text-xs font-medium text-slate-500">%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>
                Commission Effective Date{" "}
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={
                      employee.commission_effective_date
                        ? parseISO(String(employee.commission_effective_date))
                        : undefined
                    }
                    onChange={(date) =>
                      updateText(
                        "commission_effective_date",
                        date ? format(date, "yyyy-MM-dd") : "",
                      )
                    }
                    containerClassName="w-full"
                  />
                </div>
                <button
                  type="button"
                  disabled={isReadonly}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  History
                </button>
              </div>
            </div>

            <FormField
              label="Overtime Rate"
              type="number"
              value={employee.overtime_rate}
              onChange={(value) => updateNumber("overtime_rate", value)}
              disabled={isReadonly}
              placeholder="0.00"
              step={0.01}
            />

            <FormField
              label="Company Bonus"
              type="number"
              value={employee.company_bonus}
              onChange={(value) => updateNumber("company_bonus", value)}
              disabled={isReadonly}
              placeholder="0"
            />

            <FormField
              label="Salary Effective Date"
              type="date"
              value={employee.salary_effective_date}
              onChange={(value) => updateText("salary_effective_date", value)}
              disabled={isReadonly}
              required
            />

            <FormField
              label="Salary Review Date"
              type="date"
              value={employee.salary_review_date}
              onChange={(value) => updateText("salary_review_date", value)}
              disabled={isReadonly}
            />

            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>
                Entitled Holidays <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  value={employee.entitled_holidays ?? ""}
                  onChange={(e) =>
                    updateNumber("entitled_holidays", e.target.value)
                  }
                  disabled={isReadonly}
                  placeholder="14"
                  className={inputClass}
                />
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  Days
                </span>
              </div>
            </div>
          </Section>
        </div>

        {/* Right Column: Employee & Employer Pensions */}
        <div className="space-y-6">
          <Section title="Employee Pension Contribution">
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Percentage</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  value={employee.employee_pension_percentage ?? ""}
                  onChange={(e) =>
                    updateNumber("employee_pension_percentage", e.target.value)
                  }
                  disabled={isReadonly}
                  placeholder="0"
                  className={inputClass}
                />
                <span className="text-xs font-medium text-slate-500">%</span>
              </div>
            </div>
            <FormField
              label="Start Date"
              type="date"
              value={employee.employee_pension_start_date}
              onChange={(value) =>
                updateText("employee_pension_start_date", value)
              }
              disabled={isReadonly}
              required
            />
            <FormField
              label="Pension Change Date"
              type="date"
              value={employee.employee_pension_change_date}
              onChange={(value) =>
                updateText("employee_pension_change_date", value)
              }
              disabled={isReadonly}
            />
            <FormField
              label="End Date"
              type="date"
              value={employee.employee_pension_end_date}
              onChange={(value) =>
                updateText("employee_pension_end_date", value)
              }
              disabled={isReadonly}
            />
          </Section>

          <Section title="Employer Pension Contribution">
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Percentage</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  value={employee.employer_pension_percentage ?? ""}
                  onChange={(e) =>
                    updateNumber("employer_pension_percentage", e.target.value)
                  }
                  disabled={isReadonly}
                  placeholder="0"
                  className={inputClass}
                />
                <span className="text-xs font-medium text-slate-500">%</span>
              </div>
            </div>
            <FormField
              label="Start Date"
              type="date"
              value={employee.employer_pension_start_date}
              onChange={(value) =>
                updateText("employer_pension_start_date", value)
              }
              disabled={isReadonly}
              required
            />
            <FormField
              label="Pension Change Date"
              type="date"
              value={employee.employer_pension_change_date}
              onChange={(value) =>
                updateText("employer_pension_change_date", value)
              }
              disabled={isReadonly}
            />
            <FormField
              label="End Date"
              type="date"
              value={employee.employer_pension_end_date}
              onChange={(value) =>
                updateText("employer_pension_end_date", value)
              }
              disabled={isReadonly}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

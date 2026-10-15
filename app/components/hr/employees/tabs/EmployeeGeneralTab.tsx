// app/components/hr/employees/tabs/EmployeeGeneralTab.tsx

"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import type { Employee } from "@/types/hr/employee";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

type Option = { id: string; name: string };
type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
};

type Props = {
  employee: Partial<Employee> & {
    department_ids?: string[];
    designation_ids?: string[];
  };
  setEmployee: Dispatch<
    SetStateAction<
      Partial<Employee> & {
        department_ids?: string[];
        designation_ids?: string[];
      }
    >
  >;
  isReadonly?: boolean;
};

type FieldProps = {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "email" | "date" | "number";
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
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
  min,
  max,
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
            min={min}
            max={max}
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
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
      <label className={labelClass}>{label}</label>
      <div className="sm:col-span-2">
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
        {/* {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )} */}
      </div>
      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-4 lg:grid-cols-1">
        {children}
      </div>
    </section>
  );
}

export default function EmployeeGeneralTab({
  employee,
  setEmployee,
  isReadonly = false,
}: Props) {
  // Dropdown API states
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [managers, setManagers] = useState<EmployeeOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Option[]>([]);

  // Modal visibility states
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptRes, desRes, mgrRes, empTypeRes] = await Promise.all([
          fetch("/api/hr/departments"),
          fetch("/api/hr/designations"),
          fetch("/api/hr/employees"),
          fetch("/api/hr/employee_type"),
        ]);
        const [deptJson, desJson, mgrJson, empTypeJson] = await Promise.all([
          deptRes.json(),
          desRes.json(),
          mgrRes.json(),
          empTypeRes.json(),
        ]);
        setDepartments(deptJson || []);
        setDesignations(desJson.data || []);
        setManagers(mgrJson.rows || []);
        setEmploymentTypes(empTypeJson|| []);
      } catch (err) {
        console.error("Failed to compile dropdown structures:", err);
      }
    };
    loadDropdownData();
  }, []);

  const updateField = <K extends keyof Employee>(
    key: K,
    value: Employee[K],
  ) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateText = (key: keyof Employee, value: string) => {
    setEmployee((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateNumber = (key: "hours_per_week", value: string) => {
    updateField(key, value === "" ? undefined : Number(value));
  };

  const updateBoolean = (key: "allow_login", value: boolean) => {
    updateField(key, value);
  };

  const toggleMultiSelect = (
    field: "department_ids" | "designation_ids",
    id: string
  ) => {
    const currentList = employee[field] || [];
    const updatedList = currentList.includes(id)
      ? currentList.filter((item) => item !== id)
      : [...currentList, id];
    setEmployee((prev) => ({ ...prev, [field]: updatedList }));
  };

  // Mapped options for SelectField components
  const managerOptions: SelectOption[] = managers.map((m) => ({
    value: m.id,
    label: `${m.employee_code ? `[${m.employee_code}] ` : ""}${m.first_name} ${m.last_name}`,
  }));

  const employmentTypeOptions: SelectOption[] = employmentTypes.map((et) => ({
    value: et.id,
    label: et.name,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          {/* Employee information */}
          <Section
            title="Employee Information"
            description="Basic identification and employment details."
          >
            <FormField
              label="Preferred Name"
              value={employee.display_name}
              onChange={(value) => updateText("display_name", value)}
              disabled={isReadonly}
              placeholder="Name shown throughout the system"
            />
            <FormField
              label="First Name"
              value={employee.first_name}
              onChange={(value) => updateText("first_name", value)}
              disabled={isReadonly}
              placeholder="Enter first name"
              required
            />
            <FormField
              label="Middle Name"
              value={employee.middle_name}
              onChange={(value) => updateText("middle_name", value)}
              disabled={isReadonly}
              placeholder="Enter middle name"
            />
            <FormField
              label="Last Name"
              value={employee.last_name}
              onChange={(value) => updateText("last_name", value)}
              disabled={isReadonly}
              placeholder="Enter last name"
              required
            />
            <FormField
              label="Job Title"
              value={employee.job_title}
              onChange={(value) => updateText("job_title", value)}
              disabled={isReadonly}
              placeholder="e.g. HR Manager"
            />
          </Section>
        </div>

        <div className="space-y-2">
          {/* Organisation and reporting */}
          <Section
            title="Organisation & Reporting"
            description="Department, designation, manager, and employment classification."
          >
            {/* Multi-select Department Modal Trigger */}
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Department(s)</label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() => setIsDeptModalOpen(true)}
                  className={`${inputClass} text-left flex justify-between items-center`}
                >
                  <span className="truncate">
                    {employee.department_ids && employee.department_ids.length > 0
                      ? departments
                          .filter((d) => employee.department_ids?.includes(d.id))
                          .map((d) => d.name)
                          .join(", ")
                      : "Select Departments..."}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>
              </div>
            </div>

            {/* Multi-select Designation Modal Trigger */}
            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Designation(s)</label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={isReadonly}
                  onClick={() => setIsDesigModalOpen(true)}
                  className={`${inputClass} text-left flex justify-between items-center`}
                >
                  <span className="truncate">
                    {employee.designation_ids && employee.designation_ids.length > 0
                      ? designations
                          .filter((d) => employee.designation_ids?.includes(d.id))
                          .map((d) => d.name)
                          .join(", ")
                      : "Select Designations..."}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>
              </div>
            </div>

            <SelectField
              label="Manager"
              value={employee.manager_id}
              onChange={(value) => updateText("manager_id", value)}
              disabled={isReadonly}
              options={managerOptions}
              placeholder="Select reporting manager"
            />

            <SelectField
              label="Employment Type"
              value={employee.employment_type_id}
              onChange={(value) => updateText("employment_type_id", value)}
              disabled={isReadonly}
              options={employmentTypeOptions}
              placeholder="Select employment type"
            />
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          {/* Employment details */}
          <Section
            title="Employment Details"
            description="Start date, working hours, and current employment status."
          >
            <FormField
              label="Start Date"
              type="date"
              value={employee.start_date ?? ""}
              onChange={(value) => updateText("start_date", value)}
              disabled={isReadonly}
              required
            />

            <FormField
              label="Hours Per Week"
              type="number"
              value={employee.hours_per_week}
              onChange={(value) => updateNumber("hours_per_week", value)}
              disabled={isReadonly}
              placeholder="e.g. 37.5"
              min={0}
              max={168}
              step={0.5}
            />

            <SelectField
              label="Employment Status"
              value={employee.status}
              onChange={(value) =>
                updateField(
                  "status",
                  value === "" ? undefined : (value as NonNullable<Employee["status"]>),
                )
              }
              disabled={isReadonly}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "terminated", label: "Terminated" },
              ]}
            />

            {/* Job Status restricted to Full Time / Part Time */}
            <SelectField
              label="Job Status"
              value={employee.job_status}
              onChange={(value) => updateText("job_status", value)}
              disabled={isReadonly}
              options={[
                { value: "full_time", label: "Full Time" },
                { value: "part_time", label: "Part Time" },
              ]}
              placeholder="Select job status"
            />
          </Section>
        </div>

        <div className="space-y-2">
          {/* Login and access */}
          <Section
            title="Login & Access"
            description="Configure the employee's system account and access."
          >
            <FormField
              label="User ID"
              value={employee.user_id}
              onChange={(value) => updateText("user_id", value)}
              disabled={isReadonly}
              placeholder="Linked user ID"
            />

            <FormField
              label="Login Email"
              type="email"
              value={employee.login_email}
              onChange={(value) => updateText("login_email", value)}
              disabled={isReadonly}
              placeholder="employee@company.com"
            />

            <FormField
              label="Login Role"
              value={employee.login_role}
              onChange={(value) => updateText("login_role", value)}
              disabled={isReadonly}
              placeholder="Enter login role"
            />

            <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-3">
              <label className={labelClass}>Allow Login</label>
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={employee.allow_login ?? false}
                    onChange={(event) =>
                      updateBoolean("allow_login", event.target.checked)
                    }
                    disabled={isReadonly}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  Allow this employee to log in
                </label>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* DEPARTMENT MULTI-SELECT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Select Departments
            </h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {departments.map((dept) => {
                const isSelected = employee.department_ids?.includes(dept.id);
                return (
                  <label
                    key={dept.id}
                    className="flex items-center gap-3 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={() => toggleMultiSelect("department_ids", dept.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {dept.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESIGNATION MULTI-SELECT MODAL */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Select Designations
            </h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {designations.map((desig) => {
                const isSelected = employee.designation_ids?.includes(desig.id);
                return (
                  <label
                    key={desig.id}
                    className="flex items-center gap-3 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={() => toggleMultiSelect("designation_ids", desig.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {desig.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDesigModalOpen(false)}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* "use client";

import { useEffect, useState } from "react";
import { Employee } from "@/types/hr/employee";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfDay } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";

type Option = { id: string; name: string };
type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
};
type Props = {
  employee: Partial<Employee>;
  setEmployee: React.Dispatch<React.SetStateAction<Partial<Employee>>>;
};

export default function EmployeeGeneralTab({ employee, setEmployee }: Props) {
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [managers, setManagers] = useState<EmployeeOption[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptRes, desRes, mgrRes] = await Promise.all([
          fetch("/api/hr/departments"),
          fetch("/api/hr/designations"),
          fetch("/api/hr/employees"),
        ]);
        const [deptJson, desJson, mgrJson] = await Promise.all([
          deptRes.json(),
          desRes.json(),
          mgrRes.json(),
        ]);
        setDepartments(deptJson.data || []);
        setDesignations(desJson.data || []);
        setManagers(mgrJson.data || []);
      } catch (err) {
        console.error("Failed to compile dropdown structures:", err);
      }
    };
    loadDropdownData();
  }, []);

  const inputClass =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const labelClass =
    "block text-xs font-semibold text-slate-600 capitalize tracking-wider mb-1.5";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 

      <div>
        <label className={labelClass}>Hire Date</label>


        <DatePicker
          value={employee.hire_date ? parseISO(employee.hire_date) : undefined}
          containerClassName="col-span-8"
          onChange={(date) =>
            setEmployee({
              ...employee,
              hire_date: date ? format(date, "yyyy-MM-dd") : "",
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>Department Delegation</label>
        <select
          value={employee.department_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              department_id: e.target.value || undefined,
            })
          }
          className={inputClass}
        >
          <option value="">Choose Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Designation Role</label>
        <select
          value={employee.designation_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              designation_id: e.target.value || undefined,
            })
          }
          className={inputClass}
        >
          <option value="">Choose Designation</option>
          {designations.map((des) => (
            <option key={des.id} value={des.id}>
              {des.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Reporting Manager</label>
        <select
          value={employee.manager_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              manager_id: e.target.value || undefined,
            })
          }
          className={inputClass}
        >
          <option value="">Choose Supervisor</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.employee_code ? `[${m.employee_code}] ` : ""}
              {m.first_name} {m.last_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Base Payroll Compensation</label>


        <NumericTextInput
          allowDecimals
          decimalScale={2}
          value={Number(employee.basic_salary) || 0}
          onChange={(val) =>
            setEmployee({ ...employee, basic_salary: Number(val) })
          }
          className={inputClass}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className={labelClass}>Operational Status</label>
        <select
          value={employee.status || "active"}
          onChange={(e) =>
            setEmployee({
              ...employee,
              status: e.target.value as "active" | "inactive" | "terminated",
            })
          }
          className={`${inputClass} font-medium ${
            employee.status === "active"
              ? "text-emerald-700 bg-emerald-50/30"
              : "text-slate-700"
          }`}
        >
          <option value="active">Active/Onboarded</option>
          <option value="inactive">Inactive/On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>
    </div>
  );
} */

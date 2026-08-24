// app/components/hr/employees/tabs/EmployeeGeneralTab.tsx

"use client";

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
        <label className={labelClass}>First Name</label>
        <input
          value={employee.first_name || ""}
          onChange={(e) =>
            setEmployee({ ...employee, first_name: e.target.value })
          }
          className={inputClass}
          placeholder="John"
        />
      </div>

      <div>
        <label className={labelClass}>Last Name</label>
        <input
          value={employee.last_name || ""}
          onChange={(e) =>
            setEmployee({ ...employee, last_name: e.target.value })
          }
          className={inputClass}
          placeholder="Doe"
        />
      </div>

      <div>
        <label className={labelClass}>Work Email</label>
        <input
          type="email"
          value={employee.email || ""}
          onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
          className={inputClass}
          placeholder="j.doe@company.com"
        />
      </div>

      <div>
        <label className={labelClass}>Mobile Number</label>
        <input
          value={employee.mobile || ""}
          onChange={(e) => setEmployee({ ...employee, mobile: e.target.value })}
          className={inputClass}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div>
        <label className={labelClass}>Hire Date</label>
        {/* <input
          type="date"
          value={employee.hire_date || ""}
          onChange={(e) =>
            setEmployee({ ...employee, hire_date: e.target.value })
          }
          className={inputClass}
        /> */}

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
        {/* <input
          type="number"
          value={employee.basic_salary || ""}
          onChange={(e) =>
            setEmployee({ ...employee, basic_salary: Number(e.target.value) })
          }
          className={inputClass}
          placeholder="0.00"
        /> */}

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
}

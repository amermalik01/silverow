// app/components/hr/employees/tabs/EmployeeGeneralTab.tsx

"use client";

import { useEffect, useState } from "react";

import { Employee } from "@/types/hr/employee";

type Option = {
  id: string;
  name: string;
};

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
    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/hr/departments");

        const json = await res.json();

        setDepartments(json.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const loadDesignations = async () => {
      try {
        const res = await fetch("/api/hr/designations");

        const json = await res.json();

        setDesignations(json.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const loadManagers = async () => {
      try {
        const res = await fetch("/api/hr/employees");

        const json = await res.json();

        setManagers(json.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadDepartments();

    loadDesignations();

    loadManagers();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* FIRST NAME */}

      <div>
        <label className="block mb-1">First Name</label>

        <input
          value={employee.first_name || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              first_name: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* LAST NAME */}

      <div>
        <label className="block mb-1">Last Name</label>

        <input
          value={employee.last_name || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              last_name: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* EMAIL */}

      <div>
        <label className="block mb-1">Email</label>

        <input
          type="email"
          value={employee.email || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              email: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* MOBILE */}

      <div>
        <label className="block mb-1">Mobile</label>

        <input
          value={employee.mobile || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              mobile: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* HIRE DATE */}

      <div>
        <label className="block mb-1">Hire Date</label>

        <input
          type="date"
          value={employee.hire_date || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              hire_date: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* DEPARTMENT */}

      <div>
        <label className="block mb-1">Department</label>

        <select
          value={employee.department_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              department_id: e.target.value || undefined,
            })
          }
          className="border rounded p-2 w-full"
        >
          <option value="">Select Department</option>

          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* DESIGNATION */}

      <div>
        <label className="block mb-1">Designation</label>

        <select
          value={employee.designation_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              designation_id: e.target.value || undefined,
            })
          }
          className="border rounded p-2 w-full"
        >
          <option value="">Select Designation</option>

          {designations.map((designation) => (
            <option key={designation.id} value={designation.id}>
              {designation.name}
            </option>
          ))}
        </select>
      </div>

      {/* MANAGER */}

      <div>
        <label className="block mb-1">Manager</label>

        <select
          value={employee.manager_id || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              manager_id: e.target.value || undefined,
            })
          }
          className="border rounded p-2 w-full"
        >
          <option value="">Select Manager</option>

          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.employee_code} - {manager.first_name} {manager.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* BASIC SALARY */}

      <div>
        <label className="block mb-1">Basic Salary</label>

        <input
          type="number"
          value={employee.basic_salary || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              basic_salary: Number(e.target.value),
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      {/* STATUS */}

      <div>
        <label className="block mb-1">Status</label>

        <select
          value={employee.status || "active"}
          onChange={(e) =>
            setEmployee({
              ...employee,
              status: e.target.value as "active" | "inactive" | "terminated",
            })
          }
          className="border rounded p-2 w-full"
        >
          <option value="active">Active</option>

          <option value="inactive">Inactive</option>

          <option value="terminated">Terminated</option>
        </select>
      </div>
    </div>
  );
}
/* import { Employee } from "@/types/hr/employee";

type Props = {
  employee: Partial<Employee>;

  setEmployee: React.Dispatch<React.SetStateAction<Partial<Employee>>>;
};

export default function EmployeeGeneralTab({ employee, setEmployee }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>First Name</label>

        <input
          value={employee.first_name || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              first_name: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      <div>
        <label>Last Name</label>

        <input
          value={employee.last_name || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              last_name: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      <div>
        <label>Email</label>

        <input
          value={employee.email || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              email: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      <div>
        <label>Mobile</label>

        <input
          value={employee.mobile || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              mobile: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>

      <div>
        <label>Hire Date</label>

        <input
          type="date"
          value={employee.hire_date || ""}
          onChange={(e) =>
            setEmployee({
              ...employee,
              hire_date: e.target.value,
            })
          }
          className="border rounded p-2 w-full"
        />
      </div>
    </div>
  );
} */

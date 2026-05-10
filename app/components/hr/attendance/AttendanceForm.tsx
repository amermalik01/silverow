// app/components/hr/attendance/AttendanceForm.tsx
"use client";

import { useEffect, useState } from "react";

import { Attendance } from "@/types/hr/attendance";

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function AttendanceForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [data, setData] = useState<Attendance>({
    employee_id: "",
    attendance_date: "",
    attendance_status: "present",
  });

  useEffect(() => {
    const loadEmployees = async () => {
      const res = await fetch("/api/hr/employees");

      const json = await res.json();

      setEmployees(json.data || []);
    };
    loadEmployees();
  }, []);

  const handleSubmit = async () => {
    await fetch("/api/hr/attendance", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    });

    window.location.href = "../attendance";
  };

  return (
    <div className="border rounded p-6 space-y-4">
      <h1 className="text-xl font-semibold">Create Attendance</h1>

      <div className="grid grid-cols-2 gap-4">
        <select
          value={data.employee_id}
          onChange={(e) =>
            setData({
              ...data,
              employee_id: e.target.value,
            })
          }
          className="border p-2 rounded"
        >
          <option value="">Select Employee</option>

          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={data.attendance_date}
          onChange={(e) =>
            setData({
              ...data,
              attendance_date: e.target.value,
            })
          }
          className="border p-2 rounded"
        />

        <input
          type="time"
          value={data.check_in || ""}
          onChange={(e) =>
            setData({
              ...data,
              check_in: e.target.value,
            })
          }
          className="border p-2 rounded"
        />

        <input
          type="time"
          value={data.check_out || ""}
          onChange={(e) =>
            setData({
              ...data,
              check_out: e.target.value,
            })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Break Minutes"
          value={data.break_minutes || ""}
          onChange={(e) =>
            setData({
              ...data,
              break_minutes: Number(e.target.value),
            })
          }
          className="border p-2 rounded"
        />

        <select
          value={data.attendance_status}
          onChange={(e) =>
            setData({
              ...data,
              attendance_status: data.attendance_status,
            })
          }
          className="border p-2 rounded"
        >
          <option value="present">Present</option>

          <option value="absent">Absent</option>

          <option value="leave">Leave</option>

          <option value="half_day">Half Day</option>

          <option value="holiday">Holiday</option>
        </select>
      </div>

      <textarea
        placeholder="Remarks"
        value={data.remarks || ""}
        onChange={(e) =>
          setData({
            ...data,
            remarks: e.target.value,
          })
        }
        className="border p-2 rounded w-full"
      />

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}

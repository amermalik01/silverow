// app/components/hr/attendance/AttendanceForm.tsx
"use client";

import { useEffect, useState } from "react";
import { Attendance } from "@/types/hr/attendance";

import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type AttendanceFormData = {
  employee_id: string;
  attendance_date: string;
  attendance_status: string;
  check_in: string;
  check_out: string;
  break_minutes: number;
  remarks: string;
};

export default function AttendanceForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [data, setData] = useState<AttendanceFormData>({
    employee_id: "", // Default to today's date
    attendance_date: format(startOfDay(new Date()), "yyyy-MM-dd"),
    attendance_status: "present",
    check_in: "",
    check_out: "",
    break_minutes: 0,
    remarks: "",
  });

  // const [data, setData] = useState<Attendance>({
  //   employee_id: "",
  //   attendance_date: "",
  //   attendance_status: "present",
  // });

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch("/api/hr/employees");
        const json = await res.json();
        setEmployees(json.data || []);
      } catch (error) {
        console.error("Failed to load employees:", error);
      }
    };
    loadEmployees();
  }, []);

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to save attendance");
      }
      window.location.href = "../attendance";
    } catch (error) {
      console.error("Failed to save attendance:", error);
    }
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

        {/* <input
          type="date"
          value={data.attendance_date}
          onChange={(e) =>
            setData({
              ...data,
              attendance_date: e.target.value,
            })
          }
          className="border p-2 rounded"
        /> */}

        <DatePicker
          value={
            data.attendance_date ? parseISO(data.attendance_date) : undefined
          }
          maxDate={startOfDay(new Date())}
          containerClassName="col-span-8"
          onChange={(date) =>
            setData({
              ...data,
              attendance_date: date ? format(date, "yyyy-MM-dd") : "",
            })
          }
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
          <option value="present">Present</option>{" "}
          <option value="absent">Absent</option>{" "}
          <option value="leave">Leave</option>{" "}
          <option value="half_day">Half Day</option>{" "}
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
        <Button
          onClick={handleSubmit}
          variant="save"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

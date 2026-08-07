// app/components/hr/leaves/LeaveList.tsx
"use client";

import { useEffect, useState } from "react";

import { LeaveRequest } from "@/types/hr/leave";

type EmployeeOption = {
  id: string;
  name: string;
};

type LeaveTypeOption = {
  id: string;
  name: string;
};

export default function LeaveList() {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/hr/leaves");

      const json = await res.json();

      setData(json.data || []);
    };

    const loadEmployees = async () => {
      const res = await fetch("/api/hr/employees");

      const json = await res.json();

      setEmployees(
        (json.data || []).map(
          (x: { id: string; first_name: string; last_name: string }) => ({
            id: x.id,
            name: `${x.first_name} ${x.last_name}`,
          }),
        ),
      );
    };

    const loadLeaveTypes = async () => {
      const res = await fetch("/api/hr/leave-types");

      const json = await res.json();

      setLeaveTypes(json.data || []);
    };

    loadData();
    loadEmployees();
    loadLeaveTypes();
  }, []);

  const loadData = async () => {
    const res = await fetch("/api/hr/leaves");

    const json = await res.json();

    setData(json.data || []);
  };

  const resetForm = () => {
    setEditingId(null);
    setEmployeeId("");
    setLeaveTypeId("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setStatus("pending");
  };

  const save = async () => {
    const payload = {
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      reason,
      status,
    };

    if (editingId) {
      await fetch(`/api/hr/leaves/${editingId}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/hr/leaves", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });
    }

    resetForm();
    loadData();
  };

  const edit = (row: LeaveRequest) => {
    setEditingId(row.id || null);
    setEmployeeId(row.employee_id);
    setLeaveTypeId(row.leave_type_id);
    setStartDate(row.start_date);
    setEndDate(row.end_date);
    setReason(row.reason || "");
    setStatus(row.status || "pending");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete leave request?")) return;

    await fetch(`/api/hr/leaves/${id}`, {
      method: "DELETE",
    });

    loadData();
  };

  return (
    <div className="space-y-6">
      {/* FORM */}

      <div className="border rounded p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Employee</option>

          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <select
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Leave Type</option>

          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="pending">Pending</option>

          <option value="approved">Approved</option>

          <option value="rejected">Rejected</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        {/* <DatePicker
                            value={startDate}
                            onChange={(date) =>
                              setStartDate( date ? format(date, "yyyy-MM-dd") : "")
                            }
                          /> */}

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          className="border p-2 rounded"
        />

        <button
          onClick={save}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5 rounded px-4 py-2"
        >
          {editingId ? "Update" : "Create"}
        </button>
      </div>

      {/* TABLE */}

      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Leave No</th>

            <th className="p-2 text-left">Employee</th>

            <th className="p-2 text-left">Leave Type</th>

            <th className="p-2 text-left">From</th>

            <th className="p-2 text-left">To</th>

            <th className="p-2 text-left">Days</th>

            <th className="p-2 text-left">Status</th>

            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.leave_no}</td>

              <td className="p-2">{row.employee_name}</td>

              <td className="p-2">{row.leave_type_name}</td>

              <td className="p-2">{row.start_date}</td>

              <td className="p-2">{row.end_date}</td>

              <td className="p-2">{row.total_days}</td>

              <td className="p-2">{row.status}</td>

              <td className="p-2 text-center space-x-2">
                <button onClick={() => edit(row)} className="text-blue-600">
                  Edit
                </button>

                <button
                  onClick={() => remove(row.id!)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

import { LeaveRequest } from "@/types/hr/leave";

export default function LeaveList() {
  const [data, setData] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/hr/leaves");

      const json = await res.json();

      setData(json.data || []);
    };
    loadData();
  }, []);

  return (
    <div className="border rounded p-4">
      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Leave No</th>

            <th className="p-2 text-left">Employee</th>

            <th className="p-2 text-left">From</th>

            <th className="p-2 text-left">To</th>

            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.leave_no}</td>

              <td className="p-2">{row.employee_id}</td>

              <td className="p-2">{row.start_date}</td>

              <td className="p-2">{row.end_date}</td>

              <td className="p-2">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} */

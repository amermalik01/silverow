// app/components/hr/attendance/AttendanceList.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Attendance } from "@/types/hr/attendance";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export default function AttendanceList() {
  const [data, setData] = useState<Attendance[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/hr/attendance");

      const json = await res.json();

      setData(json.data || []);
    };
    loadData();
  }, []);

  return (
    <div className="border rounded p-4 space-y-4">
      <div className="flex justify-end">
        {/* <Link
          href="./attendance/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Attendance
        </Link> */}

        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          <Link href="./attendance/new">
            {/* <Icon icon="solar:add-circle-linear" width={16} height={16} /> */}+
            Create
          </Link>
        </Button>
      </div>

      <table className="w-full border table-fixed text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">No</th>

            <th className="p-2 text-left">Employee</th>

            <th className="p-2 text-left">Date</th>

            <th className="p-2 text-left">Check In</th>

            <th className="p-2 text-left">Check Out</th>

            <th className="p-2 text-left">Hours</th>

            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">
                <Link href={`./attendance/${row.id}`} className="text-blue-600">
                  {row.attendance_no}
                </Link>
              </td>

              <td className="p-2">{row.employee_name}</td>

              <td className="p-2">{row.attendance_date}</td>

              <td className="p-2">{row.check_in}</td>

              <td className="p-2">{row.check_out}</td>

              <td className="p-2">{row.total_hours}</td>

              <td className="p-2 capitalize">{row.attendance_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

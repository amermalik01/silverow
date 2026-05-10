// app/components/hr/attendance/AttendanceRecord.tsx
"use client";

import { useEffect, useState } from "react";

import { Attendance } from "@/types/hr/attendance";

type Props = {
  id: string;
};

export default function AttendanceRecord({ id }: Props) {
  const [data, setData] = useState<Attendance | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch(`/api/hr/attendance/${id}`);

      const json = await res.json();

      setData(json);
    };
    loadData();
  }, []);

  const handleSave = async () => {
    await fetch(`/api/hr/attendance/${id}`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    });

    alert("Updated");
  };

  if (!data) {
    return <p>Loading...</p>;
  }

  return (
    <div className="border rounded p-6 space-y-4">
      <h1 className="text-xl font-semibold">Attendance Record</h1>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Update
        </button>
      </div>
    </div>
  );
}

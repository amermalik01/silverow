// app/[slug]/hr/attendance/page.tsx

import AttendanceList from "@/app/components/hr/attendance/AttendanceList";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Human Resource / Attendance</h1>

      <AttendanceList />
    </div>
  );
}

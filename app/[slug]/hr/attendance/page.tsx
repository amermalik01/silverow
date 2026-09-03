// app/[slug]/hr/attendance/page.tsx

import AttendanceList from "@/app/components/hr/attendance/AttendanceList";

export default function AttendancePage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Human Resource / Attendance</h1>
      </div>

      <AttendanceList />
    </div>
  );
}

// app/[slug]/hr/attendance/new/page.tsx

import AttendanceForm from "@/app/components/hr/attendance/AttendanceForm";

export default function NewAttendancePage() {
  return (
    <div className="space-y-6">
      <AttendanceForm />
    </div>
  );
}

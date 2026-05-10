// app/[slug]/hr/attendance/[id]/page.tsx

import AttendanceRecord from "@/app/components/hr/attendance/AttendanceRecord";

export default async function AttendanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AttendanceRecord id={id} />
    </div>
  );
}

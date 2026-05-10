// app/[slug]/hr/leaves/page.tsx

import LeaveList from "@/app/components/hr/leaves/LeaveList";

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Human Resource / Leaves</h1>

      <LeaveList />
    </div>
  );
}

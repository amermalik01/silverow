// app/[slug]/hr/leaves/page.tsx

import LeaveList from "@/app/components/hr/leaves/LeaveList";

export default function LeavesPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Human Resource / Leaves</h1>
      </div>

      <LeaveList />
    </div>
  );
}

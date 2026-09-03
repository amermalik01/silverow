// app/[slug]/hr/employees/[id]/edit/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit Employee</h1>
      </div>

      <EmployeeRecord id={id} />
    </div>
  );
}

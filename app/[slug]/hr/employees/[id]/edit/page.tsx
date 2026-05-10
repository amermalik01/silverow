// app/[slug]/hr/employees/[id]/edit/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Employee</h1>

      <EmployeeRecord id={id} />
    </div>
  );
}

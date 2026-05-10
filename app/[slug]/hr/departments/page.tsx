// app/[slug]/hr/departments/page.tsx

import DepartmentList from "@/app/components/hr/departments/DepartmentList";

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Human Resources / Departments
      </h1>

      <DepartmentList />
    </div>
  );
}
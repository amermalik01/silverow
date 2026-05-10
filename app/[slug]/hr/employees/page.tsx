// app/[slug]/hr/employees/page.tsx

import EmployeeList from "@/app/components/hr/employees/EmployeeList";

export default function EmployeesPage() {
  return (
    <div className="p-6 space-y-6">
      <EmployeeList />
    </div>
  );
}

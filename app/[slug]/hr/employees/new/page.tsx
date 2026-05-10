// app/[slug]/hr/employees/new/page.tsx
import EmployeeForm from "@/app/components/hr/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="p-6">
      <EmployeeForm />
    </div>
  );
}
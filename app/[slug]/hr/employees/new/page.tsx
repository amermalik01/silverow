// app/[slug]/hr/employees/new/page.tsx

import EmployeeForm from "@/app/components/hr/employees/EmployeeForm";
// import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function NewEmployeePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      <EmployeeForm slug={slug} />
    </div>
  );
}

/* 
import EmployeeForm from "@/app/components/hr/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="p-6">
      <EmployeeForm />
    </div>
  );
} */

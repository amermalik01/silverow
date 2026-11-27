// app/[slug]/hr/employees/[id]/edit/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;

  return <EmployeeRecord id={id} slug={slug} initialMode="edit" />;
}

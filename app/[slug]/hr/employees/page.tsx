// app/[slug]/hr/employees/page.tsx

import EmployeeList from "@/app/components/hr/employees/EmployeeList";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EmployeeList slug={slug} />;
}


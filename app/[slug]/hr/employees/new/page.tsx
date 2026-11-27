// app/[slug]/hr/employees/new/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function NewEmployeePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Same record component as view / edit — an empty id opens create mode */
  return <EmployeeRecord id="" slug={slug} />;
}

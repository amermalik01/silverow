// app/[slug]/hr/employees/[id]/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function EmployeeRecordPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <div>
      <EmployeeRecord id={id} />
    </div>
  );
}

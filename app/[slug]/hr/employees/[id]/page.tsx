// app/[slug]/hr/employees/[id]/page.tsx

import EmployeeRecord from "@/app/components/hr/employees/EmployeeRecord";

export default async function EmployeeRecordPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id,slug } = await params;

  return (
    <div className="space-y-6 ">

      <EmployeeRecord id={id} slug={slug} />
    </div>
  );
}


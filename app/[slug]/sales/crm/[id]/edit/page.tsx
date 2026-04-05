// app/[slug]/sales/crm/[id]/edit/page.tsx

import CRMRecord from "@/app/components/sales/crm/CRMRecord";

export default async function EditCRMPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Edit CRM Account</h1>
      </div>

      <CRMRecord id={id} />
    </div>
  );
}

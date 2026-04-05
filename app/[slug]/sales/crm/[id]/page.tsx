// app/[slug]/sales/crm/[id]/page.tsx

import CRMRecord from "@/app/components/sales/crm/CRMRecord";

type PageProps = {
  params: {
    slug: string;
    id: string;
  };
};

export default function EditCRMPage({ params }: PageProps) {

  return (
    <div className="p-6 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Edit CRM Account
        </h1>
      </div>

      <CRMRecord id={params.id} />

    </div>
  );
}
// app/[slug]/sales/crm/[id]/page.tsx
// app/[slug]/sales/crm/[id]/page.tsx

import CRMForm from "@/app/components/sales/crm/CRMForm";

type PageProps = {
  params: {
    slug: string;
    id: string;
  };
};

export default function EditCRMPage({ params }: PageProps) {

  const { slug, id } = params;

  return (
    <div className="p-6 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Edit CRM Account
        </h1>
      </div>

      {/* <CRMForm
        accountId={id}
      /> */}

    </div>
  );
}
// app/[slug]/sales/crm/new/page.tsx

import CRMForm from "@/app/components/sales/crm/CRMForm";

// type PageProps = {
//   params: {
//     slug: string;
//   };
// };
// { params }: PageProps
export default function NewCRMPage() {
//   const { slug } = params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Create CRM Account</h1>
      </div>

      <CRMForm />
      {/* companySlug={slug} */}
    </div>
  );
}

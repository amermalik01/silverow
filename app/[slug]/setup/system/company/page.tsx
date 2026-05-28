// app/[slug]/setup/system/company/page.tsx

import CompanySetupForm from "@/app/components/setup/general/company/CompanySetupForm";

export default function GeneralCompanySetupPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="pb-2">
        <h1 className="text-2xl font-bold  tracking-tight">
          Core System Master Setup
        </h1>
        <p className="text-xs">
          Administer runtime values, legal localization objects, and business
          properties.
        </p>
      </div>

      <CompanySetupForm />
    </div>
  );
}

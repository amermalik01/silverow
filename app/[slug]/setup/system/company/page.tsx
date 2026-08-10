// app/[slug]/setup/system/company/page.tsx

import CompanySetupForm from "@/app/components/setup/general/company/CompanySetupForm";

export default function GeneralCompanySetupPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold  tracking-tight">Master Setup</h1>
        <p className="text-xs">
          Administer runtime values, legal localization objects, and business
          properties.
        </p>
      </div>

      <CompanySetupForm />
    </div>
  );
}

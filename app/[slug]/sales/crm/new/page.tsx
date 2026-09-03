// app/[slug]/sales/crm/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewCRMPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">New CRM</h1>
      </div>
      <PartyForm
        title="Create CRM Prospect Account"
        initialFlags={{ is_crm_lead: true }}
        redirectPath="../crm"
      />
    </div>
  );
}

/* import CRMForm from "@/app/components/sales/crm/CRMForm";

export default function NewCRMPage() {

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Create CRM Account</h1>
      </div>

      <CRMForm />
    </div>
  );
} */

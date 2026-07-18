// app/[slug]/sales/crm/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewCRMPage() {
  return (
    <div>
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

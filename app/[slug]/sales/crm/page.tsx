// app/[slug]/sales/crm/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default function CRMPage() {
  return (
    <div>
      <PartyList
        title="CRM Prospects & Leads"
        roleFlag="is_crm_lead"
        basePath="./crm"
      />
    </div>
  );
}

// app/[slug]/sales/crm/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default async function CRMPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PartyList
      slug={slug}
      // title="CRM Prospects & Leads"
      title="Prospects"
      moduleKey="crm_leads"
      roleFlag="is_crm_lead"
      basePath="sales/crm"
    />
  );
}


// app/[slug]/purchases/srm/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default async function SRMPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PartyList
      slug={slug}
      title="SRM Vendors"
      moduleKey="srm_vendors"
      roleFlag="is_srm_vendor"
      basePath="purchases/srm"
    />
  );
}

/* export default function SRMPage() {
  return (
    <div>
      <PartyList
        title="SRM Vendors"
        roleFlag="is_srm_vendor"
        basePath="./srm"
      />
    </div>
  );
} */

// app/[slug]/sales/prospects/page.tsx

import ProspectListView from "@/app/components/crm/prospects/ProspectListView";

export default async function ProspectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProspectListView slug={slug} />;
}

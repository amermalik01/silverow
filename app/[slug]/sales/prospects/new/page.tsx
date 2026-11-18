// app/[slug]/sales/prospects/new/page.tsx

import ProspectFormView from "@/app/components/crm/prospects/ProspectFormView";

export default async function NewProspectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProspectFormView slug={slug} />;
}

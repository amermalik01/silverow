// /app/[slug]/sales/prospects/[id]/edit/page.tsx

import ProspectFormView from "@/app/components/crm/prospects/ProspectFormView";

export default async function EditProspectsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;
  return <ProspectFormView slug={slug} prospectId={id} initialMode="view" />;
}

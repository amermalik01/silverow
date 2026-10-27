// app/[slug]/energy/sites/[id]/page.tsx

import SiteRecord from "@/app/components/energy/sites/SiteRecord";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;

  return <SiteRecord id={id} slug={slug} isReadonly={true} />;
}

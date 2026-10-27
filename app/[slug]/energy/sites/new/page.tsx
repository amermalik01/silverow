// app/[slug]/energy/sites/new/page.tsx

import SiteRecord from "@/app/components/energy/sites/SiteRecord";

export default async function NewSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <SiteRecord id="" slug={slug} isReadonly={false} />;
}

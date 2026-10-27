// app/[slug]/energy/sites/page.tsx

import SitesList from "@/app/components/energy/sites/SitesList";

export default async function SitesListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SitesList slug={slug} />;
}

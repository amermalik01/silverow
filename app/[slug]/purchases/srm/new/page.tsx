// app/[slug]/purchases/srm/new/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function NewSRMPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Same record component as view / edit — an empty id opens create mode */
  return <PartyRecord id="" module="srm" slug={slug} />;
}

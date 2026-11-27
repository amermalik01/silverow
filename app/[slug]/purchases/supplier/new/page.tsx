// app/[slug]/purchases/supplier/new/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function NewSupplierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Same record component as view / edit — an empty id opens create mode */
  return <PartyRecord id="" module="supplier" slug={slug} />;
}

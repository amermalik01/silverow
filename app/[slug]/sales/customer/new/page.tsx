// app/[slug]/sales/customer/new/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Same record component as view / edit — an empty id opens create mode */
  return <PartyRecord id="" module="customer" slug={slug} />;
}

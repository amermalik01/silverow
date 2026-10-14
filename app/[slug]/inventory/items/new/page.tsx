// app/[slug]/inventory/items/new/page.tsx

import ItemRecord from "@/app/components/inventory/items/ItemRecord";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ItemRecord id="" slug={slug} />;
}

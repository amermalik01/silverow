// app/[slug]/inventory/items/[id]/page.tsx

import ItemRecord from "@/app/components/inventory/items/ItemRecord";

export default async function ViewItemPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;

  return <ItemRecord id={id} slug={slug} isReadonly={true} />;
}

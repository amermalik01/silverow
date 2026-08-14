// app/[slug]/inventory/items/page.tsx

import ItemList from "@/app/components/inventory/items/ItemList";

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ItemList slug={slug} />;
}

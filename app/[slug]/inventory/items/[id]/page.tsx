// app/[slug]/inventory/items/[id]/page.tsx

import ItemTabs from "@/app/components/inventory/items/ItemTabs";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ItemPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="p-6">
      <ItemTabs id={id} />
    </div>
  );
}

// app/[slug]/inventory/items/[id]/page.tsx

import ItemRecord from "@/app/components/inventory/items/ItemRecord";

type Props = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
};

export default async function ViewItemPage({ params }: Props) {
  const { id, slug } = await params;

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          View Item Details
        </h1>
      </div>

      <ItemRecord id={id} slug={slug} isReadonly={true} />
    </div>
  );
}

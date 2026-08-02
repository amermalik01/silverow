// app/[slug]/inventory/items/[id]/edit/page.tsx

import ItemRecord from "@/app/components/inventory/items/ItemRecord";

type Props = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
};

export default async function EditItemPage({ params }: Props) {
  const { id, slug } = await params;

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Edit Item
        </h1>
      </div>

      <ItemRecord id={id} slug={slug} />
    </div>
  );
}

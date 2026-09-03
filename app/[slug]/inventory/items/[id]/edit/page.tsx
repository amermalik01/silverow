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
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Edit Item
        </h1>
      </div>

      <ItemRecord id={id} slug={slug} />
    </div>
  );
}

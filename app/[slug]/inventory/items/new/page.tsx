// app/[slug]/inventory/items/new/page.tsx

import ItemRecord from "@/app/components/inventory/items/ItemRecord";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          New Item
        </h1>
      </div>

      <ItemRecord id="" slug={slug} />
    </div>
  );
}

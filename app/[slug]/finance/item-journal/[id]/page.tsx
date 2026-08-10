// app/[slug]/finance/item-journal/[id]/page.tsx

import ItemJournalForm from "@/app/components/finance/journals/ItemJournalForm";

export default async function ItemJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit Item Journal</h1>
      </div>

      <ItemJournalForm
        slug={slug}
        journalId={id}
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      />
    </div>
  );
}

/* import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function ItemJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Item Journal
      </h1>

      <JournalForm
        slug={slug}
        journalId={id}
        journalType="item"
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      />
    </div>
  ); 
}*/

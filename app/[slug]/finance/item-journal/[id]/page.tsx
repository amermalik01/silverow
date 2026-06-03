// app/[slug]/finance/item-journal/[id]/page.tsx

import ItemJournalForm from "@/app/components/finance/journals/ItemJournalForm";

export default async function ItemJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Item Journal</h1>
      
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

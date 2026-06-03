// app/[slug]/finance/item-journal/create/page.tsx

import ItemJournalForm from "@/app/components/finance/journals/ItemJournalForm";

export default async function ItemJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Item Journal / Create</h1>
      <ItemJournalForm
        slug={slug}
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      />
    </div>
  );
}

/* import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function ItemJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Item Journal / Create
      </h1>

      <JournalForm
        slug={slug}
        journalType="item"
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      />
    </div>
  );
} */

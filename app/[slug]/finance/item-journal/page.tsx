// app/[slug]/finance/item-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function ItemJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Item Journal
      </h1>

      <JournalList
        slug={slug}
        title="Item Journals"
        journalType="item"
        apiBase="/api/finance/item-journal"
        createPath={`/${slug}/finance/item-journal/create`}
      />
    </div>
  );
}
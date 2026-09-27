// app/[slug]/finance/item-journal/page.tsx

import ItemJournalList from "@/app/components/finance/journals/ItemJournalList";

export default async function ItemJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <ItemJournalList
      slug={slug}
      title="Item Journals"
      moduleKey="item_journals"
      sourceType="ITEM"
      createPath={`/${slug}/finance/item-journal/create`}
    />
  );
}
/* 
      journalType="item"
      apiBase="/api/finance/item-journal" 
      createPath={`/${slug}/finance/general-journal/create`}*/

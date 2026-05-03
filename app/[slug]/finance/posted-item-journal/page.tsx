// 📄 /app/[slug]/finance/posted-item-journal/page.tsx

import JournalPostedList from "@/app/components/finance/journals/JournalPostedList";

export default async function PostedItemJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted Item Journals</h1>

      <JournalPostedList
        slug={slug}
        title="Posted Item Journals"
        journalType="item"
        apiBase="/api/journals"
        viewPath={`/${slug}/finance/posted-item-journal`}
      />
    </div>
  );
}

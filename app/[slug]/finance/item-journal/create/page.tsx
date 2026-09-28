// app/[slug]/finance/item-journal/create/page.tsx

import ItemJournalForm from "@/app/components/finance/journals/ItemJournalForm";

export default async function ItemJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      <ItemJournalForm
        slug={slug}
        // journalType="general"
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      />
    </div>
  );
}

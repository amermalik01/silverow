// 📄 /app/[slug]/finance/posted-supplier-journal/page.tsx

import JournalPostedList from "@/app/components/finance/journals/JournalPostedList";

export default async function PostedSupplierJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted Supplier Journals</h1>

      <JournalPostedList
        slug={slug}
        title="Posted Supplier Journals"
        journalType="supplier"
        apiBase="/api/journals"
        viewPath={`/${slug}/finance/posted-supplier-journal`}
      />
    </div>
  );
}

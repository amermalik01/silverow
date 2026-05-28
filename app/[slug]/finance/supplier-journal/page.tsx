// app/[slug]/finance/supplier-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function SupplierJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / Supplier Journal</h1>

      <JournalList
        slug={slug}
        title="Supplier Journals"
        journalType="supplier"
        apiBase="/api/finance/supplier-journal"
        createPath={`/${slug}/finance/supplier-journal/create`}
      />
    </div>
  );
}

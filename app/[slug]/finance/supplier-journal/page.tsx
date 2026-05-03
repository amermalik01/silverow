// app/[slug]/finance/supplier-journal/page.tsx
import SupplierJournalList from "@/app/components/finance/journals/JournalList";

export default async function SupplierJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Supplier Journal
      </h1>

      <SupplierJournalList
        slug={slug}
        title="Supplier Journals"
        journalType="supplier"
        createPath={`/${slug}/finance/supplier-journal/create`}
        apiBase="/api/finance/supplier-journal"
      />
    </div>
  );
}
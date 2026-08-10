// app/[slug]/finance/supplier-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function SupplierJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Finance / Supplier Journal</h1>
      </div>

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

// app/[slug]/finance/supplier-journal/create/page.tsx
import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function SupplierJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Supplier Journal / Create</h1>
      </div>

      <JournalForm
        slug={slug}
        journalType="supplier"
        apiBase="/api/finance/supplier-journal"
        redirectPath={`/${slug}/finance/supplier-journal`}
      />
    </div>
  );
}

// app/[slug]/finance/supplier-journal/[id]/page.tsx
import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function SupplierJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Supplier Journal
      </h1>

      <JournalForm
        slug={slug}
        journalId={id}
        journalType="supplier"
        apiBase="/api/finance/supplier-journal"
        redirectPath={`/${slug}/finance/supplier-journal`}
      />
    </div>
  );
}
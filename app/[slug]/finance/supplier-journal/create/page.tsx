// app/[slug]/finance/supplier-journal/create/page.tsx
import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function SupplierJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Supplier Journal / Create
      </h1>

      <JournalForm
        slug={slug}
        journalType="supplier"
        apiBase="/api/finance/supplier-journal"
        redirectPath={`/${slug}/finance/supplier-journal`}
      />
    </div>
  );
}
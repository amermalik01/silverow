// /app/[slug]/finance/customer-journal/create/page.tsx

import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function CustomerJournalCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Customer Journal / Create
      </h1>

      <JournalForm
        slug={slug}
        journalType="customer"
        apiBase="/api/finance/customer-journal"
        redirectPath={`/${slug}/finance/customer-journal`}
      />
    </div>
  );
}

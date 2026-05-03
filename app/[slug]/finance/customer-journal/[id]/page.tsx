// /app/[slug]/finance/customer-journal/[id]/page.tsx

import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function CustomerJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Customer Journal
      </h1>

      <JournalForm
        slug={slug}
        journalId={id}
        journalType="customer"
        apiBase="/api/finance/customer-journal"
        redirectPath={`/${slug}/finance/customer-journal`}
      />
    </div>
  );
}

/* import CustomerJournalForm from "@/app/components/finance/CustomerJournalForm";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Customer Journal</h1>

      <CustomerJournalForm slug={slug} journalId={id} />
    </div>
  );
} */

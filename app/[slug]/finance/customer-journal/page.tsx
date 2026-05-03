// app/[slug]/finance/customer-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function CustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Customer Journal
      </h1>

      <JournalList
        slug={slug}
        title="Customer Journals"
        journalType="customer"
        apiBase="/api/finance/customer-journal"
        createPath={`/${slug}/finance/customer-journal/create`}
      />
    </div>
  );
}

/* import CustomerJournalList from "@/app/components/finance/CustomerJournalList";

export default async function CustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / Customer Journal</h1>

      <CustomerJournalList slug={slug} />
    </div>
  );
}
 */
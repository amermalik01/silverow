// app/[slug]/finance/customer-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function CustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <JournalList
      slug={slug}
      title="Customer Journals"
      moduleKey="customer_journals"
      sourceType="CUSTOMER_JOURNAL"
      createPath={`/${slug}/finance/customer-journal/create`}
    />
  );
}

/* export default async function CustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Finance / Customer Journal</h1>
      </div>

      <JournalList
        slug={slug}
        title="Customer Journals"
        journalType="customer"
        apiBase="/api/finance/customer-journal"
        createPath={`/${slug}/finance/customer-journal/create`}
      />
    </div>
  );
} */

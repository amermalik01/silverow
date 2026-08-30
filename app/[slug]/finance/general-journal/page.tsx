// app/[slug]/finance/general-journal/page.tsx

import JournalList from "@/app/components/finance/journals/JournalList";

export default async function GeneralJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <JournalList
      slug={slug}
      title="General Journals"
      moduleKey="general_journals"
      sourceType="GENERAL"
      createPath={`/${slug}/finance/general-journal/create`}
    />
  );
}

/* export default async function GeneralJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Finance / General Journal</h1>
      </div>

      <JournalList
        slug={slug}
        title="General Journals"
        journalType="general"
        apiBase="/api/finance/general-journal"
        createPath={`/${slug}/finance/general-journal/create`}
      />
    </div>
  );
} */

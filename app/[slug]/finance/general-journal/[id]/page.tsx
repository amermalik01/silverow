// app/[slug]/finance/general-journal/[id]/page.tsx

import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function GeneralJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit General Journal</h1>
      </div>

      <JournalForm
        slug={slug}
        journalId={id}
        journalType="general"
        apiBase="/api/finance/general-journal"
        redirectPath={`/${slug}/finance/general-journal`}
      />
    </div>
  );
}

// app/[slug]/finance/general-journal/[id]/page.tsx

import JournalForm from "@/app/components/finance/journals/JournalForm";

export default async function GeneralJournalEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Edit General Journal
      </h1>

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

/* import JournalEntryForm from "@/app/components/finance/JournalEntryForm";

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Journal Entry</h1>

      <JournalEntryForm slug={slug} journalId={id} />
    </div>
  );
}
 */
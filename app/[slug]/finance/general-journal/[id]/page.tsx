// app/[slug]/finance/general-journal/[id]/page.tsx

import JournalEntryForm from "@/app/components/finance/JournalEntryForm";

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

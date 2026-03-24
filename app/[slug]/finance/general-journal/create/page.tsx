// app/[slug]/finance/general-journal/create/page.tsx

import JournalEntryForm from "@/app/components/finance/JournalEntryForm";

export default async function CreateJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / General Journal / Create</h1>

      <JournalEntryForm slug={slug} />
    </div>
  );
}

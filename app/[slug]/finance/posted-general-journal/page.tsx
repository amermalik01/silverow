// 📄 /app/[slug]/finance/posted-general-journal/page.tsx

import JournalPostedList from "@/app/components/finance/journals/JournalPostedList";

export default async function PostedGeneralJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted General Journals</h1>

      <JournalPostedList
        slug={slug}
        title="Posted General Journals"
        journalType="general"
        apiBase="/api/journals"
        viewPath={`/${slug}/finance/posted-general-journal`}
      />
    </div>
  );
}

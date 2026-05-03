// 📄 /app/[slug]/finance/posted-general-journal/[id]/page.tsx

import JournalPostedView from "@/app/components/finance/journals/JournalPostedView";

export default async function GeneralJournalViewPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted General Journal</h1>

      <JournalPostedView id={id} apiBase="/api/journals" />
    </div>
  );
}

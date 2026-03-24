// app/[slug]/finance/general-journal/page.tsx

import GeneralJournalList from "@/app/components/finance/GeneralJournalList";

export default async function GeneralJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / General Journal
      </h1>

      <GeneralJournalList slug={slug} />
    </div>
  );
}

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

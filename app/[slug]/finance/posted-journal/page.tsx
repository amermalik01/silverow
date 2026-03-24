// app/[slug]/finance/posted-journal/page.tsx

import PostedJournalList from "@/app/components/finance/PostedJournalList";

export default async function PostedJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Posted Journals
      </h1>

      <PostedJournalList slug={slug} />
    </div>
  );
}

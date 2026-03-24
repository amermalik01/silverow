// app/[slug]/finance/posted-journal/[id]/page.tsx

import PostedJournalView from "@/app/components/finance/PostedJournalView";

export default async function PostedJournalPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / Posted Journal / View</h1>

      <PostedJournalView id={id} />
    </div>
  );
}

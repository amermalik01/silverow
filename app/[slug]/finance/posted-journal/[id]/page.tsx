// app/[slug]/finance/posted-journal/[id]/page.tsx

import PostedJournalView from "@/app/components/finance/PostedJournalView";

export default async function PostedJournalPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Finance / Posted Journal / View</h1>
      </div>

      <PostedJournalView id={id} />
    </div>
  );
}

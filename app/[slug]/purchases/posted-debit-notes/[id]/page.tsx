// app/[slug]/purchases/posted-debit-notes/[id]/page.tsx

import { PostedDebitNoteForm } from "@/app/components/purchases/posted-debit-notes/PostedDebitNoteForm";

export default async function ViewDebitNotePage({
  params,
}: {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">View Posted Debit Note</h1>
      </div>

      <PostedDebitNoteForm slug={slug} id={id} isReadOnly />
    </div>
  );
}

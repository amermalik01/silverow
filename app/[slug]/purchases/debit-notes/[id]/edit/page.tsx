// app/[slug]/purchases/debit-notes/[id]/edit/page.tsx

import { DebitNoteForm } from "@/app/components/purchases/debit-notes/DebitNoteForm";

export default async function EditDebitNotePage({
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
        <h1 className="text-2xl font-bold">Edit Debit Note</h1>
      </div>

      <DebitNoteForm slug={slug} id={id} />
    </div>
  );
}

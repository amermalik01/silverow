// app/[slug]/purchases/debit-notes/create/page.tsx

import { DebitNoteForm } from "@/app/components/purchases/debit-notes/DebitNoteForm";

export default async function CreateDebitNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Create Debit Note</h1>
      </div> */}

      <DebitNoteForm slug={slug} />
    </div>
  );
}

// app/[slug]/purchases/debit-notes/create/page.tsx 

import { DebitNoteForm } from "@/app/components/purchases/debit-notes/DebitNoteForm";

export default async function CreateDebitNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 px-4">
      <h1 className="text-2xl font-bold">Create Debit Note</h1>
      <DebitNoteForm slug={slug} />
    </div>
  );
}
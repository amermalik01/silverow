// app/[slug]/purchases/debit-notes/[id]/page.tsx

import { DebitNoteForm } from "@/app/components/purchases/debit-notes/DebitNoteForm";

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
    <div className="space-y-6 px-4">
      <h1 className="text-2xl font-bold">View Debit Note</h1>
      <DebitNoteForm slug={slug} id={id} isReadOnly />
    </div>
  );
}
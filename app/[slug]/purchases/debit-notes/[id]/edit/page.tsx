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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Debit Note</h1>
      <DebitNoteForm slug={slug} id={id} />
    </div>
  );
}
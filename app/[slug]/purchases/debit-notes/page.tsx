// app/[slug]/purchases/debit-notes/page.tsx

import DebitNoteList from "@/app/components/purchases/debit-notes/DebitNoteList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function DebitNotesPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <DebitNoteList slug={slug} />
    </div>
  );
}
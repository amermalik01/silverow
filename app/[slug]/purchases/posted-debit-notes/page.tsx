// app/[slug]/purchases/posted-debit-notes/page.tsx

import PostedDebitNoteList from "@/app/components/purchases/posted-debit-notes/PostedDebitNoteList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PostedDebitNotesPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <PostedDebitNoteList slug={slug} />
    </div>
  );
}

// /app/[slug]/sales/posted-credit-notes/[id]/page.tsx

import PostedSalesReturnForm from "@/app/components/sales/returns/PostedSalesReturnForm";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function PostedCreditNotesDetailPage({ params }: Props) {
  const { slug, id } = await params;
  return <PostedSalesReturnForm slug={slug} id={id} isReadOnly />;
}

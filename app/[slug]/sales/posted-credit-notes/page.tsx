// /app/[slug]/sales/posted-credit-notes/page.tsx

import PostedSalesReturnListView from "@/app/components/sales/returns/PostedSalesReturnListView";

type PageParams = { params: Promise<{ slug: string }> };

export default async function PostedCreditNotesPage({ params }: PageParams) {
  const { slug } = await params;

  return <PostedSalesReturnListView slug={slug} />;
}

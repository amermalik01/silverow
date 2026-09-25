// /app/[slug]/sales/posted-credit-notes/page.tsx

import PostedSalesReturnList from "@/app/components/sales/returns/PostedSalesReturnList";

type PageParams = { params: Promise<{ slug: string }> };

export default async function PostedCreditNotesPage({ params }: PageParams) {
  const { slug } = await params;
  
  return <PostedSalesReturnList slug={slug} />;
}

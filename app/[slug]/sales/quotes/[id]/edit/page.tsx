// app/[slug]/sales/quotes/[id]/edit/page.tsx

import { SalesQuoteForm } from "@/app/components/sales/quotes/SalesQuoteForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function EditSalesQuotePage({ params }: Props) {
  const { slug, id } = await params;
  return <SalesQuoteForm slug={slug} id={id} isReadOnly />;
}

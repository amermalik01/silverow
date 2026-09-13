// app/[slug]/sales/quotes/create/page.tsx

import { SalesQuoteForm } from "@/app/components/sales/quotes/SalesQuoteForm";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};
export default async function NewSalesQuotePage({ params }: Props) {
  const { slug } = await params;

  return <SalesQuoteForm slug={slug} />;
}

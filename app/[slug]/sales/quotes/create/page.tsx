// app/[slug]/sales/quotes/create/page.tsx

import SalesQuoteForm from "@/app/components/sales/quotes/SalesQuoteForm";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Create Sales Quote
      </h1>

      <SalesQuoteForm slug={slug} />
    </div>
  );
}
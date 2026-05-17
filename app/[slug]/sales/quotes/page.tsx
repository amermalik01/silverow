// app/[slug]/sales/quotes/page.tsx

import SalesQuoteList from "@/app/components/sales/quotes/SalesQuoteList";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Quotes</h1>

        <a
          href={`/${slug}/sales/quotes/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Quote
        </a>
      </div>

      <SalesQuoteList slug={slug} />
    </div>
  );
}

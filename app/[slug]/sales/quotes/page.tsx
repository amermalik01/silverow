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
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5"
        >
          Create
        </a>
      </div>

      <SalesQuoteList slug={slug} />
    </div>
  );
}

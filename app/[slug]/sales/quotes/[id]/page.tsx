// app/[slug]/sales/quotes/[id]/page.tsx

import SalesQuoteForm from "@/app/components/sales/quotes/SalesQuoteForm";

export default async function Page({
  params,
}: {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Sales Quote
      </h1>

      <SalesQuoteForm
        slug={slug}
        id={id}
      />
    </div>
  );
}
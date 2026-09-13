// app/[slug]/sales/quotes/page.tsx

import SalesQuoteList from "@/app/components/sales/quotes/SalesQuoteList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;

  return <SalesQuoteList slug={slug} />;
}

/* return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
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
  ); */

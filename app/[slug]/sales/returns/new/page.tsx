// /app/[slug]/sales/returns/new/page.tsx

import SalesReturnFormView from "@/app/components/sales/returns/SalesReturnFormView";

type PageProps = { params: Promise<{ slug: string }> };

export default async function NewSalesReturnPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">New Credit Note</h1>
      </div>

      <SalesReturnFormView slug={slug} />
    </div>
  );
}

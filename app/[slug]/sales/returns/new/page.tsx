// /app/[slug]/sales/returns/new/page.tsx

import SalesReturnFormView from "@/app/components/sales/returns/SalesReturnFormView";

type PageProps = { params: Promise<{ slug: string }> };

export default async function NewSalesReturnPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <div>
      
      <h1 className="text-2xl font-bold">New Credit Note</h1>
      <SalesReturnFormView slug={slug} />
    </div>
  );
}
